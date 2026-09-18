/**
 * The rush simulator.
 *
 * A kitchen board with nothing on it tells a visitor nothing. This makes a
 * handful of plausible orders so the columns, the timers and the live updates
 * are all visible within a second of someone opening the demo.
 *
 * Every order it makes is flagged `isDemo` and expires, so the dashboard can
 * separate real numbers from theatre and nothing has to be cleaned up by hand.
 */
import { loadMenuLookup } from "./menuService.js";
import { priceCart, type CartLineInput } from "./pricing.js";
import { emitOrderNew } from "./events.js";
import { nextOrderNumber, Order } from "../models/Order.js";

const NAMES = ["Aisha", "Tom", "Priya", "Marcus", "Sofia", "Daniel", "Leyla",
               "Ben", "Nadia", "Joe", "Hannah", "Omar"];
const NOTES = ["Extra crispy please", "", "", "Leave at the door", "",
               "Ring when you arrive", "", "No cutlery thanks"];

const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)]!;
const between = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

export async function simulateRush(count = 5) {
  const menu = await loadMenuLookup();

  // Only items that can be ordered without a decision, so a simulated order is
  // never stuck waiting for a choice nobody is there to make.
  const simple = [...menu.items.values()].filter((item) => {
    if (!item.available) return false;
    return item.optionGroups.every((id) => {
      const group = menu.groups.get(id);
      return !group || group.min === 0 || group.options.some((o) => o.default);
    });
  });

  if (simple.length === 0) return [];

  const made = [];

  for (let i = 0; i < count; i++) {
    const lines: CartLineInput[] = [];
    for (let n = 0; n < between(1, 3); n++) {
      const item = pick(simple);
      const choices: Record<string, string[]> = {};
      for (const id of item.optionGroups) {
        const group = menu.groups.get(id);
        if (!group) continue;
        if (group.min > 0) {
          const chosen = group.options.find((o) => o.default) ?? group.options[0];
          if (chosen) choices[id] = [chosen.name];
        } else if (Math.random() < 0.35) {
          // A few modifiers, so the board shows the red "no onions" line.
          const chosen = pick(group.options);
          if (chosen) choices[id] = [chosen.name];
        }
      }
      lines.push({ slug: item.slug, quantity: between(1, 3), choices });
    }

    const cart = priceCart(lines, menu);
    if (!cart.complete) continue;

    const delivery = Math.random() < 0.3;
    const fee = delivery ? 2.5 : 0;
    const name = pick(NAMES);

    // Staggered start times, so the age timers are not all identical.
    const createdAt = new Date(Date.now() - between(0, 7) * 60 * 1000);

    const order = await Order.create({
      orderNumber: await nextOrderNumber(),
      customer: { name, phone: `07700 900${between(100, 999)}` },
      lines: cart.lines,
      subtotal: cart.subtotal,
      deliveryFee: fee,
      total: Math.round((cart.subtotal + fee) * 100) / 100,
      fulfilment: delivery ? "delivery" : "collection",
      ...(delivery ? { address: { line1: `${between(1, 90)} High Street`, postcode: "SS1 1AA" } } : {}),
      notes: pick(NOTES),
      status: "placed",
      statusHistory: [{
        from: "none", to: "placed", actor: "customer", by: null,
        label: "Order placed", at: createdAt,
      }],
      payment: {
        method: delivery ? "card" : "on_collection",
        status: delivery ? "paid" : "unpaid",
      },
      source: Math.random() < 0.4 ? "chat" : "menu",
      idempotencyKey: `demo-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      isDemo: true,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      createdAt,
    });

    made.push(order);
  }

  // Emitted one at a time so the board fills in rather than appearing at once.
  for (const order of made) {
    emitOrderNew({
      id: String(order._id),
      orderNumber: order.orderNumber,
      status: order.status,
      fulfilment: order.fulfilment,
      customer: order.customer,
      address: order.address,
      lines: order.lines,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
      payment: { method: order.payment?.method, status: order.payment?.status },
      notes: order.notes,
      source: order.source,
      statusHistory: order.statusHistory,
      createdAt: order.createdAt,
    });
  }

  return made;
}

export async function clearDemoOrders() {
  const { deletedCount } = await Order.deleteMany({ isDemo: true });
  return deletedCount ?? 0;
}
