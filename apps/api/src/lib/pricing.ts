/**
 * Pricing engine.
 *
 * One rule decides every price in SayServe:
 *
 *     unitPrice = basePrice + sum(priceDelta of every chosen option)
 *     lineTotal = unitPrice * quantity
 *
 * Nothing else is allowed to set a price. Not the customer, not the frontend,
 * and not the assistant — they may only say WHICH options were chosen. The
 * numbers come from the menu document every time.
 *
 * This is also where "incomplete" is decided. An option group carries `min`
 * and `max`, so a meal that needs exactly one drink is data, not an opinion.
 * A missing required choice comes back as a `missing_choice` problem naming
 * the group, which is what lets the UI (and the assistant) ask a specific
 * question instead of "could you clarify?".
 */

export type MenuOption = {
  name: string;
  priceDelta: number;
  linkedItem?: string;
  default?: boolean;
};

export type OptionGroup = {
  groupId: string;
  name: string;
  min: number;
  max: number;
  options: MenuOption[];
};

export type PricedMenuItem = {
  slug: string;
  name: string;
  basePrice: number;
  available: boolean;
  maxQuantityPerOrder: number;
  optionGroups: string[];
};

/** What a customer (or the assistant) asks for. Note: no prices. */
export type CartLineInput = {
  slug: string;
  quantity: number;
  /** groupId -> chosen option names */
  choices?: Record<string, string[]>;
  notes?: string;
};

export type PricedChoice = {
  groupId: string;
  groupName: string;
  optionName: string;
  priceDelta: number;
};

export type PricedLine = {
  slug: string;
  name: string;
  quantity: number;
  basePrice: number;
  choices: PricedChoice[];
  unitPrice: number;
  lineTotal: number;
};

export type PricingProblem =
  | { kind: "not_found"; slug: string; detail: string }
  | { kind: "unavailable"; slug: string; detail: string }
  | { kind: "bad_quantity"; slug: string; detail: string }
  | { kind: "over_limit"; slug: string; detail: string }
  | { kind: "unknown_group"; slug: string; groupId: string; detail: string }
  | { kind: "unknown_option"; slug: string; groupId: string; optionName: string; detail: string }
  | {
      kind: "missing_choice";
      slug: string;
      groupId: string;
      groupName: string;
      min: number;
      max: number;
      options: { name: string; priceDelta: number }[];
      detail: string;
    }
  | { kind: "too_many_choices"; slug: string; groupId: string; max: number; detail: string };

export type PricedCart = {
  lines: PricedLine[];
  problems: PricingProblem[];
  subtotal: number;
  /** True when every line priced cleanly and the cart can go to checkout. */
  complete: boolean;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type MenuLookup = {
  items: Map<string, PricedMenuItem>;
  groups: Map<string, OptionGroup>;
};

/** Build the lookup once per request from whatever the database returned. */
export function buildMenuLookup(
  items: PricedMenuItem[],
  groups: OptionGroup[]
): MenuLookup {
  return {
    items: new Map(items.map((i) => [i.slug, i])),
    groups: new Map(groups.map((g) => [g.groupId, g])),
  };
}

function priceLine(
  input: CartLineInput,
  menu: MenuLookup,
  problems: PricingProblem[]
): PricedLine | null {
  const item = menu.items.get(input.slug);
  if (!item) {
    problems.push({
      kind: "not_found",
      slug: input.slug,
      detail: `There is no menu item called "${input.slug}".`,
    });
    return null;
  }
  if (!item.available) {
    problems.push({
      kind: "unavailable",
      slug: item.slug,
      detail: `${item.name} is not available right now.`,
    });
    return null;
  }

  const qty = Number(input.quantity);
  if (!Number.isInteger(qty) || qty < 1) {
    problems.push({
      kind: "bad_quantity",
      slug: item.slug,
      detail: `Quantity for ${item.name} must be a whole number of at least 1.`,
    });
    return null;
  }
  if (qty > item.maxQuantityPerOrder) {
    problems.push({
      kind: "over_limit",
      slug: item.slug,
      detail: `${item.name}: the most you can order at once is ${item.maxQuantityPerOrder}.`,
    });
    return null;
  }

  const chosen = input.choices ?? {};
  const known = new Set(item.optionGroups);
  for (const groupId of Object.keys(chosen)) {
    if (!known.has(groupId)) {
      problems.push({
        kind: "unknown_group",
        slug: item.slug,
        groupId,
        detail: `${item.name} has no option group "${groupId}".`,
      });
    }
  }

  const choices: PricedChoice[] = [];
  let lineFailed = false;

  for (const groupId of item.optionGroups) {
    const group = menu.groups.get(groupId);
    if (!group) {
      problems.push({
        kind: "unknown_group",
        slug: item.slug,
        groupId,
        detail: `Option group "${groupId}" is missing from the menu.`,
      });
      lineFailed = true;
      continue;
    }

    // Trim before comparing: a stray space from a form or an assistant reply
    // should not turn a valid option into an unknown one.
    const picked = (chosen[groupId] ?? []).map((name) => String(name).trim());
    const unique = [...new Set(picked)].filter((name) => name.length > 0);

    if (unique.length > group.max) {
      problems.push({
        kind: "too_many_choices",
        slug: item.slug,
        groupId,
        max: group.max,
        detail: `${group.name}: choose at most ${group.max}.`,
      });
      lineFailed = true;
      continue;
    }

    if (unique.length < group.min) {
      problems.push({
        kind: "missing_choice",
        slug: item.slug,
        groupId,
        groupName: group.name,
        min: group.min,
        max: group.max,
        options: group.options.map((o) => ({ name: o.name, priceDelta: o.priceDelta })),
        detail: `${item.name}: ${group.name.toLowerCase()}.`,
      });
      lineFailed = true;
      continue;
    }

    for (const optionName of unique) {
      const option = group.options.find((o) => o.name === optionName);
      if (!option) {
        problems.push({
          kind: "unknown_option",
          slug: item.slug,
          groupId,
          optionName,
          detail: `"${optionName}" is not an option under ${group.name}.`,
        });
        lineFailed = true;
        continue;
      }
      choices.push({
        groupId,
        groupName: group.name,
        optionName: option.name,
        priceDelta: option.priceDelta,
      });
    }
  }

  if (lineFailed) return null;

  const unitPrice = round2(
    item.basePrice + choices.reduce((sum, c) => sum + c.priceDelta, 0)
  );

  return {
    slug: item.slug,
    name: item.name,
    quantity: qty,
    basePrice: item.basePrice,
    choices,
    unitPrice,
    lineTotal: round2(unitPrice * qty),
  };
}

/** Price a whole cart. Never throws — problems come back in the result. */
export function priceCart(lines: CartLineInput[], menu: MenuLookup): PricedCart {
  const problems: PricingProblem[] = [];
  const priced: PricedLine[] = [];

  for (const line of lines) {
    const result = priceLine(line, menu, problems);
    if (result) priced.push(result);
  }

  const subtotal = round2(priced.reduce((sum, l) => sum + l.lineTotal, 0));

  return {
    lines: priced,
    problems,
    subtotal,
    complete: problems.length === 0 && priced.length > 0,
  };
}

/**
 * The first thing still missing from the cart, if anything.
 * The chat assistant turns this into one specific question with buttons.
 */
export function firstMissingChoice(cart: PricedCart) {
  return cart.problems.find((p) => p.kind === "missing_choice") ?? null;
}

/** Defaults for a group, used when someone adds an item without choosing. */
export function defaultChoices(
  item: PricedMenuItem,
  menu: MenuLookup
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const groupId of item.optionGroups) {
    const group = menu.groups.get(groupId);
    if (!group || group.min < 1) continue;
    const defaults = group.options.filter((o) => o.default).map((o) => o.name);
    if (defaults.length >= group.min) out[groupId] = defaults.slice(0, group.max);
  }
  return out;
}

export function deliveryTotal(subtotal: number, deliveryFee: number) {
  return round2(subtotal + deliveryFee);
}
