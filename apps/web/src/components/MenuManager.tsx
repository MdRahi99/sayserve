"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type MenuItem, type OptionGroup } from "@/lib/api";
import { CATEGORY_LABELS, money } from "@/lib/format";
import { useUser } from "@/lib/useUser";
import { StaffNav } from "./StaffNav";

/**
 * The menu manager.
 *
 * Staff see one control: sold out. That is the thing that happens twenty times
 * a shift, and it must not sit next to a price field. Prices, new items and
 * deletion are the owner's, and the API enforces that too — hiding a button is
 * a courtesy, not a permission.
 */
export function MenuManager() {
  const { user, loading } = useUser();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!user) return;
    api.admin.menu()
      .then((r) => { setItems(r.items); setGroups(r.optionGroups); })
      .catch((e: ApiError) => setError(e.message));
  }, [user]);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
    return [...counts.entries()].sort();
  }, [items]);

  const shown = category === "all" ? items : items.filter((i) => i.category === category);

  async function toggle(item: MenuItem) {
    setBusy(item.slug);
    try {
      const { item: updated } = await api.admin.setAvailability(item.slug, !item.available);
      setItems((prev) => prev.map((i) => (i.slug === updated.slug ? updated : i)));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not change that.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(item: MenuItem) {
    if (!confirm(`Delete ${item.name}? Past orders keep their own copy, so receipts are safe.`)) return;
    try {
      const res = await api.admin.deleteItem(item.slug);
      setItems((prev) => prev.filter((i) => i.slug !== item.slug));
      setError(res.warning ? `Deleted, but note: ${res.warning}` : null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not delete that.");
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
      <StaffNav active="menu" />

      <div className="px-4 lg:px-6 py-5">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <h1 className="text-xl font-medium">Menu</h1>
            <p className="text-sm text-ink-soft mt-0.5">
              {items.length} items · {items.filter((i) => !i.available).length} sold out
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setEditing({} as MenuItem)} className="btn-ghost h-10 px-4 text-sm">
              Add item
            </button>
          )}
        </div>

        {!isAdmin && (
          <p className="tag bg-accent-bg text-accent mb-4">
            Staff can mark items sold out. Prices are the owner&apos;s.
          </p>
        )}

        {error && <p role="alert" className="text-sm text-bad mb-4">{error}</p>}

        <div className="flex gap-2 overflow-x-auto pb-3">
          <button onClick={() => setCategory("all")}
            className={category === "all" ? "chip-on shrink-0" : "chip shrink-0"}>
            All {items.length}
          </button>
          {categories.map(([slug, count]) => (
            <button key={slug} onClick={() => setCategory(slug)}
              className={category === slug ? "chip-on shrink-0" : "chip shrink-0"}>
              {CATEGORY_LABELS[slug] ?? slug} {count}
            </button>
          ))}
        </div>

        <div className="card mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-muted border-b border-line">
                <th className="px-4 py-2.5 font-normal">Item</th>
                <th className="px-4 py-2.5 font-normal">Price</th>
                <th className="px-4 py-2.5 font-normal hidden md:table-cell">Options</th>
                <th className="px-4 py-2.5 font-normal hidden lg:table-cell">Tags</th>
                <th className="px-4 py-2.5 font-normal">Available</th>
                {isAdmin && <th className="px-4 py-2.5 font-normal"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((item) => (
                <tr key={item.slug} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-ink-muted">{item.slug}</p>
                  </td>
                  <td className="px-4 py-3">{money(item.basePrice)}</td>
                  <td className="px-4 py-3 text-ink-soft hidden md:table-cell">
                    {item.optionGroups.length
                      ? `${item.optionGroups.length} group${item.optionGroups.length === 1 ? "" : "s"}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft hidden lg:table-cell">
                    {item.tags.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      role="switch" aria-checked={item.available}
                      aria-label={`${item.name} available`}
                      disabled={busy === item.slug}
                      onClick={() => toggle(item)}
                      className={`w-11 h-6 rounded-full transition relative
                        ${item.available ? "bg-ok" : "bg-line-strong"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all
                        ${item.available ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => setEditing(item)}
                        className="text-xs text-accent hover:underline">Edit</button>
                      <button onClick={() => remove(item)}
                        className="text-xs text-ink-muted hover:underline ml-3">Delete</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && isAdmin && (
        <ItemEditor
          item={editing} groups={groups}
          onClose={() => setEditing(null)}
          onSaved={(saved) =>
            setItems((prev) =>
              prev.some((i) => i.slug === saved.slug)
                ? prev.map((i) => (i.slug === saved.slug ? saved : i))
                : [...prev, saved])}
        />
      )}
    </div>
  );
}

function ItemEditor({ item, groups, onClose, onSaved }: {
  item: MenuItem;
  groups: OptionGroup[];
  onClose: () => void;
  onSaved: (item: MenuItem) => void;
}) {
  const isNew = !item.slug;
  const [form, setForm] = useState({
    slug: item.slug ?? "",
    name: item.name ?? "",
    category: item.category ?? "burgers",
    description: item.description ?? "",
    basePrice: String(item.basePrice ?? ""),
    aliases: (item.aliases ?? []).join(", "),
    tags: (item.tags ?? []).join(", "),
    allergens: (item.allergens ?? []).join(", "),
    optionGroups: item.optionGroups ?? [],
    popular: item.popular ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const list = (s: string) => s.split(",").map((t) => t.trim()).filter(Boolean);

  async function save() {
    setSaving(true);
    setError(null);
    const payload = {
      ...(isNew ? { slug: form.slug.trim() } : {}),
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      basePrice: Number(form.basePrice),
      aliases: list(form.aliases),
      tags: list(form.tags),
      allergens: list(form.allergens),
      optionGroups: form.optionGroups,
      popular: form.popular,
    };
    try {
      const { item: saved } = isNew
        ? await api.admin.createItem(payload as Partial<MenuItem>)
        : await api.admin.updateItem(item.slug, payload as Partial<MenuItem>);
      onSaved(saved);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save that.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-end sm:items-center justify-center p-0 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-title"
        className="bg-card w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line sticky top-0 bg-card">
          <h2 id="edit-title" className="text-base font-medium">
            {isNew ? "New item" : `Edit ${item.name}`}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-ink-soft">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name" value={form.name}
              onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Price in pounds" value={form.basePrice} type="number"
              onChange={(v) => setForm({ ...form, basePrice: v })} />
            {isNew && (
              <Field label="Slug (lower case, hyphens)" value={form.slug}
                onChange={(v) => setForm({ ...form, slug: v })} />
            )}
            <label className="block">
              <span className="text-xs text-ink-soft">Category</span>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm mt-1">
                {Object.entries(CATEGORY_LABELS).map(([slug, label]) => (
                  <option key={slug} value={slug}>{label}</option>
                ))}
              </select>
            </label>
          </div>

          <Field label="Description" value={form.description}
            onChange={(v) => setForm({ ...form, description: v })} />

          <Field
            label="Aliases — what customers call it, comma separated"
            value={form.aliases}
            onChange={(v) => setForm({ ...form, aliases: v })}
            hint="Worth the effort: these are what makes “chips” find Fries."
          />

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Tags, comma separated" value={form.tags}
              onChange={(v) => setForm({ ...form, tags: v })} />
            <Field label="Allergens, comma separated" value={form.allergens}
              onChange={(v) => setForm({ ...form, allergens: v })} />
          </div>

          <div>
            <span className="text-xs text-ink-soft">Option groups</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {groups.map((g) => {
                const on = form.optionGroups.includes(g.groupId);
                return (
                  <button key={g.groupId} type="button"
                    onClick={() => setForm({
                      ...form,
                      optionGroups: on
                        ? form.optionGroups.filter((id) => id !== g.groupId)
                        : [...form.optionGroups, g.groupId],
                    })}
                    className={on ? "chip-on" : "chip"}>
                    {g.name}
                    <span className="ml-1 opacity-70">
                      {g.min > 0 ? `${g.min}–${g.max}` : `0–${g.max}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink-muted mt-2">
              A group with a minimum of 1 makes this item unorderable until the customer chooses.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.popular}
              onChange={(e) => setForm({ ...form, popular: e.target.checked })} />
            Show under Popular
          </label>

          {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-line flex gap-3 sticky bottom-0 bg-card">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : isNew ? "Create item" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", hint }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-ink-soft">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        step={type === "number" ? "0.01" : undefined}
        className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm mt-1" />
      {hint && <span className="text-xs text-ink-muted mt-1 block">{hint}</span>}
    </label>
  );
}
