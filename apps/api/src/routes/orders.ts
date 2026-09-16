import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { asyncRoute, HttpError } from "../middleware/errors.js";
import { attachUser, requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { loadMenuLookup } from "../lib/menuService.js";
import {
  canTransition, customerTimeline, isTerminal, nextStatuses,
  type Actor, type OrderStatus,
} from "../lib/orderState.js";
import { deliveryTotal, priceCart, type CartLineInput } from "../lib/pricing.js";
import { nextOrderNumber, Order } from "../models/Order.js";
import { getSettings } from "../models/Settings.js";

const router = Router();

const lineSchema = z.object({
  slug: z.string().min(1).max(60),
  quantity: z.number().int().min(1).max(50),
  choices: z.record(z.array(z.string().max(60)).max(10)).optional(),
  notes: z.string().max(200).optional(),
});

const cartSchema = z.object({
  lines: z.array(lineSchema).min(1).max(40),
  fulfilment: z.enum(["collection", "delivery"]).default("collection"),
});

/**
 * POST /api/orders/quote
 *
 * The client never adds up its own numbers. It sends what the customer chose
 * and gets back the priced cart, or a list of what is still missing. The
 * checkout button is enabled by `complete`, not by the client's own arithmetic.
 */
router.post("/quote", validate(cartSchema), asyncRoute(async (req, res) => {
  const { lines, fulfilment } = req.body as z.infer<typeof cartSchema>;
  const [menu, settings] = await Promise.all([loadMenuLookup(), getSettings()]);
  const cart = priceCart(lines as CartLineInput[], menu);

  const fee = fulfilment === "delivery" ? settings.deliveryFee : 0;
  res.json({
    ...cart,
    deliveryFee: fee,
    total: deliveryTotal(cart.subtotal, fee),
    storeOpen: settings.isOpen,
    prepTimeMinutes: settings.prepTimeMinutes,
  });
}));

const checkoutSchema = cartSchema.extend({
  customer: z.object({
    name: z.string().min(1).max(80),
    phone: z.string().min(6).max(30),
    email: z.string().email().optional().or(z.literal("")),
  }),
  address: z.object({
    line1: z.string().min(1).max(120),
    line2: z.string().max(120).optional(),
    postcode: z.string().min(3).max(12),
    notes: z.string().max(200).optional(),
  }).optional(),
  paymentMethod: z.enum(["card", "on_collection"]),
  scheduledFor: z.coerce.date().optional(),
  notes: z.string().max(300).optional(),
  source: z.enum(["menu", "chat", "voice", "mixed"]).default("menu"),
  /** Supplied by the client so a retry cannot create a second order. */
  idempotencyKey: z.string().min(8).max(100),
});

router.post("/", attachUser, validate(checkoutSchema), asyncRoute(async (req, res) => {
  const body = req.body as z.infer<typeof checkoutSchema>;

  // A retry of a request that already succeeded returns the same order, not a new one.
  const existing = await Order.findOne({ idempotencyKey: body.idempotencyKey }).lean();
  if (existing) return res.status(200).json({ order: shape(existing), idempotentReplay: true });

  const [menu, settings] = await Promise.all([loadMenuLookup(), getSettings()]);

  if (!settings.isOpen) throw new HttpError(409, "The restaurant is closed right now.");

  const cart = priceCart(body.lines as CartLineInput[], menu);
  if (!cart.complete) {
    return res.status(422).json({
      error: "This order is not ready yet.",
      problems: cart.problems,
    });
  }

  if (body.fulfilment === "delivery") {
    if (!settings.deliveryEnabled) throw new HttpError(409, "Delivery is not available right now.");
    if (!body.address) throw new HttpError(400, "Delivery orders need an address.");
    if (cart.subtotal < settings.minDeliveryOrder) {
      throw new HttpError(422, `Delivery orders start at £${settings.minDeliveryOrder.toFixed(2)}.`);
    }
    // Delivery is paid up front, so nobody is out of pocket for a doorstep refusal.
    if (body.paymentMethod !== "card") {
      throw new HttpError(422, "Delivery orders must be paid by card.");
    }
  }

  const fee = body.fulfilment === "delivery" ? settings.deliveryFee : 0;
  const total = deliveryTotal(cart.subtotal, fee);

  // Card orders wait for the payment webhook; cash-on-collection goes straight
  // to the kitchen. Phase 5 replaces this with a real Stripe session.
  const paying = body.paymentMethod === "card";
  const status: OrderStatus = paying ? "pending_payment" : "placed";

  const order = await Order.create({
    orderNumber: await nextOrderNumber(),
    user: req.user?.id ?? null,
    guestToken: req.user ? null : randomUUID(),
    customer: body.customer,
    lines: cart.lines,
    subtotal: cart.subtotal,
    deliveryFee: fee,
    total,
    fulfilment: body.fulfilment,
    address: body.address,
    scheduledFor: body.scheduledFor ?? null,
    notes: body.notes ?? "",
    status,
    statusHistory: [{
      from: "none", to: status, actor: "customer",
      by: req.user?.id ?? null,
      label: paying ? "Waiting for payment" : "Order placed",
    }],
    payment: { method: body.paymentMethod, status: paying ? "pending" : "unpaid" },
    source: body.source,
    idempotencyKey: body.idempotencyKey,
    expiresAt: paying ? new Date(Date.now() + 30 * 60 * 1000) : null,
  });

  res.status(201).json({ order: shape(order.toObject()) });
}));

router.get("/mine", attachUser, requireAuth, asyncRoute(async (req, res) => {
  const orders = await Order.find({ user: req.user!.id })
    .sort({ createdAt: -1 }).limit(30).lean();
  res.json({ orders: orders.map(shape) });
}));

/**
 * GET /api/orders/:id
 * A guest can watch their own order with the token they were given at checkout,
 * without an account. Anyone else needs to own it, or be staff.
 */
router.get("/:id", attachUser, asyncRoute(async (req, res) => {
  const order = await Order.findById(req.params.id).lean().catch(() => null);
  if (!order) throw new HttpError(404, "No such order.");

  const isOwner = req.user && String(order.user) === req.user.id;
  const isGuest = order.guestToken && req.query.token === order.guestToken;
  const isStaff = req.user && ["staff", "admin"].includes(req.user.role);
  if (!isOwner && !isGuest && !isStaff) throw new HttpError(403, "That order is not yours.");

  res.json({
    order: shape(order),
    timeline: customerTimeline(order.fulfilment as "collection" | "delivery"),
    canCancel: nextStatuses(order.status as OrderStatus, "customer", order.fulfilment as never)
      .includes("cancelled"),
  });
}));

router.post("/:id/cancel", attachUser, asyncRoute(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new HttpError(404, "No such order.");

  const isOwner = req.user && String(order.user) === req.user.id;
  const isGuest = order.guestToken && req.body?.token === order.guestToken;
  if (!isOwner && !isGuest) throw new HttpError(403, "That order is not yours.");

  await move(order, "cancelled", "customer", req.user?.id ?? null, "Cancelled by the customer");
  res.json({ order: shape(order.toObject()) });
}));

/** Everything the kitchen board shows: open orders, newest last. */
router.get("/kitchen/board", attachUser, requireRole("staff", "admin"),
  asyncRoute(async (_req, res) => {
    const orders = await Order.find({
      status: { $in: ["placed", "accepted", "preparing", "ready", "out_for_delivery"] },
    }).sort({ createdAt: 1 }).lean();

    res.json({
      columns: {
        new: orders.filter((o) => o.status === "placed").map(shape),
        preparing: orders.filter((o) => ["accepted", "preparing"].includes(o.status)).map(shape),
        ready: orders.filter((o) => ["ready", "out_for_delivery"].includes(o.status)).map(shape),
      },
    });
  }));

const statusSchema = z.object({
  to: z.string().min(1),
  reason: z.string().max(200).optional(),
  readyInMinutes: z.number().int().min(1).max(120).optional(),
});

router.post("/:id/status", attachUser, requireRole("staff", "admin"),
  validate(statusSchema), asyncRoute(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw new HttpError(404, "No such order.");

    const { to, reason, readyInMinutes } = req.body as z.infer<typeof statusSchema>;
    if (readyInMinutes) {
      order.readyAt = new Date(Date.now() + readyInMinutes * 60 * 1000);
    }
    await move(order, to as OrderStatus, req.user!.role as Actor, req.user!.id, reason);
    res.json({ order: shape(order.toObject()) });
  }));

/**
 * The single place a status is written.
 *
 * Nothing else in the codebase assigns `order.status`, so the state machine
 * cannot be bypassed by a new route, and the history is never incomplete.
 */
async function move(
  order: InstanceType<typeof Order>,
  to: OrderStatus,
  actor: Actor,
  by: string | null,
  reason?: string
) {
  const from = order.status as OrderStatus;

  if (isTerminal(from)) {
    throw new HttpError(409, `This order is already ${from.replace(/_/g, " ")}.`, "terminal");
  }

  const check = canTransition({
    from, to, actor,
    fulfilment: order.fulfilment as "collection" | "delivery",
    reason,
  });
  if (!check.ok) throw new HttpError(409, check.reason, check.code);

  order.status = to;
  order.statusHistory.push({
    from, to, actor,
    by: by as never,
    label: check.transition.label,
    reason: reason ?? "",
    at: new Date(),
  });

  if (check.transition.refunds && order.payment?.status === "paid") {
    order.payment.status = "refunded";
    order.payment.refundedAt = new Date();
  }
  if (to === "placed") {
    order.expiresAt = null;
  }

  await order.save();
}

/** One shape for every order the API returns. */
function shape(o: Record<string, any>) {
  return {
    id: String(o._id),
    orderNumber: o.orderNumber,
    status: o.status,
    fulfilment: o.fulfilment,
    customer: o.customer,
    address: o.address,
    lines: o.lines,
    subtotal: o.subtotal,
    deliveryFee: o.deliveryFee,
    total: o.total,
    payment: { method: o.payment?.method, status: o.payment?.status },
    notes: o.notes,
    source: o.source,
    readyAt: o.readyAt,
    scheduledFor: o.scheduledFor,
    guestToken: o.guestToken,
    statusHistory: o.statusHistory,
    createdAt: o.createdAt,
  };
}

export default router;
