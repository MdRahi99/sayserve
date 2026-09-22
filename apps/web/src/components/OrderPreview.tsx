"use client";

import { useEffect, useState } from "react";

/**
 * The hero preview: the assistant filling a cart, played back.
 *
 * A still screenshot of a chat says nothing a paragraph could not. Watching the
 * cart fill as the words arrive is the entire product in eight seconds, and it
 * is the one thing a visitor will not read far enough to discover otherwise.
 *
 * It is a replay, not a live session: no API call, nothing to go wrong, and the
 * page still makes its point when the free tier is asleep.
 */

type Frame = {
  user?: string;
  reply?: string;
  note?: string;
  cart: { line: string; sub?: string; price: string }[];
};

const FRAMES: Frame[] = [
  { cart: [] },
  {
    user: "two cheeseburgers, no onions",
    cart: [],
  },
  {
    user: "two cheeseburgers, no onions",
    reply: "Added. Anything else?",
    note: "Added straight away",
    cart: [{ line: "2 × Cheeseburger", sub: "No onions", price: "£8.98" }],
  },
  {
    user: "and a large coke",
    reply: "Added. Anything else?",
    note: "Added straight away",
    cart: [
      { line: "2 × Cheeseburger", sub: "No onions", price: "£8.98" },
      { line: "1 × Cola", sub: "Large", price: "£2.19" },
    ],
  },
  {
    user: "a cheeseburger meal too",
    reply: "Choose a drink for the Cheeseburger Meal?",
    note: "The meal needs a drink, so it asks rather than guessing",
    cart: [
      { line: "2 × Cheeseburger", sub: "No onions", price: "£8.98" },
      { line: "1 × Cola", sub: "Large", price: "£2.19" },
      { line: "1 × Cheeseburger Meal", sub: "Needs a drink", price: "—" },
    ],
  },
];

export function OrderPreview() {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 2600);
    return () => clearInterval(timer);
  }, []);

  const current = FRAMES[frame]!;

  return (
    <div className="card overflow-hidden" aria-hidden>
      <div className="flex items-center justify-between px-4 h-12 border-b border-line">
        <span className="text-sm font-medium">Just tell us</span>
        <span className="text-xs text-ink-muted">live preview</span>
      </div>

      <div className="p-4 min-h-[172px] space-y-2.5">
        {current.user && (
          <p className="ml-auto max-w-[80%] w-fit bg-ink text-white rounded-2xl px-3.5 py-2 text-sm">
            {current.user}
          </p>
        )}
        {current.reply && (
          <p className="max-w-[85%] w-fit bg-surface rounded-2xl px-3.5 py-2 text-sm">
            {current.reply}
          </p>
        )}
        {current.note && <p className="text-[11px] text-ink-muted ml-1">{current.note}</p>}
        {!current.user && (
          <p className="text-sm text-ink-muted">Tell me what you&apos;d like…</p>
        )}
      </div>

      <div className="border-t border-line p-4">
        <p className="text-xs text-ink-muted mb-2">Your cart</p>

        {current.cart.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing yet.</p>
        ) : (
          <ul className="space-y-2">
            {current.cart.map((line) => (
              <li key={line.line} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0">
                  {line.line}
                  {line.sub && (
                    <span className={`block text-xs mt-0.5 ${
                      line.sub === "Needs a drink" ? "text-warn" : "text-ink-soft"}`}>
                      {line.sub}
                    </span>
                  )}
                </span>
                <span className={line.price === "—" ? "text-ink-muted" : ""}>{line.price}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-1.5 mt-4" role="presentation">
          {FRAMES.map((_, i) => (
            <span key={i}
              className={`h-1 flex-1 rounded-full transition-colors
                ${i === frame ? "bg-ink" : "bg-line"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
