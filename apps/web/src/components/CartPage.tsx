"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError, type MenuResponse } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { CartPanel } from "./CartPanel";
import { ItemModal } from "./ItemModal";
import type { CartLine } from "@/lib/cart";
import type { MenuItem } from "@/lib/api";

/** The full-page cart, for phones and for anyone who lands here directly. */
export function CartPage() {
  const [data, setData] = useState<MenuResponse | null>(null);
  const [editing, setEditing] = useState<{ item: MenuItem; line: CartLine } | null>(null);
  const lines = useCart((s) => s.lines);

  useEffect(() => {
    api.menu().then(setData).catch((e: ApiError) => console.error(e.message));
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium mb-6">Your cart</h1>

      <div className="card overflow-hidden">
        <CartPanel
          items={data?.items ?? []}
          groups={data?.optionGroups ?? []}
          onEdit={(line) => {
            const item = data?.items.find((i) => i.slug === line.slug);
            if (item) setEditing({ item, line });
          }}
        />
      </div>

      {lines.length > 0 && (
        <Link href="/menu" className="btn-ghost w-full mt-4">Add something else</Link>
      )}

      {editing && data && (
        <ItemModal item={editing.item} groups={data.optionGroups} editing={editing.line}
          onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
