import mongoose from "mongoose";

export const CATEGORIES = [
  "burgers", "chicken", "wraps", "sides", "drinks",
  "desserts", "meals", "breakfast", "kids",
] as const;

const MenuItemSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true, enum: CATEGORIES, index: true },
    description: { type: String, default: "" },
    basePrice: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, default: "" },
    aliases: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    allergens: { type: [String], default: [] },
    optionGroups: { type: [String], default: [] },
    available: { type: Boolean, default: true, index: true },
    availableFrom: { type: String, default: null },
    availableTo: { type: String, default: null },
    popular: { type: Boolean, default: false },
    maxQuantityPerOrder: { type: Number, default: 10, min: 1 },
    sortOrder: { type: Number, default: 0 },
    // Filled in Phase 4. Kept here so the seed and the search share one document.
    embedding: { type: [Number], default: undefined, select: false },
  },
  { timestamps: true }
);

MenuItemSchema.index({ name: "text", aliases: "text", description: "text" });

export type MenuItemDoc = mongoose.InferSchemaType<typeof MenuItemSchema>;
export const MenuItem = mongoose.model("MenuItem", MenuItemSchema);
