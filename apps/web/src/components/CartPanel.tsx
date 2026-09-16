"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type MenuItem, type OptionGroup, type QuoteResponse } from "@/lib/api";
import { toQuoteLines, useCart, type CartLine } from "@/lib/cart";
import { money } from "@/lib/format";

/**
 * The cart, priced by the server.
 *
 * Every number here arrives from /orders/quote. The panel also renders the
 * problems the API sends back: a meal with no drink chosen sits in the cart
 * flagged and unpriced, and Checkout stays disabled until `complete` is true.
 * The button is not guessing — it is repeating what the server said.
 */
export function CartPanel({
  items, groups, onEdit, compact = false,
}: {
  items: MenuItem[];
  groups: OptionGroup[];
  onEdit?: (line: CartLine) => void;
  compact?: boolean;
}) {
  const { lines, setQuantity, remove, clear } = useCart();
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.quote(toQuoteLines(lines))
      .then((q) => !cancelled && (setQuote(q), setError(null)))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : "Could not price this cart."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [lines]);

  if (lines.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-ink-soft">Your cart is empty.</p>
        <p className="text-xs text-ink-muted mt-1">Add something from the menu to get started.</p>
      </div>
    );
  }

  /** Problems the API reported, indexed by the item they belong to. */
  const problemsFor = (slug: string) =>
    (quote?.problems ?? []).filter((p) => "slug" in p && p.slug === slug);

  const pricedLine = (slug: string, choiceCount: number) =>
    quote?.lines.find((l) => l.slug === slug && l.choices.length === choiceCount);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-base font-medium">Your cart</h2>
        <button onClick={clear} className="text-xs text-accent hover:underline">Clear</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {lines.map((line) => {
          const problems = problemsFor(line.slug);
          const priced = pricedLine(line.slug, Object.values(line.choices).flat().length);
          const chosen = Object.values(line.choices).flat();

          return (
            <div key={line.key} className="border-t border-line py-3">
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {line.quantity} × {line.name}
                  </p>
                  {chosen.length > 0 && (
                    <p className="text-xs text-ink-soft mt-0.5">{chosen.join(", ")}</p>
                  )}
                  {problems.map((p, i) => (
                    <span key={i} className="tag bg-warn-bg text-warn mt-1.5">
                      {p.kind === "missing_choice" ? `Needs ${p.groupName.toLowerCase()}`
                        : p.kind === "unavailable" ? "Sold out"
                        : "Not available"}
                    </span>
                  ))}
                </div>
                <span className={`text-sm shrink-0 ${priced ? "" : "text-ink-muted"}`}>
                  {priced ? money(priced.lineTotal) : "—"}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center border border-line rounded h-8">
                  <button onClick={() => setQuantity(line.key, line.quantity - 1)}
                    className="w-8 h-full" aria-label={`One fewer ${line.name}`}>−</button>
                  <span className="w-6 text-center text-xs">{line.quantity}</span>
                  <button onClick={() => setQuantity(line.key, line.quantity + 1)}
                    className="w-8 h-full" aria-label={`One more ${line.name}`}>+</button>
                </div>
                {onEdit && items.some((i) => i.slug === line.slug) && (
                  <button onClick={() => onEdit(line)} className="text-xs text-accent hover:underline">
                    Edit
                  </button>
                )}
                <button onClick={() => remove(line.key)} className="text-xs text-ink-muted hover:underline">
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line p-4 space-y-3">
        {error && <p role="alert" className="text-xs text-bad">{error}</p>}

        <div className="flex justify-between text-sm text-ink-soft">
          <span>Subtotal</span>
          <span aria-live="polite">
            {loading && !quote ? "…" : quote ? money(quote.subtotal) : "—"}
          </span>
        </div>

        {quote && !quote.storeOpen && (
          <p className="tag bg-bad-bg text-bad w-full justify-center py-1.5">
            The kitchen is closed right now
          </p>
        )}

        <button
          className="btn-primary w-full"
          disabled={!quote?.complete || !quote.storeOpen}
          title={quote && !quote.complete ? "Some items still need a choice" : undefined}
        >
          {!quote?.complete && quote
            ? "Finish your choices first"
            : `Checkout${quote ? ` · ${money(quote.total)}` : ""}`}
        </button>

        {!compact && quote?.prepTimeMinutes && quote.complete && (
          <p className="text-xs text-ink-muted text-center">
            Ready in about {quote.prepTimeMinutes} minutes
          </p>
        )}
      </div>
    </div>
  );
}
