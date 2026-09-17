import mongoose from "mongoose";

/**
 * A chat, and what the assistant did with each message.
 *
 * The per-message record is the point: which route each message took, whether
 * the model was called, how long it took. That is what the dashboard reports
 * and what tells you whether the fast path is actually carrying the traffic.
 */
const TurnSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    route: { type: String, default: null },
    modelCalled: { type: Boolean, default: false },
    ms: { type: Number, default: 0 },
    safetyRule: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ConversationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    turns: { type: [TurnSchema], default: [] },
    /** The cart as the assistant last left it: choices only, never prices. */
    lines: { type: mongoose.Schema.Types.Mixed, default: [] },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", default: null },
    // Chats are working state, not records. They clear themselves out.
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 3600 * 1000),
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export const Conversation = mongoose.model("Conversation", ConversationSchema);
