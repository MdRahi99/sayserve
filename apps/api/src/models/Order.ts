import mongoose from "mongoose";
import { ORDER_STATUSES } from "../lib/orderState.js";

/**
 * An order is a SNAPSHOT, not a set of references.
 *
 * Item names, chosen options and every price are copied in at checkout. When
 * the owner raises a price tomorrow, or renames an item, or deletes it, last
 * week's receipt still says what the customer actually paid. Joining live menu
 * documents would quietly rewrite history.
 */

const ChoiceSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true },
    groupName: { type: String, required: true },
    optionName: { type: String, required: true },
    priceDelta: { type: Number, required: true },
  },
  { _id: false }
);

const OrderLineSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    basePrice: { type: Number, required: true },
    choices: { type: [ChoiceSchema], default: [] },
    unitPrice: { type: Number, required: true },
    lineTotal: { type: Number, required: true },
    notes: { type: String, default: "" },
  },
  { _id: false }
);

const StatusEventSchema = new mongoose.Schema(
  {
    from: { type: String, enum: [...ORDER_STATUSES, "none"], required: true },
    to: { type: String, enum: ORDER_STATUSES, required: true },
    label: { type: String, required: true },
    actor: { type: String, enum: ["customer", "staff", "admin", "system"], required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reason: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: { type: Number, required: true, unique: true, index: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestToken: { type: String, default: null, index: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: "" },
    },

    lines: { type: [OrderLineSchema], required: true },
    subtotal: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },
    total: { type: Number, required: true },

    fulfilment: { type: String, enum: ["collection", "delivery"], required: true },
    address: {
      line1: String, line2: String, postcode: String, notes: String,
    },
    scheduledFor: { type: Date, default: null },
    readyAt: { type: Date, default: null },
    notes: { type: String, default: "" },

    status: { type: String, enum: ORDER_STATUSES, required: true, index: true },
    statusHistory: { type: [StatusEventSchema], default: [] },

    payment: {
      method: { type: String, enum: ["card", "on_collection"], required: true },
      status: {
        type: String,
        enum: ["unpaid", "pending", "paid", "refunded", "failed"],
        default: "unpaid",
      },
      provider: { type: String, default: "stripe" },
      sessionId: { type: String, default: null },
      paidAt: { type: Date, default: null },
      refundedAt: { type: Date, default: null },
    },

    /** How the cart was built. Feeds the assistant metrics in Phase 4. */
    source: { type: String, enum: ["menu", "chat", "voice", "mixed"], default: "menu" },

    /**
     * Client-supplied key. A unique index means a double-tapped Pay button, or a
     * retried request on a flaky connection, can never create a second order.
     */
    idempotencyKey: { type: String, required: true, unique: true, index: true },

    /** Unpaid card orders are swept at this time. */
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ user: 1, createdAt: -1 });

export type OrderDoc = mongoose.InferSchemaType<typeof OrderSchema> & {
  _id: mongoose.Types.ObjectId;
};
export const Order = mongoose.model("Order", OrderSchema);

/**
 * Order numbers that look like order numbers.
 *
 * A counter document is incremented atomically, so two checkouts landing in the
 * same millisecond still get different numbers. Reading max(orderNumber) and
 * adding one would race.
 */
const CounterSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: Number, default: 1000 },
});
const Counter = mongoose.model("Counter", CounterSchema);

export async function nextOrderNumber(): Promise<number> {
  const doc = await Counter.findOneAndUpdate(
    { key: "orderNumber" },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );
  return doc!.value;
}
