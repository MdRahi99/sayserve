"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type AssistantStats, type Stats, type StoreSettings } from "@/lib/api";
import { money } from "@/lib/format";
import { useUser } from "@/lib/useUser";
import { StaffNav } from "./StaffNav";

export function Dashboard() {
  const { user, loading } = useUser();
  const [days, setDays] = useState(1);
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [assistant, setAssistant] = useState<AssistantStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api.admin.stats(days).then(setStats).catch((e: ApiError) => setError(e.message));
  }, [user, days]);

  useEffect(() => {
    if (!user) return;
    api.admin.settings().then((r) => setSettings(r.settings)).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    api.admin.assistant(Math.max(days, 7)).then(setAssistant).catch(() => setAssistant(null));
  }, [user, days]);

  async function toggleOpen() {
    if (!settings) return;
    try {
      const { settings: next } = await api.admin.setOpen(!settings.isOpen);
      setSettings(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change that.");
    }
  }

  if (loading) return <p className="p-8 text-sm text-ink-soft">Checking who you are…</p>;
  if (!user || !["staff", "admin"].includes(user.role)) {
    return (
      <div className="max-w-sm mx-auto text-center py-24 px-6">
        <p className="text-sm text-ink-soft">This is the staff area.</p>
        <a href="/staff/signin" className="btn-primary mt-4 px-6">Staff sign in</a>
      </div>
    );
  }

  const busiest = stats?.ordersByHour.reduce((a, b) => (b.orders > a.orders ? b : a),
    { hour: 0, orders: 0 });
  const peak = Math.max(1, ...(stats?.ordersByHour.map((h) => h.orders) ?? [1]));

  // Trading hours only: a 24-bar chart of mostly zeroes reads as broken.
  const hours = (stats?.ordersByHour ?? []).filter((h) => h.hour >= 6 && h.hour <= 23);

  return (
    <div>
      <StaffNav active="dashboard" />

      <div className="px-4 lg:px-6 py-5 max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h1 className="text-xl font-medium">Dashboard</h1>
          <div className="flex items-center gap-2">
            {settings && (
              <button onClick={toggleOpen}
                className={`tag ${settings.isOpen ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"} h-8 px-3`}>
                {settings.isOpen ? "Open — tap to close" : "Closed — tap to open"}
              </button>
            )}
            {[1, 7, 30].map((d) => (
              <button key={d} onClick={() => setDays(d)} className={days === d ? "chip-on" : "chip"}>
                {d === 1 ? "Today" : `${d} days`}
              </button>
            ))}
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-bad mb-4">{error}</p>}

        {!stats ? (
          <div className="h-32 card animate-pulse" />
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Metric label={days === 1 ? "Sales today" : `Sales, ${days} days`} value={money(stats.sales)} />
              <Metric label="Orders" value={String(stats.orders)} />
              <Metric label="Average order" value={stats.orders ? money(stats.averageOrder) : "—"} />
              <Metric
                label="Average prep time"
                value={stats.averagePrepMinutes !== null ? `${stats.averagePrepMinutes} min` : "—"}
                note={stats.prepSampleSize
                  ? `from ${stats.prepSampleSize} completed`
                  : "no completed orders yet"}
              />
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mt-5">
              <section className="card p-5 lg:col-span-2">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-sm font-medium">Orders by hour</h2>
                  {busiest && busiest.orders > 0 && (
                    <span className="text-xs text-ink-soft">
                      Busiest at {busiest.hour}:00
                    </span>
                  )}
                </div>

                {stats.orders === 0 ? (
                  <p className="text-sm text-ink-muted py-10 text-center">
                    No orders in this period yet.
                  </p>
                ) : (
                  <div className="flex items-end gap-1 h-48 mt-5">
                    {hours.map((h) => (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1.5">
                        <div
                          className="w-full bg-ink rounded-sm min-h-[2px] transition-all"
                          style={{ height: `${(h.orders / peak) * 100}%` }}
                          title={`${h.hour}:00 — ${h.orders} order${h.orders === 1 ? "" : "s"}`}
                        />
                        <span className="text-[10px] text-ink-muted">{h.hour}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="card p-5">
                <h2 className="text-sm font-medium">Top items</h2>
                {stats.topItems.length === 0 ? (
                  <p className="text-sm text-ink-muted py-8 text-center">Nothing sold yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {stats.topItems.map((t) => (
                      <li key={t.name} className="py-2.5 flex items-baseline justify-between gap-3">
                        <span className="text-sm min-w-0 truncate">{t.name}</span>
                        <span className="text-sm text-ink-soft shrink-0">
                          {t.quantity}
                          <span className="text-xs text-ink-muted ml-2">{money(t.revenue)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="card p-5 mt-4">
              <h2 className="text-sm font-medium">Where orders ended up</h2>
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(stats.byStatus).length === 0 && (
                  <p className="text-sm text-ink-muted">Nothing yet.</p>
                )}
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <span key={status}
                    className={`tag h-7 px-3 ${
                      status === "completed" ? "bg-ok-bg text-ok"
                      : ["cancelled", "rejected", "expired"].includes(status) ? "bg-bad-bg text-bad"
                      : "bg-accent-bg text-accent"}`}>
                    {status.replace(/_/g, " ")} {count}
                  </span>
                ))}
              </div>
              <p className="text-xs text-ink-muted mt-3">
                Sales and averages count only orders that reached the kitchen, so a cancelled
                order does not flatter the numbers.
              </p>
            </section>

            <section className="card p-5 mt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-medium">Assistant</h2>
                {assistant && (
                  <span className="text-xs text-ink-muted">
                    last {assistant.days} days ·{" "}
                    {assistant.providers.model ?? "no model configured"}
                    {assistant.providers.vectorsBuilt > 0 &&
                      ` · ${assistant.providers.vectorsBuilt} items embedded`}
                  </span>
                )}
              </div>

              {!assistant || assistant.messages === 0 ? (
                <p className="text-sm text-ink-muted mt-3">
                  No messages yet. Try the assistant from the menu and this fills in.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    <Metric label="Messages" value={String(assistant.messages)} />
                    <Metric
                      label="Handled without the model"
                      value={`${assistant.withoutModelShare ?? 0}%`}
                      note={`${assistant.withoutModel} of ${assistant.messages}`}
                    />
                    <Metric label="Average response" value={`${assistant.avgMs} ms`} />
                    <Metric label="Blocked by safety rules" value={String(assistant.refusals)} />
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    {Object.entries(assistant.byRoute).map(([route, count]) => (
                      <span key={route} className={`tag h-7 px-3 ${
                        route === "refused" ? "bg-bad-bg text-bad"
                        : route === "unknown" ? "bg-warn-bg text-warn"
                        : route === "fast_path" ? "bg-ok-bg text-ok"
                        : "bg-surface text-ink-soft"}`}>
                        {route.replace(/_/g, " ")} {count}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-ink-muted mt-3">
                    &quot;Fast path&quot; means the message was understood without a language
                    model at all. That share is what keeps this cheap and quick.
                  </p>

                  {assistant.needsReview.length > 0 && (
                    <div className="mt-5 border-t border-line pt-4">
                      <h3 className="text-sm font-medium">Worth a look</h3>
                      <p className="text-xs text-ink-muted mt-1">
                        Messages it could not place, and ones it refused. The first kind
                        usually means a missing alias on the menu.
                      </p>
                      <ul className="mt-3 divide-y divide-line">
                        {assistant.needsReview.slice(0, 8).map((row, i) => (
                          <li key={i} className="py-2.5 flex items-baseline justify-between gap-3">
                            <span className="text-sm text-ink-soft min-w-0 truncate">
                              {row.reply}
                            </span>
                            <span className={`tag shrink-0 ${
                              row.route === "refused" ? "bg-bad-bg text-bad" : "bg-warn-bg text-warn"}`}>
                              {row.safetyRule ?? row.route}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="bg-surface rounded-xl p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="text-2xl font-medium mt-1.5">{value}</p>
      {note && <p className="text-xs text-ink-muted mt-1">{note}</p>}
    </div>
  );
}
