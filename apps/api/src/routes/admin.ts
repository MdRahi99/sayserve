import { Router } from "express";
import { z } from "zod";
import { invalidateAssistantIndex } from "../assistant/registry.js";
import { emitStoreStatus } from "../lib/events.js";
import { asyncRoute, HttpError } from "../middleware/errors.js";
import { attachUser, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { CATEGORIES, MenuItem } from "../models/MenuItem.js";
import { OptionGroup } from "../models/OptionGroup.js";
import { Order } from "../models/Order.js";
import { getSettings, Settings } from "../models/Settings.js";

const router = Router();
router.use(attachUser);

/**
 * Who may change what.
 *
 * Staff can mark something sold out and open or close the shop, because those
 * are things that happen mid-shift and waiting for the owner would be absurd.
 * Prices, new items and deletions are the owner's: a wrong price is a wrong
 * receipt, and there is no undo on money.
 */
const staff = requireRole("staff", "admin");
const admin = requireRole("admin");

// ----------------------------------------------------------------- menu admin

const itemSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Lower case, numbers and hyphens only."),
  name: z.string().min(1).max(80),
  category: z.enum(CATEGORIES),
  description: z.string().max(300).default(""),
  basePrice: z.number().min(0).max(999),
  imageUrl: z.string().url().or(z.literal("")).default(""),
  aliases: z.array(z.string().max(60)).max(30).default([]),
  tags: z.array(z.string().max(30)).max(10).default([]),
  allergens: z.array(z.string().max(30)).max(15).default([]),
  optionGroups: z.array(z.string().max(60)).max(10).default([]),
  available: z.boolean().default(true),
  availableFrom: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  availableTo: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  popular: z.boolean().default(false),
  maxQuantityPerOrder: z.number().int().min(1).max(50).default(10),
});

/** Every referenced option group must exist, or the item is unorderable. */
async function assertGroupsExist(groupIds: string[]) {
  if (groupIds.length === 0) return;
  const found = await OptionGroup.find({ groupId: { $in: groupIds } }).select("groupId").lean();
  const missing = groupIds.filter((g) => !found.some((f) => f.groupId === g));
  if (missing.length) {
    throw new HttpError(422, `These option groups do not exist: ${missing.join(", ")}.`);
  }
}

router.get("/menu", staff, asyncRoute(async (_req, res) => {
  const [items, groups] = await Promise.all([
    MenuItem.find().sort({ category: 1, name: 1 }).lean(),
    OptionGroup.find().sort({ groupId: 1 }).lean(),
  ]);
  res.json({ items, optionGroups: groups });
}));

router.post("/menu", admin, validate(itemSchema), asyncRoute(async (req, res) => {
  const body = req.body as z.infer<typeof itemSchema>;
  if (await MenuItem.exists({ slug: body.slug })) {
    throw new HttpError(409, `There is already an item with the slug "${body.slug}".`);
  }
  await assertGroupsExist(body.optionGroups);
  const item = await MenuItem.create(body);
  invalidateAssistantIndex();
  res.status(201).json({ item });
}));

router.patch("/menu/:slug", admin, validate(itemSchema.partial()), asyncRoute(async (req, res) => {
  const body = req.body as Partial<z.infer<typeof itemSchema>>;
  if (body.optionGroups) await assertGroupsExist(body.optionGroups);

  const item = await MenuItem.findOneAndUpdate(
    { slug: req.params.slug }, body, { new: true }
  );
  if (!item) throw new HttpError(404, "No such menu item.");
  invalidateAssistantIndex();
  res.json({ item });
}));

/**
 * Sold out, as its own endpoint.
 *
 * Staff need this twenty times a shift and must not be able to reach a price
 * field by accident. Past orders are untouched, because an order holds its own
 * copy of what was bought.
 */
router.post("/menu/:slug/availability", staff,
  validate(z.object({ available: z.boolean() })),
  asyncRoute(async (req, res) => {
    const item = await MenuItem.findOneAndUpdate(
      { slug: req.params.slug },
      { available: req.body.available },
      { new: true }
    );
    if (!item) throw new HttpError(404, "No such menu item.");
    res.json({ item });
  }));

router.delete("/menu/:slug", admin, asyncRoute(async (req, res) => {
  const item = await MenuItem.findOneAndDelete({ slug: req.params.slug });
  if (!item) throw new HttpError(404, "No such menu item.");
  invalidateAssistantIndex();

  // An item can be referenced by a meal's "choose a drink" group. Deleting it
  // would leave a choice that prices fine but cannot be made.
  const referencing = await OptionGroup.find({ "options.linkedItem": item.slug }).lean();
  res.json({
    deleted: item.slug,
    warning: referencing.length
      ? `Still referenced by: ${referencing.map((g) => g.groupId).join(", ")}.`
      : undefined,
  });
}));

// ------------------------------------------------------------- option groups

const groupSchema = z.object({
  groupId: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  min: z.number().int().min(0).max(20),
  max: z.number().int().min(0).max(20),
  note: z.string().max(200).default(""),
  options: z.array(z.object({
    name: z.string().min(1).max(60),
    priceDelta: z.number().min(-50).max(50),
    linkedItem: z.string().max(60).nullable().optional(),
    default: z.boolean().optional(),
  })).min(1).max(30),
});

router.put("/option-groups/:groupId", admin, validate(groupSchema.partial()),
  asyncRoute(async (req, res) => {
    const group = await OptionGroup.findOneAndUpdate(
      { groupId: req.params.groupId }, req.body,
      { new: true, runValidators: true }
    );
    if (!group) throw new HttpError(404, "No such option group.");
    res.json({ group });
  }));

// ---------------------------------------------------------------- settings

router.get("/settings", staff, asyncRoute(async (_req, res) => {
  res.json({ settings: await getSettings() });
}));

const settingsSchema = z.object({
  restaurantName: z.string().min(1).max(80).optional(),
  isOpen: z.boolean().optional(),
  prepTimeMinutes: z.number().int().min(1).max(180).optional(),
  deliveryEnabled: z.boolean().optional(),
  deliveryFee: z.number().min(0).max(50).optional(),
  deliveryRadiusMiles: z.number().min(0).max(50).optional(),
  minDeliveryOrder: z.number().min(0).max(200).optional(),
});

router.patch("/settings", admin, validate(settingsSchema), asyncRoute(async (req, res) => {
  const settings = await Settings.findOneAndUpdate({ key: "store" }, req.body, {
    new: true, upsert: true,
  });
  if (req.body.isOpen !== undefined) emitStoreStatus(req.body.isOpen);
  res.json({ settings });
}));

/** Opening and closing is a shift decision, so staff get their own door. */
router.post("/settings/open", staff, validate(z.object({ isOpen: z.boolean() })),
  asyncRoute(async (req, res) => {
    const settings = await Settings.findOneAndUpdate(
      { key: "store" }, { isOpen: req.body.isOpen }, { new: true, upsert: true }
    );
    emitStoreStatus(req.body.isOpen);
    res.json({ settings });
  }));

// --------------------------------------------------------------- dashboard

const COUNTED = ["placed", "accepted", "preparing", "ready", "out_for_delivery", "completed"];

router.get("/stats", staff, asyncRoute(async (req, res) => {
  const days = Math.min(Number(req.query.days) || 1, 90);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const match = { createdAt: { $gte: since }, status: { $in: COUNTED } };

  const [totals, byHour, topItems, prep, byStatus] = await Promise.all([
    Order.aggregate([
      { $match: match },
      { $group: { _id: null, orders: { $sum: 1 }, sales: { $sum: "$total" } } },
    ]),

    Order.aggregate([
      { $match: match },
      { $group: { _id: { $hour: "$createdAt" }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Order.aggregate([
      { $match: match },
      { $unwind: "$lines" },
      {
        $group: {
          _id: "$lines.name",
          quantity: { $sum: "$lines.quantity" },
          revenue: { $sum: "$lines.lineTotal" },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 8 },
    ]),

    /**
     * Prep time measured from the history, not from a stored duration: the
     * gap between "accepted" and whichever step took it off the hob. It is
     * the number that tells the owner whether the promised ready time is a
     * fiction.
     */
    Order.aggregate([
      { $match: { ...match, status: "completed" } },
      {
        $project: {
          accepted: {
            $first: {
              $filter: { input: "$statusHistory", cond: { $eq: ["$$this.to", "accepted"] } },
            },
          },
          done: {
            $first: {
              $filter: {
                input: "$statusHistory",
                cond: { $in: ["$$this.to", ["ready", "out_for_delivery"]] },
              },
            },
          },
        },
      },
      { $match: { accepted: { $ne: null }, done: { $ne: null } } },
      {
        $group: {
          _id: null,
          minutes: { $avg: { $divide: [{ $subtract: ["$done.at", "$accepted.at"] }, 60000] } },
          counted: { $sum: 1 },
        },
      },
    ]),

    Order.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const orders = totals[0]?.orders ?? 0;
  const sales = Math.round((totals[0]?.sales ?? 0) * 100) / 100;

  res.json({
    days,
    since,
    sales,
    orders,
    averageOrder: orders ? Math.round((sales / orders) * 100) / 100 : 0,
    averagePrepMinutes: prep[0]?.minutes ? Math.round(prep[0].minutes) : null,
    prepSampleSize: prep[0]?.counted ?? 0,
    ordersByHour: Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orders: byHour.find((b) => b._id === h)?.orders ?? 0,
    })),
    topItems: topItems.map((t) => ({
      name: t._id,
      quantity: t.quantity,
      revenue: Math.round(t.revenue * 100) / 100,
    })),
    byStatus: Object.fromEntries(byStatus.map((s) => [s._id, s.count])),
  });
}));

export default router;
