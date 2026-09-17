/**
 * The fast path.
 *
 * "two cheeseburgers, no onions, and a large coke" is not a language problem.
 * It is a quantity, an item, a modifier and a size, in a sentence shaped the
 * way people have ordered food since counters existed. This module reads that
 * directly, in about a millisecond, for nothing.
 *
 * It only reports success when it is sure: every word accounted for, every item
 * matched exactly, every modifier landing on a real option. Anything else gets
 * handed to the model. Being unsure is cheap; being confidently wrong is not.
 */
import type { CartLineInput, MenuLookup, OptionGroup } from "../lib/pricing.js";
import { matchExact, matchFuzzy, normalise, similarity, singular, type MenuIndex } from "./menuSearch.js";

export type ParseResult = {
  confident: boolean;
  lines: CartLineInput[];
  /** Words the parser could not place. Non-empty means hand it to the model. */
  leftovers: string[];
  reason?: string;
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, couple: 2, pair: 2,
  dozen: 12, another: 1,
};

/** Words that carry no meaning for an order and can be dropped silently. */
const FILLER = new Set([
  "please", "pls", "thanks", "thank", "you", "cheers", "hi", "hello", "hey",
  "can", "could", "i", "id", "ill", "we", "wed", "get", "have", "like", "want",
  "order", "ordering", "just", "and", "plus", "also", "with", "for", "me", "us",
  "the", "some", "my", "to", "of", "it", "that", "ta", "yeah", "ok", "okay",
  "gimme", "give", "lemme", "let", "do", "does", "would", "make",
  "as", "well", "aswell", "too", "then", "now", "right", "alright", "on", "side",
]);

/** Words that start a removal: "no onions", "without pickles", "hold the cheese". */
const REMOVE_WORDS = new Set(["no", "without", "hold", "minus", "skip"]);

/** Size words, mapped to what option groups actually call them. */
const SIZE_WORDS: Record<string, string[]> = {
  small: ["small"],
  regular: ["regular", "medium"],
  medium: ["medium", "regular"],
  large: ["large"],
  big: ["large"],
  double: ["double"],
  single: ["single"],
};

type Token = { word: string; index: number; used: boolean };

export function parseOrder(
  message: string,
  index: MenuIndex,
  menu: MenuLookup
): ParseResult {
  const words = normalise(message).split(" ").filter(Boolean);
  const tokens: Token[] = words.map((word, i) => ({ word, index: i, used: false }));

  const lines: CartLineInput[] = [];
  /**
   * Modifiers said before the item: "large chips", "a large coke".
   * Held here until an item turns up to attach them to. If none does, the
   * tokens are released and become leftovers, which is what makes the parser
   * admit it did not understand rather than dropping a word silently.
   */
  let pending: { word: string; token: Token }[] = [];
  let pendingQuantity: { value: number; token: Token } | null = null;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i]!;

    if (token.used || FILLER.has(token.word)) {
      token.used = true;
      i++;
      continue;
    }

    // A size word with no item yet: hold on to it.
    if (SIZE_WORDS[token.word] && !longestItem(tokens, i, index)) {
      pending.push({ word: token.word, token });
      token.used = true;
      i++;
      continue;
    }

    // A quantity waits for its item rather than being spent immediately, so
    // "a large coke" still reads as one large cola.
    const asNumber = NUMBER_WORDS[token.word] ?? (/^\d{1,2}$/.test(token.word) ? Number(token.word) : null);
    if (asNumber !== null && !longestItem(tokens, i, index)) {
      pendingQuantity = { value: asNumber, token };
      token.used = true;
      i++;
      continue;
    }

    const match = longestItem(tokens, i, index);
    if (!match) {
      // Nothing here, and nothing held can attach to it.
      if (pendingQuantity) {
        pendingQuantity.token.used = false;
        pendingQuantity = null;
      }
      i++;
      continue;
    }

    const quantity = pendingQuantity?.value ?? 1;
    pendingQuantity = null;

    for (let k = match.start; k < match.end; k++) tokens[k]!.used = true;

    const line: CartLineInput = { slug: match.slug, quantity, choices: {} };
    const groups = groupsFor(match.slug, menu);

    // Attach anything said before the item, and release what does not fit.
    for (const held of pending) {
      const option = findOption(groups, SIZE_WORDS[held.word] ?? []);
      if (option) line.choices![option.groupId] = [option.name];
      else held.token.used = false;
    }
    pending = [];

    // Modifiers that follow the item, up to the next item or the end.
    let j = match.end;
    while (j < tokens.length) {
      const next = tokens[j]!;
      if (longestItem(tokens, j, index)) break;                 // the next item starts
      if (NUMBER_WORDS[next.word] !== undefined && longestItem(tokens, j + 1, index)) break;
      if (/^\d+$/.test(next.word) && longestItem(tokens, j + 1, index)) break;

      // "no onions" / "without pickles"
      if (REMOVE_WORDS.has(next.word)) {
        const target = tokens[j + 1];
        if (target) {
          const option = findOption(groups, ["no " + target.word, "no " + singular(target.word)]);
          if (option) {
            (line.choices![option.groupId] ??= []).push(option.name);
            next.used = true;
            target.used = true;
            j += 2;
            continue;
          }
        }
      }

      // "large", "regular", "double"
      const sizes = SIZE_WORDS[next.word];
      if (sizes) {
        const option = findOption(groups, sizes);
        if (option) {
          line.choices![option.groupId] = [option.name];
          next.used = true;
          j++;
          continue;
        }
      }

      // "extra cheese"
      if (next.word === "extra") {
        const target = tokens[j + 1];
        if (target) {
          const option = findOption(groups, ["extra " + target.word, "extra " + singular(target.word)]);
          if (option) {
            (line.choices![option.groupId] ??= []).push(option.name);
            next.used = true;
            target.used = true;
            j += 2;
            continue;
          }
        }
      }

      if (FILLER.has(next.word)) {
        next.used = true;
        j++;
        continue;
      }

      break; // something the parser does not understand
    }

    // Fill in any single-choice group that has a default and was not mentioned.
    for (const group of groups) {
      if (group.min < 1 || line.choices![group.groupId]) continue;
      const fallback = group.options.find((o) => o.default);
      if (fallback) line.choices![group.groupId] = [fallback.name];
    }

    lines.push(line);
    i = j;
  }

  // Anything still held was never attached to an item.
  for (const held of pending) held.token.used = false;
  if (pendingQuantity) pendingQuantity.token.used = false;

  const leftovers = tokens.filter((t) => !t.used && !FILLER.has(t.word)).map((t) => t.word);

  if (lines.length === 0) {
    return { confident: false, lines: [], leftovers, reason: "No menu item recognised." };
  }
  if (leftovers.length > 0) {
    return { confident: false, lines, leftovers, reason: `Unrecognised: ${leftovers.join(", ")}.` };
  }

  // Still not confident if a required choice was left open — the customer said
  // something the parser understood, but not enough of it.
  const open = lines.some((line) =>
    groupsFor(line.slug, menu).some((g) => g.min > 0 && !(line.choices?.[g.groupId]?.length))
  );

  return {
    confident: !open,
    lines,
    leftovers: [],
    reason: open ? "A required choice is still open." : undefined,
  };
}

/**
 * The longest run of words from here that names an item.
 *
 * Exact first, across every length, so "cheeseburger meal" beats
 * "cheeseburger". Only then a typo pass, at a high threshold: 0.82 catches
 * "cheesburger" and "chiken nuggets" while leaving anything genuinely
 * ambiguous to the resolver, which asks rather than guesses.
 */
function longestItem(tokens: Token[], start: number, index: MenuIndex) {
  const max = Math.min(index.maxPhraseWords, tokens.length - start);

  const isNumber = (w: string) =>
    NUMBER_WORDS[w] !== undefined || /^\d+$/.test(w);

  const spans: { phrase: string; singular: string; length: number; hasNumber: boolean }[] = [];
  for (let length = max; length >= 1; length--) {
    const slice = tokens.slice(start, start + length);
    if (slice.some((t) => t.used)) continue;
    spans.push({
      phrase: slice.map((t) => t.word).join(" "),
      singular: slice.map((t) => singular(t.word)).join(" "),
      length,
      hasNumber: slice.some((t) => isNumber(t.word)),
    });
  }

  for (const span of spans) {
    const hit = matchExact(span.phrase, index) ?? matchExact(span.singular, index);
    if (hit) return { slug: hit.slug, start, end: start + span.length };
  }

  for (const span of spans) {
    if (span.phrase.length < 5) continue;
    // A span carrying a quantity would swallow it: "2 cheeseburgers" scores
    // higher against "cheeseburger" than "cheesburger" does, and matching it
    // whole would silently turn two burgers into one.
    if (span.hasNumber) continue;

    const [best, second] = matchFuzzy(span.phrase, index, 2);
    if (best && best.score >= 0.78 && (!second || best.score - second.score > 0.08)) {
      return { slug: best.slug, start, end: start + span.length };
    }
  }

  return null;
}

function groupsFor(slug: string, menu: MenuLookup): OptionGroup[] {
  const item = menu.items.get(slug);
  if (!item) return [];
  return item.optionGroups
    .map((id) => menu.groups.get(id))
    .filter((g): g is OptionGroup => Boolean(g));
}

function findOption(groups: OptionGroup[], wanted: string[]) {
  const targets = wanted.map(normalise);
  for (const group of groups) {
    for (const option of group.options) {
      if (targets.includes(normalise(option.name))) {
        return { groupId: group.groupId, name: option.name };
      }
    }
  }
  return null;
}
