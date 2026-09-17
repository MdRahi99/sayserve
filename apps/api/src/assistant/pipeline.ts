/**
 * The assistant pipeline.
 *
 *   message
 *     1. safety      deterministic. the only stage that may refuse
 *     2. parse       "2 cheeseburgers and a large coke" — no model call
 *     3. resolve     exact, fuzzy, then meaning: "chips", "something fizzy"
 *     4. model       only the messy ones. returns a cart diff as JSON
 *     5. apply       priced and validated against the live menu
 *
 * Stage 5 decides what is missing, by looking at the actual cart rather than
 * guessing from wording. That is the part fronter got wrong: it asked a text
 * classifier whether an order was "incomplete", which is a question the data
 * already answers.
 *
 * Every stage before the model is pure and offline, so the site keeps taking
 * orders when the model provider is down — and so the eval harness can run in
 * CI with no keys.
 */
import {
  firstMissingChoice, priceCart, type CartLineInput, type MenuLookup, type PricedCart,
} from "../lib/pricing.js";
import { checkSafety } from "./safety.js";
import { findCandidates, type MenuIndex, type VectorIndex } from "./menuSearch.js";
import { parseOrder } from "./parse.js";

export type Route = "refused" | "fast_path" | "asked" | "model" | "answered" | "unknown";

export type QuickReply = { label: string; value: string };

export type AssistantResult = {
  route: Route;
  reply: string;
  /** The cart as it should now be. The caller stores it; this module does not. */
  lines: CartLineInput[];
  quickReplies: QuickReply[];
  cart: PricedCart | null;
  telemetry: {
    modelCalled: boolean;
    ms: number;
    stage: string;
    safetyRule?: string;
    candidates?: string[];
  };
};

export type ModelClient = {
  name: string;
  /** Returns the cart as it should be after the message, or null if it cannot. */
  proposeCart(input: {
    message: string;
    currentLines: CartLineInput[];
    menuExcerpt: { slug: string; name: string; price: number; options: string[] }[];
    history: { role: "user" | "assistant"; content: string }[];
  }): Promise<{ lines: CartLineInput[]; reply?: string } | null>;
};

export type PipelineDeps = {
  menu: MenuLookup;
  index: MenuIndex;
  vectors?: VectorIndex;
  model?: ModelClient;
};

export async function handleMessage(
  message: string,
  currentLines: CartLineInput[],
  deps: PipelineDeps,
  history: { role: "user" | "assistant"; content: string }[] = []
): Promise<AssistantResult> {
  const started = Date.now();
  const done = (result: Omit<AssistantResult, "telemetry"> & {
    telemetry: Omit<AssistantResult["telemetry"], "ms">;
  }): AssistantResult => ({
    ...result,
    telemetry: { ...result.telemetry, ms: Date.now() - started },
  });

  // 1 — safety
  const safety = checkSafety(message);
  if (!safety.allowed) {
    return done({
      route: "refused",
      reply: safety.reply,
      lines: currentLines,
      quickReplies: [],
      cart: priceCart(currentLines, deps.menu),
      telemetry: { modelCalled: false, stage: "safety", safetyRule: safety.rule },
    });
  }

  // 2 — the fast path
  const parsed = parseOrder(message, deps.index, deps.menu);

  if (parsed.confident && parsed.lines.length > 0) {
    const lines = mergeLines(currentLines, parsed.lines);
    const cart = priceCart(lines, deps.menu);

    if (cart.problems.length === 0) {
      return done({
        route: "fast_path",
        reply: acknowledge(parsed.lines, deps),
        lines,
        quickReplies: [],
        cart,
        telemetry: { modelCalled: false, stage: "parse" },
      });
    }
    // The parser was sure and the menu disagreed — fall through and ask.
    const question = askFor(cart, deps);
    if (question) {
      return done({
        route: "asked",
        reply: question.reply,
        lines,
        quickReplies: question.quickReplies,
        cart,
        telemetry: { modelCalled: false, stage: "validate" },
      });
    }
  }

  // The parser understood the item but a required choice is open: ask, rather
  // than spending a model call on a question the data already framed.
  if (parsed.lines.length > 0 && parsed.leftovers.length === 0) {
    const lines = mergeLines(currentLines, parsed.lines);
    const cart = priceCart(lines, deps.menu);
    const question = askFor(cart, deps);
    if (question) {
      return done({
        route: "asked",
        reply: question.reply,
        lines,
        quickReplies: question.quickReplies,
        cart,
        telemetry: { modelCalled: false, stage: "validate" },
      });
    }
  }

  // 3 — resolve what they might have meant
  const phrase = parsed.leftovers.length ? parsed.leftovers.join(" ") : message;
  const candidates = await findCandidates(phrase, deps.index, deps.vectors);

  // One clear winner and nothing else close: treat it as a match.
  const top = candidates[0];
  const runnerUp = candidates[1];
  const clearWinner = top && (!runnerUp || top.score - runnerUp.score > 0.15);

  if (clearWinner && !deps.model) {
    const lines = mergeLines(currentLines, [{ slug: top.slug, quantity: 1, choices: {} }]);
    const cart = priceCart(lines, deps.menu);
    const question = askFor(cart, deps);
    return done({
      route: question ? "asked" : "fast_path",
      reply: question?.reply ?? `Added ${top.name}. Anything else?`,
      lines,
      quickReplies: question?.quickReplies ?? [],
      cart,
      telemetry: { modelCalled: false, stage: "resolve", candidates: candidates.map((c) => c.slug) },
    });
  }

  // Several close candidates: ask which, rather than picking one.
  if (candidates.length > 1 && !clearWinner) {
    return done({
      route: "asked",
      reply: `Did you mean ${candidates.slice(0, 3).map((c) => c.name).join(", or ")}?`,
      lines: currentLines,
      quickReplies: candidates.slice(0, 3).map((c) => ({ label: c.name, value: c.name })),
      cart: priceCart(currentLines, deps.menu),
      telemetry: { modelCalled: false, stage: "resolve", candidates: candidates.map((c) => c.slug) },
    });
  }

  // 4 — the model, for everything else
  if (deps.model) {
    const excerpt = excerptFor(candidates.map((c) => c.slug), deps);
    const proposal = await deps.model
      .proposeCart({ message, currentLines, menuExcerpt: excerpt, history })
      .catch(() => null);

    if (proposal) {
      const cart = priceCart(proposal.lines, deps.menu);
      const question = askFor(cart, deps);
      return done({
        route: question ? "asked" : "model",
        reply: question?.reply ?? proposal.reply ?? "Done. Anything else?",
        // Never keep a line the menu rejected: that is how an item that does
        // not exist ends up in somebody's cart.
        lines: cart.lines.map(toInput),
        quickReplies: question?.quickReplies ?? [],
        cart,
        telemetry: { modelCalled: true, stage: "model", candidates: candidates.map((c) => c.slug) },
      });
    }
  }

  // 5 — nothing worked. Say so plainly rather than inventing.
  return done({
    route: "unknown",
    reply: "Sorry, I didn't catch that. You can tell me what you'd like, or tap it on the menu.",
    lines: currentLines,
    quickReplies: [],
    cart: priceCart(currentLines, deps.menu),
    telemetry: { modelCalled: Boolean(deps.model), stage: "fallthrough" },
  });
}

/** Turn the first missing choice into one specific question with buttons. */
function askFor(cart: PricedCart, deps: PipelineDeps) {
  const missing = firstMissingChoice(cart);
  if (missing) {
    return {
      reply: `${missing.groupName} for the ${itemName(missing.slug, deps)}?`,
      quickReplies: missing.options.slice(0, 5).map((o) => ({
        label: o.priceDelta ? `${o.name} +£${o.priceDelta.toFixed(2)}` : o.name,
        value: o.name,
      })),
    };
  }

  const problem = cart.problems[0];
  if (problem) return { reply: problem.detail, quickReplies: [] as QuickReply[] };
  return null;
}

function acknowledge(lines: CartLineInput[], deps: PipelineDeps) {
  const described = lines
    .map((l) => `${l.quantity} × ${itemName(l.slug, deps)}`)
    .join(", ");
  return `Added ${described}. Anything else?`;
}

const itemName = (slug: string, deps: PipelineDeps) =>
  deps.menu.items.get(slug)?.name ?? slug;

/**
 * Only the items that might be relevant go to the model.
 *
 * A prompt carrying all 70 items costs more and invents more. A handful of
 * candidates plus the popular ones is enough context to be useful and small
 * enough to stay honest.
 */
function excerptFor(slugs: string[], deps: PipelineDeps) {
  const chosen = new Set(slugs);
  for (const [slug] of deps.menu.items) {
    if (chosen.size >= 12) break;
    chosen.add(slug);
  }
  return [...chosen].flatMap((slug) => {
    const item = deps.menu.items.get(slug);
    if (!item) return [];
    return [{
      slug: item.slug,
      name: item.name,
      price: item.basePrice,
      options: item.optionGroups.flatMap((id) => {
        const group = deps.menu.groups.get(id);
        if (!group) return [];
        return [`${group.groupId} (${group.min}-${group.max}): ${group.options.map((o) => o.name).join(" | ")}`];
      }),
    }];
  });
}

/** Add to the cart, combining anything identical rather than duplicating it. */
function mergeLines(existing: CartLineInput[], added: CartLineInput[]): CartLineInput[] {
  const key = (line: CartLineInput) =>
    `${line.slug}#${Object.entries(line.choices ?? {})
      .map(([g, v]) => `${g}:${[...v].sort().join("|")}`)
      .sort()
      .join(";")}`;

  const out = existing.map((l) => ({ ...l }));
  for (const line of added) {
    const match = out.find((l) => key(l) === key(line));
    if (match) match.quantity += line.quantity;
    else out.push({ ...line });
  }
  return out;
}

const toInput = (line: PricedCart["lines"][number]): CartLineInput => ({
  slug: line.slug,
  quantity: line.quantity,
  choices: line.choices.reduce<Record<string, string[]>>((acc, choice) => {
    (acc[choice.groupId] ??= []).push(choice.optionName);
    return acc;
  }, {}),
});
