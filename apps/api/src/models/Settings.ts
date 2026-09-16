import mongoose from "mongoose";

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "store", unique: true },
    restaurantName: { type: String, default: "SayServe" },
    isOpen: { type: Boolean, default: true },
    openingHours: {
      type: Map, of: String,
      default: () => new Map(Object.entries({
        mon: "11:00-23:00", tue: "11:00-23:00", wed: "11:00-23:00",
        thu: "11:00-23:00", fri: "11:00-23:30", sat: "11:00-23:30",
        sun: "12:00-22:30",
      })),
    },
    prepTimeMinutes: { type: Number, default: 15 },
    deliveryEnabled: { type: Boolean, default: true },
    deliveryFee: { type: Number, default: 2.5 },
    deliveryRadiusMiles: { type: Number, default: 2 },
    minDeliveryOrder: { type: Number, default: 10 },
    currency: { type: String, default: "GBP" },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", SettingsSchema);

export async function getSettings() {
  return (await Settings.findOne({ key: "store" })) ?? (await Settings.create({ key: "store" }));
}
