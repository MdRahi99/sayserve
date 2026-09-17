"use client";

import { useEffect, useState } from "react";
import { api, ApiError, type StoreSettings } from "@/lib/api";
import { useUser } from "@/lib/useUser";
import { StaffNav } from "./StaffNav";

export function StoreSettingsPanel() {
  const { user, loading } = useUser();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [form, setForm] = useState<Partial<StoreSettings>>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    api.admin.settings()
      .then((r) => { setSettings(r.settings); setForm(r.settings); })
      .catch((e: ApiError) => setError(e.message));
  }, [user]);

  async function toggleOpen() {
    if (!settings) return;
    try {
      const { settings: next } = await api.admin.setOpen(!settings.isOpen);
      setSettings(next);
      setForm((f) => ({ ...f, isOpen: next.isOpen }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change that.");
    }
  }

  async function save() {
    setError(null);
    try {
      const { settings: next } = await api.admin.updateSettings({
        prepTimeMinutes: Number(form.prepTimeMinutes),
        deliveryEnabled: Boolean(form.deliveryEnabled),
        deliveryFee: Number(form.deliveryFee),
        deliveryRadiusMiles: Number(form.deliveryRadiusMiles),
        minDeliveryOrder: Number(form.minDeliveryOrder),
      });
      setSettings(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
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

  return (
    <div>
      <StaffNav active="settings" />

      <div className="px-4 lg:px-6 py-5 max-w-2xl">
        <h1 className="text-xl font-medium mb-5">Store settings</h1>
        {error && <p role="alert" className="text-sm text-bad mb-4">{error}</p>}

        <section className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">
                {settings?.isOpen ? "Taking orders" : "Not taking orders"}
              </h2>
              <p className="text-xs text-ink-soft mt-1">
                Closing stops new orders straight away. Orders already in the kitchen are unaffected.
              </p>
            </div>
            <button onClick={toggleOpen}
              className={settings?.isOpen ? "btn-ghost h-10 px-4 text-sm" : "btn-primary h-10 px-4 text-sm"}>
              {settings?.isOpen ? "Close" : "Open"}
            </button>
          </div>
        </section>

        <section className="card p-5 mt-4">
          <h2 className="text-sm font-medium">Timing and delivery</h2>
          {!isAdmin && (
            <p className="tag bg-accent-bg text-accent mt-3">
              Only the owner can change these.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Num label="Prep time shown to customers (minutes)" value={form.prepTimeMinutes}
              disabled={!isAdmin} onChange={(v) => setForm({ ...form, prepTimeMinutes: v })} />
            <Num label="Delivery fee (£)" value={form.deliveryFee} step="0.01"
              disabled={!isAdmin} onChange={(v) => setForm({ ...form, deliveryFee: v })} />
            <Num label="Delivery radius (miles)" value={form.deliveryRadiusMiles} step="0.5"
              disabled={!isAdmin} onChange={(v) => setForm({ ...form, deliveryRadiusMiles: v })} />
            <Num label="Minimum delivery order (£)" value={form.minDeliveryOrder} step="0.5"
              disabled={!isAdmin} onChange={(v) => setForm({ ...form, minDeliveryOrder: v })} />
          </div>

          <label className="flex items-center gap-2 text-sm mt-4">
            <input type="checkbox" disabled={!isAdmin} checked={Boolean(form.deliveryEnabled)}
              onChange={(e) => setForm({ ...form, deliveryEnabled: e.target.checked })} />
            Offer delivery
          </label>

          {isAdmin && (
            <div className="flex items-center gap-3 mt-5">
              <button onClick={save} className="btn-primary px-5">Save changes</button>
              {saved && <span className="text-sm text-ok">Saved.</span>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Num({ label, value, onChange, step = "1", disabled }: {
  label: string; value?: number; onChange: (v: number) => void; step?: string; disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink-soft">{label}</span>
      <input type="number" step={step} disabled={disabled} value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm mt-1
                   disabled:bg-surface disabled:text-ink-muted" />
    </label>
  );
}
