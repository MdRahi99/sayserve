/**
 * Stripe, in test mode.
 *
 * Optional, like the assistant's providers. With no key the card option
 * disappears from checkout and the shop takes payment on collection — which is
 * how most takeaways started, and a better failure than a checkout that throws.
 *
 * Money moves in one direction only: this module can create a session and issue
 * a refund. It never sets an order's status. That is the state machine's job,
 * and the webhook asks it politely like everything else.
 */
import Stripe from "stripe";
import { env } from "../config/env.js";

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" })
  : null;

export const paymentsEnabled = Boolean(stripe);

export type CheckoutLine = {
  name: string;
  unitPrice: number;
  quantity: number;
  description?: string;
};

/**
 * Line items are built from the order's own frozen lines, never from the cart
 * the browser sent. What Stripe charges and what the kitchen cooks come from
 * the same row in the database.
 */
export async function createCheckoutSession(args: {
  orderId: string;
  orderNumber: number;
  email?: string;
  lines: CheckoutLine[];
  deliveryFee: number;
  guestToken: string | null;
}) {
  if (!stripe) throw new Error("Stripe is not configured.");

  const items: Stripe.Checkout.SessionCreateParams.LineItem[] = args.lines.map((line) => ({
    quantity: line.quantity,
    price_data: {
      currency: "gbp",
      unit_amount: Math.round(line.unitPrice * 100),
      product_data: {
        name: line.name,
        ...(line.description ? { description: line.description } : {}),
      },
    },
  }));

  if (args.deliveryFee > 0) {
    items.push({
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: Math.round(args.deliveryFee * 100),
        product_data: { name: "Delivery" },
      },
    });
  }

  const back = `${env.PUBLIC_WEB_URL}/orders/${args.orderId}`;

  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: items,
    customer_email: args.email || undefined,
    // The order id travels with the session, so the webhook never has to guess
    // which order was paid for.
    metadata: { orderId: args.orderId, orderNumber: String(args.orderNumber) },
    payment_intent_data: { metadata: { orderId: args.orderId } },
    success_url: `${back}?paid=1`,
    cancel_url: `${back}?cancelled=1`,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
}

export async function refundSession(sessionId: string) {
  if (!stripe) throw new Error("Stripe is not configured.");
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const intent = session.payment_intent;
  if (!intent) throw new Error("That session has no payment to refund.");
  return stripe.refunds.create({
    payment_intent: typeof intent === "string" ? intent : intent.id,
  });
}

export function verifyWebhook(body: Buffer, signature: string) {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error("Stripe webhooks are not configured.");
  }
  // Signature verification is the whole security model here: without it anyone
  // who knows the URL can mark any order paid.
  return stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
}
