"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";

export function SignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.push("/menu");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="max-w-sm mx-auto px-4 py-12">
      <h1 className="text-2xl font-medium">
        {mode === "login" ? "Sign in" : "Create an account"}
      </h1>
      <p className="text-sm text-ink-soft mt-1">
        You can also order as a guest — an account just keeps your history.
      </p>

      <div className="space-y-3 mt-6">
        {mode === "register" && (
          <Input placeholder="Name" value={form.name} onChange={set("name")} />
        )}
        <Input placeholder="Email" type="email" value={form.email} onChange={set("email")} />
        <Input placeholder="Password" type="password" value={form.password} onChange={set("password")} />
        {mode === "register" && (
          <Input placeholder="Phone (optional)" type="tel" value={form.phone} onChange={set("phone")} />
        )}
      </div>

      {error && <p role="alert" className="text-sm text-bad mt-3">{error}</p>}

      <button
        disabled={busy}
        onClick={() => go(() => mode === "login"
          ? api.auth.login(form.email, form.password)
          : api.auth.register({
              name: form.name, email: form.email, password: form.password,
              ...(form.phone ? { phone: form.phone } : {}),
            }))}
        className="btn-primary w-full mt-5"
      >
        {busy ? "Just a moment…" : mode === "login" ? "Sign in" : "Create account"}
      </button>

      <button
        onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
        className="text-sm text-accent hover:underline mt-4 block mx-auto"
      >
        {mode === "login" ? "No account? Create one" : "Already have an account? Sign in"}
      </button>

      <div className="flex items-center gap-3 my-6">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-muted">or try it</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button onClick={() => go(() => api.auth.demo("customer"))} disabled={busy} className="btn-ghost w-full">
        Try as a customer
      </button>
      <p className="text-xs text-ink-muted mt-3 text-center">
        A demo account gets its own sandbox, deleted after 24 hours.
      </p>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="sr-only">{props.placeholder}</span>
      <input {...props}
        className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm placeholder:text-ink-muted" />
    </label>
  );
}
