"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Order, type OrderStatus } from "@/lib/api";
import { money } from "@/lib/format";
import { getSocket } from "@/lib/socket";
import { elapsed, useNow } from "@/lib/useElapsed";
import { useUser } from "@/lib/useUser";
import { StaffNav } from "./StaffNav";

/**
 * The kitchen board.
 *
 * Built for a tablet on a counter: big targets, colour that means something,
 * and a timer on every card that turns amber then red. Orders arrive by socket,
 * so nobody refreshes anything. The initial fetch fills the board; after that
 * the socket keeps it honest.
 */

const NEW_STATUSES: OrderStatus[] = ["placed"];
const PREP_STATUSES: OrderStatus[] = ["accepted", "preparing"];
const READY_STATUSES: OrderStatus[] = ["ready", "out_for_delivery"];

export function KitchenBoard() {
  const { user, loading } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const now = useNow();
  const seen = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const board = await api.kitchenBoard();
      const all = [...board.columns.new, ...board.columns.preparing, ...board.columns.ready];
      all.forEach((o) => seen.current.add(o.id));
      setOrders(all);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load the board.");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    void load();

    const socket = getSocket();
    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    setConnected(socket.connected);

    socket.on("order:new", (order: Order) => {
      // A reconnect can replay something already on the board; only chime for
      // an order this tab has genuinely not seen.
      const isNew = !seen.current.has(order.id);
      seen.current.add(order.id);
      setOrders((prev) => (prev.some((o) => o.id === order.id) ? prev : [...prev, order]));
      if (isNew) chime();
    });

    socket.on("order:updated", (order: Order) => {
      setOrders((prev) => {
        const next = prev.map((o) => (o.id === order.id ? order : o));
        return next.some((o) => o.id === order.id) ? next : [...next, order];
      });
    });

    return () => {
      socket.off("order:new");
      socket.off("order:updated");
      socket.off("connect");
      socket.off("disconnect");
    };
  }, [user, load]);

  /** A short beep, made in the browser. No audio file to ship or fail to load. */
  const chime = useCallback(() => {
    if (!soundOn) return;
    try {
      const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch {
      // Sound is a nicety. A browser that blocks it changes nothing important.
    }
  }, [soundOn]);

  async function move(order: Order, to: OrderStatus, extra: { reason?: string; readyInMinutes?: number } = {}) {
    // Update immediately so a busy kitchen never taps twice; the socket
    // confirms, and a failure puts it back.
    const before = orders;
    setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: to } : o)));
    try {
      await api.setOrderStatus(order.id, to, extra);
    } catch (e) {
      setOrders(before);
      setError(e instanceof ApiError ? e.message : "That change was refused.");
    }
  }

  async function reject(order: Order) {
    const reason = prompt(`Reject order #${order.orderNumber}? Give a reason — the customer sees it.`);
    if (!reason?.trim()) return;
    await move(order, "rejected", { reason: reason.trim() });
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
  }

  if (loading) return <Centered>Checking who you are…</Centered>;

  if (!user || !["staff", "admin"].includes(user.role)) {
    return (
      <Centered>
        <p className="text-sm text-ink-soft">This is the staff board.</p>
        <a href="/staff/signin" className="btn-primary mt-4 px-6">Staff sign in</a>
      </Centered>
    );
  }

  const columns = [
    { key: "new", title: "New", statuses: NEW_STATUSES },
    { key: "preparing", title: "Preparing", statuses: PREP_STATUSES },
    { key: "ready", title: "Ready", statuses: READY_STATUSES },
  ] as const;

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <StaffNav active="board" />
      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-line bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-medium">Kitchen</h1>
          <span className={`tag ${connected ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"}`}>
            {connected ? "Live" : "Reconnecting…"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundOn((s) => !s)} className="btn-ghost h-9 px-3 text-xs">
            Sound {soundOn ? "on" : "off"}
          </button>
          <button onClick={() => void load()} className="btn-ghost h-9 px-3 text-xs">Refresh</button>
        </div>
      </div>

      {error && (
        <p role="alert" className="bg-bad-bg text-bad text-sm px-4 py-2">{error}</p>
      )}

      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
        {columns.map((col, i) => {
          const list = orders
            .filter((o) => (col.statuses as readonly OrderStatus[]).includes(o.status))
            .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

          return (
            <section key={col.key}
              className={`flex flex-col min-h-0 ${i > 0 ? "md:border-l border-line" : ""}`}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-line">
                <h2 className="text-sm font-medium">{col.title}</h2>
                <span className="text-sm text-ink-soft">{list.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {list.length === 0 && (
                  <p className="text-xs text-ink-muted text-center py-8">Nothing here.</p>
                )}
                {list.map((order) => (
                  <OrderCard key={order.id} order={order} now={now}
                    onAccept={(mins) => move(order, "accepted", { readyInMinutes: mins })}
                    onReject={() => reject(order)}
                    onPreparing={() => move(order, "preparing")}
                    onReady={() => move(order,
                      order.fulfilment === "delivery" ? "out_for_delivery" : "ready")}
                    onComplete={() => {
                      void move(order, "completed");
                      setOrders((prev) => prev.filter((o) => o.id !== order.id));
                    }} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order, now, onAccept, onReject, onPreparing, onReady, onComplete }: {
  order: Order;
  now: number;
  onAccept: (minutes: number) => void;
  onReject: () => void;
  onPreparing: () => void;
  onReady: () => void;
  onComplete: () => void;
}) {
  const [readyIn, setReadyIn] = useState(15);
  const age = elapsed(order.createdAt, now);

  // Waiting is only urgent while nobody has accepted it.
  const urgent = order.status === "placed" && age.minutes >= 5;
  const warm = order.status === "placed" && age.minutes >= 2;

  return (
    <article className={`card p-3 ${urgent ? "border-bad border-2" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">#{order.orderNumber}</span>
        <span className={`tag ${urgent ? "bg-bad-bg text-bad" : warm ? "bg-warn-bg text-warn" : "bg-surface text-ink-soft"}`}>
          {order.status === "placed" ? `${age.label} waiting`
            : order.readyAt
              ? `ready ${new Date(order.readyAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
              : age.label}
        </span>
      </div>

      <p className="text-xs text-ink-soft mt-1">
        {order.fulfilment === "delivery" ? "Delivery" : "Collection"} ·{" "}
        {order.payment.status === "paid" ? "paid"
          : order.payment.method === "card" ? "card, unpaid" : "pay on collection"}
        {" · "}{order.customer.name}
      </p>

      <ul className="mt-2 space-y-1.5">
        {order.lines.map((line, i) => (
          <li key={i} className="text-sm">
            <span>{line.quantity} × {line.name}</span>
            {line.choices.length > 0 && (
              // Changes are what get missed, so they are the loud part.
              <span className="text-bad font-medium ml-2">
                {line.choices.map((c) => c.optionName).join(", ")}
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="text-xs bg-surface rounded p-2 mt-2">{order.notes}</p>
      )}

      {order.fulfilment === "delivery" && order.address?.line1 && (
        <p className="text-xs text-ink-soft mt-2">
          {order.address.line1}, {order.address.postcode}
        </p>
      )}

      <p className="text-xs text-ink-soft mt-2">{money(order.total)}</p>

      {order.status === "placed" && (
        <div className="mt-3">
          <div className="flex gap-1.5 mb-2">
            {[10, 15, 20, 30].map((m) => (
              <button key={m} onClick={() => setReadyIn(m)}
                className={`${readyIn === m ? "chip-on" : "chip"} flex-1 justify-center px-0`}>
                {m}m
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => onAccept(readyIn)} className="btn-primary flex-1 h-10">Accept</button>
            <button onClick={onReject} className="btn-ghost w-11 h-10 px-0" aria-label="Reject">✕</button>
          </div>
        </div>
      )}

      {order.status === "accepted" && (
        <button onClick={onPreparing} className="btn-ghost w-full mt-3 h-10">Start preparing</button>
      )}

      {order.status === "preparing" && (
        <button onClick={onReady} className="btn-primary w-full mt-3 h-10">
          {order.fulfilment === "delivery" ? "Out for delivery" : "Mark ready"}
        </button>
      )}

      {(order.status === "ready" || order.status === "out_for_delivery") && (
        <button onClick={onComplete} className="btn-ghost w-full mt-3 h-10">
          {order.fulfilment === "delivery" ? "Delivered" : "Collected"}
        </button>
      )}
    </article>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="max-w-sm mx-auto text-center py-24 px-6">{children}</div>;
}
