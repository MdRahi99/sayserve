"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type MenuItem, type MenuResponse, type OptionGroup } from "@/lib/api";
import { toQuoteLines, useCart, type CartLine } from "@/lib/cart";
import { CATEGORY_LABELS, money } from "@/lib/format";
import { Assistant } from "./Assistant";
import { CartPanel } from "./CartPanel";
import { ItemModal } from "./ItemModal";
import { Photo } from "./Photo";
import { Tag } from "./Tag";

/**
 * Two layouts, one component.
 *
 * Desktop keeps the cart on screen beside the grid, because watching the cart
 * fill is what makes ordering feel safe — and it is what will make the chat
 * assistant trustworthy in Phase 4. On a phone there is no room, so the cart
 * becomes a bar you can pull up.
 */
export function MenuBrowser() {
  const [data, setData] = useState<MenuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("popular");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<{ item: MenuItem; editing?: CartLine } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const [cartTotal, setCartTotal] = useState<string | null>(null);

  useEffect(() => {
    api.menu()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not load the menu."));
  }, []);

  // The bar shows a total, and a total comes from the server like every other
  // price on this site.
  const lines = useCart((s) => s.lines);
  useEffect(() => {
    if (lines.length === 0) return setCartTotal(null);
    let cancelled = false;
    api.quote(toQuoteLines(lines))
      .then((q) => !cancelled && setCartTotal(money(q.subtotal)))
      .catch(() => !cancelled && setCartTotal(null));
    return () => { cancelled = true; };
  }, [lines]);

  const categories = useMemo(() => {
    if (!data) return [];
    const present = [...new Set(data.items.map((i) => i.category))];
    return present.map((c) => ({
      slug: c,
      label: CATEGORY_LABELS[c] ?? c,
      count: data.items.filter((i) => i.category === c).length,
    }));
  }, [data]);

  const shown = useMemo(() => {
    if (!data) return [];
    const term = search.trim().toLowerCase();
    if (term) {
      // Local search also looks at aliases, so "chips" finds Fries before the
      // API is even asked. Phase 4 replaces this with meaning-based matching.
      return data.items.filter((i) =>
        [i.name, i.description, ...i.aliases].some((t) => t.toLowerCase().includes(term))
      );
    }
    if (category === "popular") return data.items.filter((i) => i.popular);
    return data.items.filter((i) => i.category === category);
  }, [data, category, search]);

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <p className="text-sm text-bad">{error}</p>
        <button onClick={() => location.reload()} className="btn-ghost mt-4">Try again</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 max-w-5xl mx-auto">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-64 animate-pulse bg-surface border-line" />
        ))}
      </div>
    );
  }

  const groups: OptionGroup[] = data.optionGroups;

  return (
    <div className="lg:flex lg:items-start">
      <aside className="hidden lg:block w-56 shrink-0 border-r border-line min-h-[calc(100vh-4rem)] py-6 px-4">
        <p className="text-xs text-ink-muted mb-3">Categories</p>
        <nav className="space-y-0.5">
          <CategoryButton
            label="Popular" count={data.items.filter((i) => i.popular).length}
            active={category === "popular" && !search}
            onClick={() => { setCategory("popular"); setSearch(""); }}
          />
          {categories.map((c) => (
            <CategoryButton
              key={c.slug} label={c.label} count={c.count}
              active={category === c.slug && !search}
              onClick={() => { setCategory(c.slug); setSearch(""); }}
            />
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 px-4 py-5 lg:px-8">
        <div className="flex gap-3">
          <label className="flex-1">
            <span className="sr-only">Search the menu</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Search "chips", "nuggs", "fizzy drink"…'
              className="w-full h-11 rounded-lg border border-line bg-card px-4 text-sm
                         placeholder:text-ink-muted"
            />
          </label>
          <button onClick={() => setAssistantOpen(true)} className="btn-ghost h-11 px-4 shrink-0">
            Just tell us
          </button>
        </div>

        <div className="lg:hidden flex gap-2 overflow-x-auto py-4 -mx-4 px-4">
          <button onClick={() => { setCategory("popular"); setSearch(""); }}
            className={category === "popular" && !search ? "chip-on shrink-0" : "chip shrink-0"}>
            Popular
          </button>
          {categories.map((c) => (
            <button key={c.slug} onClick={() => { setCategory(c.slug); setSearch(""); }}
              className={category === c.slug && !search ? "chip-on shrink-0" : "chip shrink-0"}>
              {c.label}
            </button>
          ))}
        </div>

        <h2 className="text-lg font-medium mt-5 mb-3 hidden lg:block">
          {search ? `Results for “${search}”` : category === "popular" ? "Popular" : CATEGORY_LABELS[category]}
        </h2>

        {shown.length === 0 ? (
          <p className="text-sm text-ink-soft py-12 text-center">
            Nothing matches “{search}”. Try another word — we understand “chips” and “fizzy” too.
          </p>
        ) : (
          <>
            <ul className="lg:hidden divide-y divide-line border-t border-line mt-4 pb-32">
              {shown.map((item) => (
                <ItemRow key={item.slug} item={item} onOpen={() => setOpen({ item })} />
              ))}
            </ul>

            <div className="hidden lg:grid sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
              {shown.map((item) => (
                <ItemCard key={item.slug} item={item} onOpen={() => setOpen({ item })} />
              ))}
            </div>
          </>
        )}
      </div>

      <aside className="hidden lg:flex flex-col w-80 shrink-0 border-l border-line
                        h-[calc(100vh-4rem)] sticky top-16">
        <CartPanel items={data.items} groups={groups}
          onEdit={(line) => {
            const item = data.items.find((i) => i.slug === line.slug);
            if (item) setOpen({ item, editing: line });
          }} />
      </aside>

      <div className="lg:hidden fixed bottom-14 inset-x-0 z-30 bg-page/95 backdrop-blur
                      border-t border-line px-4 py-3 flex gap-2">
        <button
          onClick={() => setCartOpen(true)}
          disabled={count === 0}
          className="btn-primary flex-1 justify-between"
        >
          <span>{count === 0 ? "Your cart is empty" : `View cart · ${count} item${count === 1 ? "" : "s"}`}</span>
          {cartTotal && <span className="font-medium">{cartTotal}</span>}
        </button>
        <button
          onClick={() => setAssistantOpen(true)}
          aria-label="Order by talking"
          className="w-12 h-11 rounded-lg border border-line-strong grid place-items-center shrink-0 bg-card"
        >
          <span aria-hidden className="text-lg">⏺</span>
        </button>
      </div>

      {cartOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-ink/40 flex items-end"
          onClick={(e) => e.target === e.currentTarget && setCartOpen(false)}>
          <div className="bg-card w-full rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="flex justify-end p-2">
              <button onClick={() => setCartOpen(false)} aria-label="Close cart" className="p-2 text-ink-soft">✕</button>
            </div>
            <CartPanel items={data.items} groups={groups} compact
              onEdit={(line) => {
                const item = data.items.find((i) => i.slug === line.slug);
                if (item) { setCartOpen(false); setOpen({ item, editing: line }); }
              }} />
          </div>
        </div>
      )}

      {open && (
        <ItemModal item={open.item} groups={groups} editing={open.editing}
          onClose={() => setOpen(null)} />
      )}

      {assistantOpen && (
        <div className="fixed inset-0 z-40 bg-ink/40 flex items-stretch justify-end"
          onClick={(e) => e.target === e.currentTarget && setAssistantOpen(false)}>
          <div className="w-full sm:max-w-md bg-card shadow-xl">
            <Assistant items={data.items} onClose={() => setAssistantOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryButton({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center justify-between rounded-lg px-3 h-9 text-sm transition
        ${active ? "bg-surface text-ink font-medium" : "text-ink-soft hover:bg-surface/60"}`}>
      <span>{label}</span>
      <span className="text-xs text-ink-muted">{count}</span>
    </button>
  );
}

function ItemRow({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  const sellable = item.available && item.servingNow;

  return (
    <li>
      <button
        onClick={onOpen}
        disabled={!sellable}
        className={`w-full flex items-center gap-3 py-3 text-left
          ${sellable ? "" : "opacity-50 cursor-not-allowed"}`}
      >
        <Photo url={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg shrink-0" />

        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium">{item.name}</span>
          <span className="block text-xs text-ink-soft mt-0.5 truncate">
            {sellable
              ? item.description
              : item.servingNow
                ? "Sold out today"
                : `Served ${item.availableFrom}–${item.availableTo}`}
          </span>
          {sellable && (
            <span className="flex items-center gap-2 mt-1.5">
              <span className="text-sm font-medium">{money(item.basePrice)}</span>
              {item.tags.slice(0, 1).map((t) => <Tag key={t} name={t} />)}
            </span>
          )}
        </span>

        {sellable && <span aria-hidden className="text-xl text-ink px-1">+</span>}
      </button>
    </li>
  );
}

function ItemCard({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  const sellable = item.available && item.servingNow;

  return (
    <div className={`card overflow-hidden flex flex-col ${sellable ? "" : "opacity-60"}`}>
      <Photo url={item.imageUrl} alt={item.name} className="h-36 w-full" />
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-medium">{item.name}</h3>
        <p className="text-xs text-ink-soft mt-1 line-clamp-2">{item.description}</p>

        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {item.tags.slice(0, 2).map((t) => <Tag key={t} name={t} />)}
        </div>

        <div className="flex items-center justify-between gap-2 mt-auto pt-3">
          <span className="text-sm font-medium">
            {item.optionGroups.length > 0 && <span className="text-ink-muted text-xs">from </span>}
            {money(item.basePrice)}
          </span>
        </div>

        {sellable ? (
          <button onClick={onOpen} className="btn-ghost w-full mt-3 h-10">
            {item.optionGroups.length > 0 ? "Choose" : "Add"}
          </button>
        ) : (
          <p className="text-xs text-ink-muted mt-3 h-10 flex items-center">
            {item.servingNow
              ? "Sold out today"
              : `Served ${item.availableFrom}–${item.availableTo}`}
          </p>
        )}
      </div>
    </div>
  );
}
