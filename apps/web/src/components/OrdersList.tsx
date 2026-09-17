"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, type Order } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { getRecentOrders } from "@/lib/recentOrders";
import { useUser } from "@/lib/useUser";

const TONE: Record<string, string> = {
  completed: "bg-ok-bg text-ok",
  cancelled: "bg-bad-bg text-bad",
  rejected: "bg-bad-bg text-bad",
  expired: "bg-surface text-ink-soft",
};

export function OrdersList() {
  const { user, loading } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [guestOrders, setGuestOrders] = useState<Order[]>([]);
  const { add, clear } = useCart();

  useEffect(() => {
    if (user) {
      api.myOrders().then((r) => setOrders(r.orders)).catch(() => setOrders([]));
      return;
    }
    // No account: fall back to the tokens kept from checkout.
    const recent = getRecentOrders();
    Promise.all(recent.map((r) => api.getOrder(r.id, r.token).then((t) => t.order).catch(() => null)))
      .then((list) => setGuestOrders(list.filter((o): o is Order => Boolean(o))));
  }, [user]);

  const shown = user ? orders : guestOrders;

  /** Reorder rebuilds the cart from the order's own frozen lines. */
  function reorder(order: Order) {
    clear();
    for (const line of order.lines) {
      const choices: Record<string, string[]> = {};
      for (const c of line.choices) {
        (choices[c.groupId] ??= []).push(c.optionName);
      }
      add({ slug: line.slug, name: line.name, quantity: line.quantity, choices });
    }
  }

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12"><div className="h-32 card animate-pulse" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-medium mb-1">Your orders</h1>
      <p className="text-sm text-ink-soft mb-6">
        {user ? `Signed in as ${user.name}` : "Orders from this device"}
      </p>

      {shown.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-soft">No orders yet.</p>
          {!user && (
            <p className="text-xs text-ink-muted mt-2">
              <Link href="/signin" className="text-accent underline">Sign in</Link> to see orders
              placed on another device.
            </p>
          )}
          <Link href="/menu" className="btn-primary mt-4 px-6">Browse the menu</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((order) => (
            <div key={order.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">#{order.orderNumber}</span>
                  <span className={`tag ${TONE[order.status] ?? "bg-accent-bg text-accent"}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                </div>
                <span className="text-sm font-medium">{money(order.total)}</span>
              </div>

              <p className="text-xs text-ink-soft mt-1">
                {new Date(order.createdAt).toLocaleString("en-GB", {
                  weekday: "short", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <p className="text-xs text-ink-soft mt-1.5">
                {order.lines.map((l) => `${l.quantity} × ${l.name}`).join(", ")}
              </p>

              <div className="flex gap-2 mt-3">
                <Link href={`/orders/${order.id}`} className="btn-ghost h-9 px-4 text-xs">Track</Link>
                <button onClick={() => reorder(order)} className="btn-ghost h-9 px-4 text-xs">
                  Order again
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
