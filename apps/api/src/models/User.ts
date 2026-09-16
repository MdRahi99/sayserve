import mongoose from "mongoose";

export const ROLES = ["customer", "staff", "admin"] as const;
export type Role = (typeof ROLES)[number];

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ROLES, default: "customer", index: true },
    phone: { type: String, default: "" },
    savedAddress: {
      line1: String, line2: String, postcode: String, notes: String,
    },
    isDemo: { type: Boolean, default: false },
    // TTL index: demo sandboxes clear themselves out.
    expiresAt: { type: Date, default: null, index: { expires: 0 } },
  },
  { timestamps: true }
);

export type UserDoc = mongoose.InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };
export const User = mongoose.model("User", UserSchema);
