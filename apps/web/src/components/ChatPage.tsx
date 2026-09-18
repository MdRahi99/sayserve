"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type MenuResponse } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { Assistant } from "./Assistant";
import { CartPanel } from "./CartPanel";

/**
 * Chat with the cart beside it on a desktop, underneath on a phone.
 *
 * Seeing the cart fill as you talk is what makes an assistant trustworthy. A
 * chat that claims it added something, with no way to check, is a leap of
 * faith nobody should take with their dinner.
 */
export function ChatPage() {
  const [data, setData] = useState<MenuResponse | null>(null);
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));

  useEffect(() => {
    api.menu().then(setData).catch(() => setData(null));
  }, []);

  return (
    <div className="lg:grid lg:grid-cols-[1fr,380px] lg:h-[calc(100vh-4rem)]">
      <div className="h-[calc(100vh-11rem)] lg:h-full border-b lg:border-b-0 lg:border-r border-line">
        <Assistant items={data?.items ?? []} />
      </div>

      {/* On a phone the cart is a strip under the conversation: enough to see it
          filling, without pushing the thread off the screen. */}
      <Link href="/cart"
        className="lg:hidden flex items-center justify-between gap-3 px-4 h-14 border-b border-line">
        <span className="text-sm">
          {count === 0 ? "Your cart is empty" : `Cart · ${count} item${count === 1 ? "" : "s"}`}
        </span>
        <span className="text-sm text-accent">{count === 0 ? "Browse the menu" : "View"}</span>
      </Link>

      <aside className="hidden lg:flex flex-col lg:h-full">
        <div className="flex-1 min-h-0">
          <CartPanel items={data?.items ?? []} groups={data?.optionGroups ?? []} />
        </div>
        {count === 0 && (
          <p className="text-xs text-ink-muted text-center px-4 pb-4">
            Or <Link href="/menu" className="text-accent underline">browse the menu</Link> and tap.
          </p>
        )}
      </aside>
    </div>
  );
}
