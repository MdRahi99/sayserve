import mongoose from "mongoose";

const OptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priceDelta: { type: Number, required: true, default: 0 },
    linkedItem: { type: String, default: null },
    default: { type: Boolean, default: false },
  },
  { _id: false }
);

const OptionGroupSchema = new mongoose.Schema(
  {
    groupId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    min: { type: Number, required: true, min: 0 },
    max: { type: Number, required: true, min: 0 },
    note: { type: String, default: "" },
    options: { type: [OptionSchema], default: [] },
  },
  { timestamps: true }
);

OptionGroupSchema.pre("validate", function (next) {
  if (this.min > this.max) return next(new Error(`${this.groupId}: min cannot exceed max`));
  if (this.max > this.options.length) {
    return next(new Error(`${this.groupId}: max exceeds the number of options`));
  }
  next();
});

export const OptionGroup = mongoose.model("OptionGroup", OptionGroupSchema);
