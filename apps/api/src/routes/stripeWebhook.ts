import { Router, raw } from "express";
import { emitOrderNew } from "../lib/events.js";
import { verifyWebhook } from "../lib/payments.js";
import { canTransition, type OrderStatus } from "../lib/orderState.js";
import { Order } from "../models/Order.js";

const router = Router();

/**
 * Where a payment becomes an order the kitchen can see.
 *
 * Two things make this safe. The signature is verified, so only Stripe can
 * reach it — without that, anyone who knows the URL could mark orders paid.
 * And it moves the order through the same state machine as everything else,
 * as the "system" actor, so a webhook cannot push an order somewhere a human
 * could not.
 *
 * Mounted with a raw body parser, because signature verification hashes the
 * exact bytes Stripe sent. Parsing the JSON first breaks it.
 */
router.post("/", raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") return res.status(400).send("Missing signature.");

  let event;
  try {
    event = verifyWebhook(req.body as Buffer, signature);
  } catch (err) {
    console.error("Stripe signature check failed:", err);
    return res.status(400).send("Bad signature.");
  }

  // Answer Stripe first. A slow handler means retries, and retries mean
  // duplicates to guard against.
  res.json({ received: true });

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await markPaid(String(session.metadata?.orderId ?? ""), session.id);
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      await expire(String(session.metadata?.orderId ?? ""));
    }
  } catch (err) {
    console.error(`Handling ${event.type} failed:`, err);
  }
});

async function markPaid(orderId: string, sessionId: string) {
  if (!orderId) return;
  const order = await Order.findById(orderId);
  if (!order) return;

  // Stripe retries. Paying twice must not place the order twice.
  const payment = order.payment;
  if (!payment || payment.status === "paid") return;

  const check = canTransition({
    from: order.status as OrderStatus,
    to: "placed",
    actor: "system",
    fulfilment: order.fulfilment as "collection" | "delivery",
  });
  if (!check.ok) {
    console.warn(`Order ${order.orderNumber} was paid but is ${order.status}: ${check.reason}`);
    return;
  }

  order.status = "placed";
  order.expiresAt = null;
  payment.status = "paid";
  payment.paidAt = new Date();
  payment.sessionId = sessionId;
  order.statusHistory.push({
    from: "pending_payment", to: "placed", actor: "system",
    by: null, label: check.transition.label, reason: "", at: new Date(),
  });
  await order.save();

  emitOrderNew({
    id: String(order._id),
    orderNumber: order.orderNumber,
    status: order.status,
    fulfilment: order.fulfilment,
    customer: order.customer,
    lines: order.lines,
    total: order.total,
    payment: { method: payment.method, status: payment.status },
    notes: order.notes,
    createdAt: order.createdAt,
  });

  console.log(`Order ${order.orderNumber} paid; on the board.`);
}

async function expire(orderId: string) {
  if (!orderId) return;
  const order = await Order.findById(orderId);
  if (!order || order.status !== "pending_payment") return;

  order.status = "expired";
  order.statusHistory.push({
    from: "pending_payment", to: "expired", actor: "system",
    by: null, label: "Expired without payment", reason: "", at: new Date(),
  });
  await order.save();
}

export default router;
