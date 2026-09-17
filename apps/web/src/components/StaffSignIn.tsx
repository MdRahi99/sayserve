"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { closeSocket } from "@/lib/socket";

export function StaffSignIn() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function go(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      // The old socket carries the old cookie, so drop it and let the board
      // open a fresh one that lands in the kitchen room.
      closeSocket();
      router.push("/staff");
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-medium">SayServe staff</h1>
      <p className="text-sm text-ink-soft mt-1">Kitchen and admin access.</p>

      <div className="space-y-3 mt-6">
        <input placeholder="Email" type="email" value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm" />
        <input placeholder="Password" type="password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full h-11 rounded-lg border border-line bg-card px-3 text-sm" />
      </div>

      {error && <p role="alert" className="text-sm text-bad mt-3">{error}</p>}

      <button disabled={busy} onClick={() => go(() => api.auth.login(form.email, form.password))}
        className="btn-primary w-full mt-5">
        {busy ? "Signing in…" : "Sign in"}
      </button>

      <div className="flex items-center gap-3 my-6">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-muted">or</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button disabled={busy} onClick={() => go(() => api.auth.demo("staff"))} className="btn-ghost w-full">
        Try as staff
      </button>
      <p className="text-xs text-ink-muted mt-3 text-center">
        A demo account gets its own sandbox, deleted after 24 hours.
      </p>
    </div>
  );
}
