"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The cart, as the browser knows it.
 *
 * It stores WHAT was chosen and nothing about money. There is no `price` field
 * anywhere in here on purpose: if the browser never holds a price, it can never
 * show a stale one, and a tampered localStorage entry changes nothing except
 * which items get quoted. Every figure on screen comes from /orders/quote.
 */

export type CartLine = {
  /** Stable id so two cheeseburgers with different options stay separate. */
  key: string;
  slug: string;
  name: string;
  quantity: number;
  choices: Record<string, string[]>;
  notes?: string;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  replace: (key: string, line: Omit<CartLine, "key">) => void;
  /** Used by the assistant, which returns the whole cart rather than a change. */
  replaceAll: (lines: Omit<CartLine, "key">[]) => void;
  clear: () => void;
  count: () => number;
};

/** Same item, same choices, same line. Order of choices must not matter. */
function lineKey(slug: string, choices: Record<string, string[]>) {
  const stable = Object.keys(choices)
    .sort()
    .map((g) => `${g}:${[...(choices[g] ?? [])].sort().join("|")}`)
    .join(";");
  return stable ? `${slug}#${stable}` : slug;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      add: (line) => {
        const key = lineKey(line.slug, line.choices);
        const existing = get().lines.find((l) => l.key === key);
        if (existing) {
          set({
            lines: get().lines.map((l) =>
              l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l
            ),
          });
          return;
        }
        set({ lines: [...get().lines, { ...line, key }] });
      },

      setQuantity: (key, quantity) =>
        set({
          lines:
            quantity < 1
              ? get().lines.filter((l) => l.key !== key)
              : get().lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        }),

      remove: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),

      replace: (key, line) =>
        set({
          lines: get().lines.map((l) =>
            l.key === key ? { ...line, key: lineKey(line.slug, line.choices) } : l
          ),
        }),

      replaceAll: (lines) =>
        set({ lines: lines.map((l) => ({ ...l, key: lineKey(l.slug, l.choices) })) }),

      clear: () => set({ lines: [] }),

      count: () => get().lines.reduce((n, l) => n + l.quantity, 0),
    }),
    { name: "sayserve-cart", version: 1 }
  )
);

export const toQuoteLines = (lines: CartLine[]) =>
  lines.map(({ slug, quantity, choices, notes }) => ({ slug, quantity, choices, notes }));
