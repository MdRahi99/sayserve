import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/errors.js";
import { validateQuery } from "../middleware/validate.js";
import { CATEGORIES, MenuItem } from "../models/MenuItem.js";
import { OptionGroup } from "../models/OptionGroup.js";
import { withinServingWindow } from "../lib/menuService.js";

const router = Router();

const listQuery = z.object({
  category: z.enum(CATEGORIES).optional(),
  available: z.enum(["true", "false"]).optional(),
  search: z.string().max(80).optional(),
});

/**
 * GET /api/menu
 * Returns items AND the option groups they reference, so the client can render
 * the customiser without a second round trip.
 */
router.get("/", validateQuery(listQuery), asyncRoute(async (req, res) => {
  const { category, available, search } = req.query as z.infer<typeof listQuery>;

  const filter: Record<string, unknown> = {};
  if (category) filter.category = category;
  if (available !== undefined) filter.available = available === "true";
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { aliases: rx }, { description: rx }];
  }

  const items = await MenuItem.find(filter).sort({ category: 1, sortOrder: 1, name: 1 }).lean();
  const groupIds = [...new Set(items.flatMap((i) => i.optionGroups))];
  const groups = await OptionGroup.find({ groupId: { $in: groupIds } }).lean();

  res.json({
    count: items.length,
    items: items.map((i) => ({
      ...i,
      servingNow: withinServingWindow(i.availableFrom, i.availableTo),
    })),
    optionGroups: groups,
  });
}));

router.get("/categories", asyncRoute(async (_req, res) => {
  const counts = await MenuItem.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({
    categories: CATEGORIES.map((c) => ({
      slug: c,
      count: counts.find((x) => x._id === c)?.count ?? 0,
    })),
  });
}));

router.get("/:slug", asyncRoute(async (req, res) => {
  const slug = String(req.params.slug ?? "").toLowerCase();
  const item = await MenuItem.findOne({ slug }).lean();
  if (!item) throw new HttpError(404, `There is no menu item called "${slug}".`);
  const groups = await OptionGroup.find({ groupId: { $in: item.optionGroups } }).lean();
  res.json({
    item: { ...item, servingNow: withinServingWindow(item.availableFrom, item.availableTo) },
    optionGroups: groups,
  });
}));

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;
