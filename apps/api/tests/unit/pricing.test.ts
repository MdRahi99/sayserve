import { describe, expect, it } from "vitest";
import {
  buildMenuLookup, defaultChoices, firstMissingChoice, priceCart,
  type OptionGroup, type PricedMenuItem,
} from "../../src/lib/pricing.js";

const groups: OptionGroup[] = [
  {
    groupId: "fries-size", name: "Size", min: 1, max: 1,
    options: [
      { name: "Small", priceDelta: 0 },
      { name: "Medium", priceDelta: 0.5, default: true },
      { name: "Large", priceDelta: 1.0 },
    ],
  },
  {
    groupId: "burger-remove", name: "Remove anything?", min: 0, max: 3,
    options: [
      { name: "No onions", priceDelta: 0 },
      { name: "No pickles", priceDelta: 0 },
      { name: "No cheese", priceDelta: 0 },
    ],
  },
  {
    groupId: "burger-addons", name: "Add extras", min: 0, max: 2,
    options: [
      { name: "Extra cheese", priceDelta: 0.6 },
      { name: "Fried egg", priceDelta: 0.7 },
    ],
  },
  {
    groupId: "meal-drink", name: "Choose a drink", min: 1, max: 1,
    options: [
      { name: "Cola", priceDelta: 0, linkedItem: "cola" },
      { name: "Milkshake", priceDelta: 1.6, linkedItem: "milkshake" },
    ],
  },
];

const items: PricedMenuItem[] = [
  {
    slug: "cheeseburger", name: "Cheeseburger", basePrice: 4.49, available: true,
    maxQuantityPerOrder: 10, optionGroups: ["burger-remove", "burger-addons"],
  },
  {
    slug: "fries", name: "Fries", basePrice: 1.99, available: true,
    maxQuantityPerOrder: 10, optionGroups: ["fries-size"],
  },
  {
    slug: "cheeseburger-meal", name: "Cheeseburger Meal", basePrice: 7.29,
    available: true, maxQuantityPerOrder: 5, optionGroups: ["meal-drink"],
  },
  {
    slug: "chicken-wings", name: "Chicken Wings", basePrice: 4.99, available: false,
    maxQuantityPerOrder: 10, optionGroups: [],
  },
];

const menu = buildMenuLookup(items, groups);

describe("pricing", () => {
  it("prices a plain item with no options", () => {
    const cart = priceCart([{ slug: "cheeseburger", quantity: 2 }], menu);
    expect(cart.problems).toEqual([]);
    expect(cart.lines[0]!.unitPrice).toBe(4.49);
    expect(cart.lines[0]!.lineTotal).toBe(8.98);
    expect(cart.subtotal).toBe(8.98);
    expect(cart.complete).toBe(true);
  });

  it("adds option deltas to the unit price", () => {
    const cart = priceCart(
      [{ slug: "fries", quantity: 1, choices: { "fries-size": ["Large"] } }],
      menu
    );
    expect(cart.lines[0]!.unitPrice).toBe(2.99);
  });

  it("charges a large fries as a large, not as a small", () => {
    const small = priceCart(
      [{ slug: "fries", quantity: 1, choices: { "fries-size": ["Small"] } }], menu);
    const large = priceCart(
      [{ slug: "fries", quantity: 1, choices: { "fries-size": ["Large"] } }], menu);
    expect(large.subtotal).toBeGreaterThan(small.subtotal);
    expect(large.subtotal - small.subtotal).toBeCloseTo(1.0, 2);
  });

  it("multiplies the whole customised price by quantity", () => {
    const cart = priceCart(
      [{
        slug: "cheeseburger", quantity: 3,
        choices: { "burger-addons": ["Extra cheese", "Fried egg"] },
      }],
      menu
    );
    expect(cart.lines[0]!.unitPrice).toBe(5.79);
    expect(cart.lines[0]!.lineTotal).toBe(17.37);
  });

  it("keeps money free of floating point dust", () => {
    const cart = priceCart(
      [{ slug: "cheeseburger", quantity: 7, choices: { "burger-addons": ["Extra cheese"] } }],
      menu
    );
    expect(cart.lines[0]!.lineTotal).toBe(35.63);
    expect(String(cart.subtotal)).not.toContain("0000");
  });

  it("flags a meal with no drink chosen and names the group", () => {
    const cart = priceCart([{ slug: "cheeseburger-meal", quantity: 1 }], menu);
    expect(cart.complete).toBe(false);
    const missing = firstMissingChoice(cart);
    expect(missing?.kind).toBe("missing_choice");
    expect(missing).toMatchObject({ groupId: "meal-drink", groupName: "Choose a drink" });
    expect(missing && "options" in missing && missing.options.map((o) => o.name))
      .toEqual(["Cola", "Milkshake"]);
  });

  it("prices the meal once the drink is chosen", () => {
    const cart = priceCart(
      [{ slug: "cheeseburger-meal", quantity: 1, choices: { "meal-drink": ["Milkshake"] } }],
      menu
    );
    expect(cart.complete).toBe(true);
    expect(cart.subtotal).toBe(8.89);
  });

  it("rejects more choices than the group allows", () => {
    const cart = priceCart(
      [{ slug: "fries", quantity: 1, choices: { "fries-size": ["Small", "Large"] } }],
      menu
    );
    expect(cart.problems[0]!.kind).toBe("too_many_choices");
    expect(cart.lines).toHaveLength(0);
  });

  it("forgives stray whitespace and repeats in option names", () => {
    const cart = priceCart(
      [{
        slug: "cheeseburger", quantity: 1,
        choices: { "burger-addons": ["  Extra cheese ", "Extra cheese"] },
      }],
      menu
    );
    expect(cart.problems).toEqual([]);
    expect(cart.lines[0]!.choices).toHaveLength(1);
    expect(cart.lines[0]!.unitPrice).toBe(5.09);
  });

  it("rejects an option that does not belong to the group", () => {
    const cart = priceCart(
      [{ slug: "fries", quantity: 1, choices: { "fries-size": ["Enormous"] } }],
      menu
    );
    expect(cart.problems[0]!.kind).toBe("unknown_option");
    expect(cart.lines).toHaveLength(0);
  });

  it("rejects an option group the item does not have", () => {
    const cart = priceCart(
      [{ slug: "cheeseburger", quantity: 1, choices: { "meal-drink": ["Cola"] } }],
      menu
    );
    expect(cart.problems.some((p) => p.kind === "unknown_group")).toBe(true);
  });

  it("refuses an item that is not on the menu", () => {
    const cart = priceCart([{ slug: "ferrari", quantity: 1 }], menu);
    expect(cart.problems[0]!.kind).toBe("not_found");
    expect(cart.subtotal).toBe(0);
  });

  it("refuses a sold-out item", () => {
    const cart = priceCart([{ slug: "chicken-wings", quantity: 1 }], menu);
    expect(cart.problems[0]!.kind).toBe("unavailable");
  });

  it("refuses silly quantities", () => {
    for (const quantity of [0, -3, 2.5]) {
      const cart = priceCart([{ slug: "cheeseburger", quantity }], menu);
      expect(cart.problems[0]!.kind).toBe("bad_quantity");
    }
  });

  it("refuses a quantity above the per-item limit", () => {
    const cart = priceCart([{ slug: "cheeseburger-meal", quantity: 6 }], menu);
    expect(cart.problems[0]!.kind).toBe("over_limit");
  });

  it("keeps good lines when one line is bad", () => {
    const cart = priceCart(
      [{ slug: "cheeseburger", quantity: 1 }, { slug: "ferrari", quantity: 1 }],
      menu
    );
    expect(cart.lines).toHaveLength(1);
    expect(cart.problems).toHaveLength(1);
    expect(cart.complete).toBe(false);
  });

  it("ignores any price the caller tries to send", () => {
    const sneaky = { slug: "cheeseburger", quantity: 1, unitPrice: 0.01, lineTotal: 0.01 };
    const cart = priceCart([sneaky as never], menu);
    expect(cart.lines[0]!.unitPrice).toBe(4.49);
    expect(cart.subtotal).toBe(4.49);
  });

  it("offers defaults only for required groups", () => {
    const fries = items.find((i) => i.slug === "fries")!;
    expect(defaultChoices(fries, menu)).toEqual({ "fries-size": ["Medium"] });

    const meal = items.find((i) => i.slug === "cheeseburger-meal")!;
    expect(defaultChoices(meal, menu)).toEqual({});
  });

  it("treats an empty cart as incomplete", () => {
    const cart = priceCart([], menu);
    expect(cart.complete).toBe(false);
    expect(cart.subtotal).toBe(0);
  });
});
