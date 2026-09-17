"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, ApiError, type PricingProblem, type QuoteResponse } from "@/lib/api";
import { toQuoteLines, useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { rememberOrder } from "@/lib/recentOrders";
import { useUser } from "@/lib/useUser";

type Fulfilment = "collection" | "delivery";
type Payment = "card" | "on_collection";

export function CheckoutForm() {
  const router = useRouter();
  const { lines, clear } = useCart();
  const { user } = useUser();

  const [fulfilment, setFulfilment] = useState<Fulfilment>("collection");
  const [payment, setPayment] = useState<Payment>("on_collection");
  const [form, setForm] = useState({
    name: "", phone: "", email: "",
    line1: "", line2: "", postcode: "", addressNotes: "", notes: "",
  });
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<PricingProblem[]>([]);

  /**
   * One key per visit to this page, not per click.
   *
   * If the connection drops after the server created the order but before the
   * reply arrives, pressing Pay again sends the same key and the API returns
   * the order it already made. A fresh key per click would create a duplicate,
   * which is exactly the bug this is here to prevent.
   */
  const idempotencyKey = useMemo(
    () => (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `key-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    []
  );

  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name }));
  }, [user]);

  const cardsAvailable = quote?.paymentsEnabled ?? true;

  // Delivery must be paid up front, so nobody is out of pocket for a refusal
  // at the door. Switching to delivery moves the choice for you.
  useEffect(() => {
    if (fulfilment === "delivery" && cardsAvailable) setPayment("card");
    if (!cardsAvailable) setPayment("on_collection");
  }, [fulfilment, cardsAvailable]);

  useEffect(() => {
    if (lines.length === 0) return;
    api.quote(toQuoteLines(lines), fulfilment)
      .then(setQuote)
      .catch((e) => setError(e instanceof ApiError ? e.message : "Could not price this order."));
  }, [lines, fulfilment]);

  if (lines.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <p className="text-sm text-ink-soft">There is nothing in your cart yet.</p>
        <Link href="/menu" className="btn-primary mt-4 px-6">Browse the menu</Link>
      </div>
    );
  }

  const deliveryReady = fulfilment === "collection" || (form.line1.trim() && form.postcode.trim());
  const canSubmit =
    Boolean(quote?.complete) && Boolean(quote?.storeOpen) &&
    !(fulfilment === "delivery" && !cardsAvailable) &&
    form.name.trim().length > 0 && form.phone.trim().length >= 6 &&
    Boolean(deliveryReady) && !submitting;

  async function submit() {
    setSubmitting(true);
    setError(null);
    setProblems([]);
    try {
      const { order, checkoutUrl } = await api.createOrder({
        lines: toQuoteLines(lines),
        fulfilment,
        customer: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
        },
        ...(fulfilment === "delivery"
          ? {
              address: {
                line1: form.line1.trim(),
                line2: form.line2.trim() || undefined,
                postcode: form.postcode.trim(),
                notes: form.addressNotes.trim() || undefined,
              },
            }
          : {}),
        paymentMethod: payment,
        notes: form.notes.trim() || undefined,
        source: "menu",
        idempotencyKey,
      });

      rememberOrder(order);
      clear();

      // Card orders go to Stripe and come back to the tracking page. The order
      // already exists, unpaid; if they abandon the payment it expires by itself.
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      router.push(`/orders/${order.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
        const body = e.body as { problems?: PricingProblem[] } | undefined;
        if (body?.problems) setProblems(body.problems);
      } else {
        setError("Could not place the order.");
      }
      setSubmitting(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:grid lg:grid-cols-[1fr,400px] lg:gap-10 lg:items-start">
      <div>
        <h1 className="text-2xl font-medium mb-6">Checkout</h1>

        <section aria-labelledby="how" className="mb-8">
          <h2 id="how" className="text-sm font-medium mb-3">How would you like it?</h2>
          <div className="grid grid-cols-2 gap-3">
            <Choice
              on={fulfilment === "collection"} onClick={() => setFulfilment("collection")}
              title="Collection"
              sub={quote ? `Ready in about ${quote.prepTimeMinutes} minutes · free` : "Free"}
            />
            <Choice
              on={fulfilment === "delivery"} onClick={() => setFulfilment("delivery")}
              title="Delivery"
              sub={quote?.deliveryFee ? `${money(quote.deliveryFee)} · within 2 miles` : "Within 2 miles"}
            />
          </div>
        </section>

        {fulfilment === "delivery" && (
          <section aria-labelledby="addr" className="mb-8">
            <h2 id="addr" className="text-sm font-medium mb-3">Deliver to</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Postcode" value={form.postcode} onChange={set("postcode")} required />
              <Field label="Address line 1" value={form.line1} onChange={set("line1")} required />
              <Field label="Flat, building (optional)" value={form.line2} onChange={set("line2")} />
              <Field label="Buzzer or gate code (optional)" value={form.addressNotes} onChange={set("addressNotes")} />
            </div>
          </section>
        )}

        <section aria-labelledby="you" className="mb-8">
          <h2 id="you" className="text-sm font-medium mb-3">Your details</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name" value={form.name} onChange={set("name")} required />
            <Field label="Phone" value={form.phone} onChange={set("phone")} type="tel" required />
            <Field label="Email for the receipt (optional)" value={form.email}
              onChange={set("email")} type="email" className="sm:col-span-2" />
            <Field label="Notes for the kitchen (optional)" value={form.notes}
              onChange={set("notes")} className="sm:col-span-2" />
          </div>
        </section>

        <section aria-labelledby="pay" className="mb-8">
          <h2 id="pay" className="text-sm font-medium mb-3">Payment</h2>
          <div className="grid grid-cols-2 gap-3">
            <Choice on={payment === "card"} onClick={() => cardsAvailable && setPayment("card")}
              disabled={!cardsAvailable}
              title="Card"
              sub={cardsAvailable ? "Handled by Stripe" : "Not available right now"} />
            <Choice
              on={payment === "on_collection"}
              onClick={() => fulfilment === "collection" && setPayment("on_collection")}
              disabled={fulfilment === "delivery"}
              title="Pay on collection"
              sub={fulfilment === "delivery" ? "Not for delivery" : "Pay at the counter"}
            />
          </div>
          {payment === "card" && (
            <p className="text-xs text-ink-muted mt-3">
              You will be taken to Stripe to pay, then brought back to track your order.
              In test mode, card 4242 4242 4242 4242 with any future date works.
            </p>
          )}
          {fulfilment === "delivery" && !cardsAvailable && (
            <p role="alert" className="text-xs text-bad mt-3">
              Delivery needs card payment, which is unavailable at the moment. Please choose collection.
            </p>
          )}
        </section>
      </div>

      <aside className="card p-5 lg:sticky lg:top-24">
        <h2 className="text-base font-medium mb-3">Your order</h2>

        <div className="divide-y divide-line">
          {(quote?.lines ?? []).map((l, i) => (
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

        <div className="border-t border-line pt-3 mt-3 space-y-1.5">
          <Row label="Subtotal" value={quote ? money(quote.subtotal) : "…"} />
          <Row
            label={fulfilment === "delivery" ? "Delivery" : "Collection"}
            value={quote ? (quote.deliveryFee ? money(quote.deliveryFee) : "Free") : "…"}
          />
        </div>

        <div className="flex justify-between items-baseline mt-4">
          <span className="text-lg font-medium">Total</span>
          <span className="text-lg font-medium">{quote ? money(quote.total) : "…"}</span>
        </div>

        {(error || problems.length > 0) && (
          <div role="alert" className="mt-4 rounded-lg bg-bad-bg text-bad p-3 text-sm">
            {error && <p>{error}</p>}
            {problems.length > 0 && (
              <ul className="mt-1.5 space-y-0.5 text-xs">
                {problems.map((p, i) => <li key={i}>{p.detail}</li>)}
              </ul>
            )}
          </div>
        )}

        {quote && !quote.complete && (
          <p className="mt-4 text-xs text-warn">
            Some items still need a choice.{" "}
            <Link href="/cart" className="underline">Go back to the cart</Link>.
          </p>
        )}

        <button onClick={submit} disabled={!canSubmit} className="btn-primary w-full mt-4">
          {submitting ? "Placing your order…"
            : payment === "card" ? `Pay ${quote ? money(quote.total) : ""}`
            : "Place order"}
        </button>

        <p className="text-xs text-ink-muted mt-3 text-center">
          Prices come from the live menu, never from this page.
        </p>
      </aside>
    </div>
  );
}

function Choice({ on, onClick, title, sub, disabled }: {
  on: boolean; onClick: () => void; title: string; sub: string; disabled?: boolean;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} aria-pressed={on}
      className={`text-left rounded-lg p-3 border transition
        ${on ? "border-accent border-2" : "border-line hover:border-line-strong"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span className={`block text-sm ${on ? "font-medium" : "text-ink-soft"}`}>{title}</span>
      <span className="block text-xs text-ink-muted mt-0.5">{sub}</span>
    </button>
  );
}

function Field({ label, className = "", required, ...props }: {
  label: string; className?: string; required?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="sr-only">{label}</span>
      <input
        {...props} required={required} placeholder={label}
        className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm
                   placeholder:text-ink-muted"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm text-ink-soft">
      <span>{label}</span><span>{value}</span>
    </div>
  );
}
