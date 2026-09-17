"use client";

/**
 * Guests have no account, so the only way back to an order they placed is the
 * token the API handed them at checkout. Keeping the last few here means
 * "Your orders" works without signing up, and losing this list loses nothing
 * that matters — the order itself is safe on the server.
 */
const KEY = "sayserve-recent-orders";

export type RecentOrder = { id: string; token: string | null; number: number; at: string };

export function rememberOrder(order: { id: string; guestToken: string | null; orderNumber: number }) {
  if (typeof window === "undefined") return;
  const list = getRecentOrders().filter((o) => o.id !== order.id);
  list.unshift({
    id: order.id, token: order.guestToken, number: order.orderNumber,
    at: new Date().toISOString(),
  });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 10)));
}

export function getRecentOrders(): RecentOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentOrder[]) : [];
  } catch {
    return [];
  }
}

export function tokenFor(id: string) {
  return getRecentOrders().find((o) => o.id === id)?.token ?? null;
}
