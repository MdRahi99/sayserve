"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type MenuItem } from "@/lib/api";
import { money } from "@/lib/format";
import { Photo } from "./Photo";

/**
 * The popular items, as a list on a phone and cards on a desktop.
 *
 * The page hands these in, fetched on the server, so they are in the HTML and
 * appear instantly. The fetch below is only a fallback for when the server
 * could not reach the API — the page still renders, and fills itself in when
 * the API wakes up.
 *
 * Tapping goes to the menu rather than adding blind: the customiser is where a
 * burger becomes an order, and skipping it is how people end up with onions
 * they did not want.
 */
export function PopularItems({ initial }: { initial?: MenuItem[] }) {
  const [items, setItems] = useState<MenuItem[]>(initial ?? []);

  useEffect(() => {
    if (initial?.length) return;
    api.menu()
      .then((r) => setItems(r.items.filter((i) => i.popular && i.available).slice(0, 4)))
      .catch(() => setItems([]));
  }, [initial]);

  if (items.length === 0) {
    return (
      <div className="space-y-3 mt-3" aria-hidden>
        {[0, 1, 2].map((i) => <div key={i} className="h-20 bg-surface rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <>
      <ul className="lg:hidden divide-y divide-line">
        {items.slice(0, 3).map((item) => (
          <li key={item.slug}>
            <Link href="/menu" className="flex items-center gap-3 py-3">
              <Photo url={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-lg shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">{item.name}</span>
                <span className="block text-sm text-ink-soft mt-0.5">{money(item.basePrice)}</span>
              </span>
              <span aria-hidden
                className="w-8 h-8 rounded-lg border border-line-strong grid place-items-center text-lg">
                +
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <ul className="hidden lg:grid grid-cols-4 gap-4">
        {items.map((item) => (
          <li key={item.slug} className="card overflow-hidden">
            <Photo url={item.imageUrl} alt={item.name} className="h-32 w-full" />
            <div className="p-4">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-ink-soft mt-1 line-clamp-1">{item.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-medium">{money(item.basePrice)}</span>
                <Link href="/menu" className="btn-ghost h-8 px-4 text-xs">Add</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
