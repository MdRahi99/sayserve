"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type TrackedOrder } from "@/lib/api";
import { money } from "@/lib/format";
import { tokenFor } from "@/lib/recentOrders";
import { getSocket } from "@/lib/socket";

const OPEN_STATUSES = ["pending_payment", "placed", "accepted", "preparing", "ready", "out_for_delivery"];

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "Waiting for payment",
  placed: "Order placed",
  accepted: "Accepted by the kitchen",
  preparing: "Preparing your food",
  ready: "Ready to collect",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
  rejected: "Rejected by the kitchen",
  expired: "Expired",
};

export function OrderTracking({ id }: { id: string }) {
  const [data, setData] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const params = useSearchParams();
  const justPaid = params.get("paid") === "1";
  const paymentCancelled = params.get("cancelled") === "1";

  const load = useCallback(async () => {
    try {
      setData(await api.getOrder(id, tokenFor(id)));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load this order.");
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  /**
   * The socket is how this page updates: the kitchen taps Accept and the
   * timeline moves immediately.
   *
   * Polling stays as a slow safety net, for a dropped connection or a proxy
   * that will not hold a websocket open. Both stop once the order is finished,
   * so a tab left open overnight costs nothing.
   */
  useEffect(() => {
    if (!data || !OPEN_STATUSES.includes(data.order.status)) return;

    const socket = getSocket();
    const join = () => socket.emit("watch:order", { id, token: tokenFor(id) });
    join();
    socket.on("connect", join);
    socket.on("order:updated", () => void load());

    const fallback = setInterval(() => void load(), 30000);

    return () => {
      socket.emit("unwatch:order", { id });
      socket.off("order:updated");
      socket.off("connect", join);
      clearInterval(fallback);
    };
  }, [data, id, load]);

  async function cancel() {
    if (!confirm("Cancel this order?")) return;
    setCancelling(true);
    try {
      await api.cancelOrder(id, tokenFor(id));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not cancel this order.");
    } finally {
      setCancelling(false);
    }
  }

  if (error && !data) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <p className="text-sm text-bad">{error}</p>
        <Link href="/menu" className="btn-ghost mt-4">Back to the menu</Link>
      </div>
    );
  }

  if (!data) {
    return <div className="max-w-2xl mx-auto px-4 py-12"><div className="h-48 card animate-pulse" /></div>;
  }

  const { order, timeline, canCancel } = data;
  const reached = new Set(order.statusHistory.map((h) => h.to));
  const finished = !OPEN_STATUSES.includes(order.status);
  const stopped = ["cancelled", "rejected", "expired"].includes(order.status);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 lg:grid lg:grid-cols-[1fr,380px] lg:gap-8 lg:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-medium">Order #{order.orderNumber}</h1>
          <span className={`tag ${stopped ? "bg-bad-bg text-bad"
            : order.status === "completed" ? "bg-ok-bg text-ok" : "bg-accent-bg text-accent"}`}>
            {STATUS_LABELS[order.status]}
          </span>
        </div>
        <p className="text-sm text-ink-soft mt-1">
          {order.fulfilment === "delivery" ? "Delivery" : "Collection"} · placed{" "}
          {new Date(order.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </p>

        {justPaid && order.payment.status !== "paid" && (
          <p className="tag bg-accent-bg text-accent mt-4 h-8 px-3">
            Payment received — confirming with the kitchen…
          </p>
        )}
        {paymentCancelled && order.status === "pending_payment" && (
          <p className="tag bg-warn-bg text-warn mt-4 h-8 px-3">
            Payment was not completed. This order expires in 30 minutes.
          </p>
        )}

        {stopped ? (
          <div className="card p-6 mt-6">
            <p className="text-sm">
              This order was {STATUS_LABELS[order.status]!.toLowerCase()}.
              {order.payment.status === "refunded" && " Your payment has been refunded."}
            </p>
            <Link href="/menu" className="btn-ghost mt-4">Order something else</Link>
          </div>
        ) : (
          <div className="card p-6 mt-6">
            {order.readyAt && (
              <div className="mb-6">
                <p className="text-sm text-ink-soft">
                  {order.fulfilment === "delivery" ? "With you at" : "Ready at"}
                </p>
                <p className="text-4xl font-medium mt-1">
                  {new Date(order.readyAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}

            <ol className="space-y-0">
              {timeline.map((step, i) => {
                const done = reached.has(step.status);
                const current = order.status === step.status;
                const event = order.statusHistory.find((h) => h.to === step.status);
                return (
                  <li key={step.status} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`w-4 h-4 rounded-full border shrink-0 mt-0.5
                        ${current ? "bg-accent border-accent"
                          : done ? "bg-ok border-ok" : "border-line-strong"}`} />
                      {i < timeline.length - 1 && (
                        <span className={`w-px flex-1 my-1 ${done ? "bg-line-strong" : "bg-line"}`} />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className={`text-sm ${current ? "font-medium" : done ? "" : "text-ink-muted"}`}>
                        {step.label}
                      </p>
                      {event && (
                        <p className="text-xs text-ink-soft mt-0.5">
                          {new Date(event.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {!finished && (
              <p className="text-xs text-ink-muted border-t border-line pt-3">
                This page updates itself as the kitchen works.
              </p>
            )}
          </div>
        )}

        {order.fulfilment === "collection" && !stopped && (
          <div className="mt-6">
            <h2 className="text-sm font-medium mb-2">Collect from</h2>
            <div className="bg-surface rounded-xl p-4">
              <p className="text-sm">SayServe · 14 High Street</p>
              <p className="text-xs text-ink-soft mt-1">Open until 23:00 · 07700 900100</p>
            </div>
          </div>
        )}
      </div>

      <aside className="card p-5 mt-6 lg:mt-0">
        <h2 className="text-base font-medium mb-3">Your order</h2>
        <div className="divide-y divide-line">
          {order.lines.map((l, i) => (
            <div key={i} className="py-3 flex justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm">{l.quantity} × {l.name}</p>
                {l.choices.length > 0 && (
                  <p className="text-xs text-ink-soft mt-0.5">
                    {l.choices.map((c) => c.optionName).join(", ")}
                  </p>
                )}
              </div>
              <span className="text-sm shrink-0">{money(l.lineTotal)}</span>
            </div>
          ))}
        </div>

        {order.deliveryFee > 0 && (
          <div className="flex justify-between text-sm text-ink-soft border-t border-line pt-3 mt-3">
            <span>Delivery</span><span>{money(order.deliveryFee)}</span>
          </div>
        )}

        <div className="flex justify-between items-baseline border-t border-line pt-3 mt-3">
          <span className="font-medium">
            {order.payment.status === "paid" ? "Total paid" : "Total"}
          </span>
          <span className="font-medium">{money(order.total)}</span>
        </div>

        {canCancel ? (
          <button onClick={cancel} disabled={cancelling} className="btn-ghost w-full mt-4">
            {cancelling ? "Cancelling…" : "Cancel this order"}
          </button>
        ) : !finished ? (
          <p className="text-xs text-ink-muted mt-4 text-center">
            The kitchen has started this order, so it can no longer be cancelled online.
          </p>
        ) : null}

        {error && <p role="alert" className="text-xs text-bad mt-3">{error}</p>}
      </aside>
    </div>
  );
}
