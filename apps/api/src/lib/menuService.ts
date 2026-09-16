import { buildMenuLookup, type MenuLookup, type OptionGroup, type PricedMenuItem } from "./pricing.js";
import { MenuItem } from "../models/MenuItem.js";
import { OptionGroup as OptionGroupModel } from "../models/OptionGroup.js";

/** Load the whole menu into the shape the pricing engine expects. */
export async function loadMenuLookup(): Promise<MenuLookup> {
  const [items, groups] = await Promise.all([
    MenuItem.find().lean(),
    OptionGroupModel.find().lean(),
  ]);

  const pricedItems: PricedMenuItem[] = items.map((i) => ({
    slug: i.slug,
    name: i.name,
    basePrice: i.basePrice,
    available: i.available && withinServingWindow(i.availableFrom, i.availableTo),
    maxQuantityPerOrder: i.maxQuantityPerOrder,
    optionGroups: i.optionGroups,
  }));

  const pricedGroups: OptionGroup[] = groups.map((g) => ({
    groupId: g.groupId, name: g.name, min: g.min, max: g.max,
    options: g.options.map((o) => ({
      name: o.name, priceDelta: o.priceDelta,
      linkedItem: o.linkedItem ?? undefined,
      default: o.default,
    })),
  }));

  return buildMenuLookup(pricedItems, pricedGroups);
}

/**
 * Breakfast stops at 11. An item outside its window is unavailable rather than
 * hidden, so the customer is told why instead of wondering where it went.
 */
export function withinServingWindow(
  from?: string | null, to?: string | null, now = new Date()
): boolean {
  if (!from || !to) return true;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const parse = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
  };
  const start = parse(from);
  const end = parse(to);
  return start <= end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end; // window crossing midnight
}
