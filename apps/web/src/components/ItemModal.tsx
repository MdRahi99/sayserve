"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MenuItem, OptionGroup } from "@/lib/api";
import { useCart, type CartLine } from "@/lib/cart";
import { delta, money } from "@/lib/format";
import { Photo } from "./Photo";
import { Tag } from "./Tag";

/**
 * Everything on this screen is generated from the option groups. There is no
 * special case for "size" or for meals: a meal is just an item with a group
 * whose min is 1, so the same code that renders "Remove anything?" renders
 * "Choose a drink" and blocks the Add button until it is answered.
 *
 * The running total shown here is arithmetic on data the API already sent, and
 * it is a preview only. The cart's real figures come back from /orders/quote.
 */
export function ItemModal({
  item, groups, editing, onClose,
}: {
  item: MenuItem;
  groups: OptionGroup[];
  editing?: CartLine;
  onClose: () => void;
}) {
  const { add, replace } = useCart();
  const dialogRef = useRef<HTMLDivElement>(null);

  const itemGroups = useMemo(
    () => item.optionGroups
      .map((id) => groups.find((g) => g.groupId === id))
      .filter((g): g is OptionGroup => Boolean(g)),
    [item, groups]
  );

  const [choices, setChoices] = useState<Record<string, string[]>>(() => {
    if (editing) return editing.choices;
    // Pre-select defaults so the common case is one tap, but only where a
    // default exists — never invent an answer to a required question.
    const seed: Record<string, string[]> = {};
    for (const g of itemGroups) {
      const defaults = g.options.filter((o) => o.default).map((o) => o.name);
      if (defaults.length) seed[g.groupId] = defaults.slice(0, g.max);
    }
    return seed;
  });
  const [quantity, setQuantity] = useState(editing?.quantity ?? 1);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab") return;

      // Keep Tab inside the dialog: landing on the page behind while a modal
      // is open is disorienting with a screen reader and impossible to see.
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      // Back to the button they opened it with, not the top of the page.
      opener?.focus?.();
    };
  }, [onClose]);

  function toggle(group: OptionGroup, optionName: string) {
    setChoices((prev) => {
      const current = prev[group.groupId] ?? [];
      const isOn = current.includes(optionName);

      if (group.max === 1) {
        // A single-choice group with min 0 can be switched off again.
        if (isOn && group.min === 0) return { ...prev, [group.groupId]: [] };
        return { ...prev, [group.groupId]: [optionName] };
      }
      if (isOn) {
        return { ...prev, [group.groupId]: current.filter((n) => n !== optionName) };
      }
      if (current.length >= group.max) return prev;
      return { ...prev, [group.groupId]: [...current, optionName] };
    });
  }

  const unmet = itemGroups.filter((g) => (choices[g.groupId] ?? []).length < g.min);
  const ready = unmet.length === 0;

  const unitPreview = useMemo(() => {
    let price = item.basePrice;
    for (const g of itemGroups) {
      for (const name of choices[g.groupId] ?? []) {
        price += g.options.find((o) => o.name === name)?.priceDelta ?? 0;
      }
    }
    return Math.round(price * 100) / 100;
  }, [item.basePrice, itemGroups, choices]);

  function submit() {
    if (!ready) {
      setShowErrors(true);
      const first = document.getElementById(`group-${unmet[0]!.groupId}`);
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const line = { slug: item.slug, name: item.name, quantity, choices };
    editing ? replace(editing.key, line) : add(line);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 p-0 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-title"
        tabIndex={-1}
        className="bg-card w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl overflow-hidden
                   max-h-[92vh] sm:max-h-[86vh] flex flex-col sm:flex-row"
      >
        <Photo url={item.imageUrl} alt={item.name} className="h-40 sm:h-auto sm:w-72 shrink-0" />

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-start justify-between gap-4 px-5 pt-5">
            <div>
              <h2 id="item-title" className="text-xl font-medium">{item.name}</h2>
              {item.description && (
                <p className="text-sm text-ink-soft mt-1">{item.description}</p>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.tags.map((t) => <Tag key={t} name={t} />)}
              </div>
              {item.allergens.length > 0 && (
                <p className="text-xs text-ink-muted mt-2">
                  Contains {item.allergens.join(", ")}
                </p>
              )}
            </div>
            <button onClick={onClose} aria-label="Close" className="text-ink-soft text-xl leading-none p-1">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {itemGroups.map((group) => {
              const picked = choices[group.groupId] ?? [];
              const missing = showErrors && picked.length < group.min;
              return (
                <fieldset key={group.groupId} id={`group-${group.groupId}`} className="border-t border-line pt-4">
                  <legend className="sr-only">{group.name}</legend>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{group.name}</span>
                    <span className={`tag ${group.min > 0
                      ? missing ? "bg-bad-bg text-bad" : "bg-accent-bg text-accent"
                      : "bg-surface text-ink-muted"}`}>
                      {group.min > 0 ? (missing ? "Please choose" : "Required") : "Optional"}
                    </span>
                  </div>
                  {group.max > 1 && (
                    <p className="text-xs text-ink-muted mt-1">Choose up to {group.max}.</p>
                  )}

                  <div className={group.max === 1 ? "mt-3 space-y-1" : "mt-3 flex flex-wrap gap-2"}>
                    {group.options.map((option) => {
                      const on = picked.includes(option.name);
                      const full = !on && picked.length >= group.max && group.max > 1;

                      if (group.max === 1) {
                        return (
                          <button
                            key={option.name}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(group, option.name)}
                            className="w-full flex items-center gap-3 py-2 text-left"
                          >
                            <span className={`w-4 h-4 rounded-full border shrink-0 grid place-items-center
                              ${on ? "border-ink bg-ink" : "border-line-strong"}`}>
                              {on && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </span>
                            <span className={`flex-1 text-sm ${on ? "text-ink" : "text-ink-soft"}`}>
                              {option.name}
                            </span>
                            {option.priceDelta !== 0 && (
                              <span className="text-sm text-ink-soft">{delta(option.priceDelta)}</span>
                            )}
                          </button>
                        );
                      }

                      return (
                        <button
                          key={option.name}
                          type="button"
                          aria-pressed={on}
                          disabled={full}
                          onClick={() => toggle(group, option.name)}
                          className={`${on ? "chip-on" : "chip"} ${full ? "opacity-40" : ""}`}
                        >
                          {option.name}
                          {option.priceDelta !== 0 && (
                            <span className="ml-1 opacity-80">{delta(option.priceDelta)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
          </div>

          <div className="border-t border-line px-5 py-4 flex items-center gap-3">
            <div className="flex items-center border border-line-strong rounded-lg h-11">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-full text-lg" aria-label="One fewer"
              >−</button>
              <span className="w-8 text-center text-sm" aria-live="polite">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(item.maxQuantityPerOrder, q + 1))}
                className="w-10 h-full text-lg" aria-label="One more"
              >+</button>
            </div>
            <button onClick={submit} className="btn-primary flex-1">
              {editing ? "Update" : "Add"} · {money(unitPreview * quantity)}
            </button>
          </div>

          {showErrors && !ready && (
            <p role="alert" className="px-5 pb-4 -mt-2 text-sm text-bad">
              {unmet[0]!.name} — please choose before adding.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
