"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import { closeSocket } from "@/lib/socket";

/**
 * Two buttons, so a visitor can see both sides in about thirty seconds.
 *
 * Each press makes a throwaway account that deletes itself after a day. The
 * staff one fills the kitchen board on the way in, because a board with nothing
 * on it demonstrates nothing.
 */
export function DemoBanner({ bare = false }: { bare?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"customer" | "staff" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enter(role: "customer" | "staff") {
    setBusy(role);
    setError(null);
    try {
      await api.auth.demo(role);
      closeSocket();
      if (role === "staff") {
        await api.admin.simulateRush(5).catch(() => {});
        router.push("/staff");
      } else {
        router.push("/menu");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not start the demo.");
      setBusy(null);
    }
  }

  return (
    <div className={bare ? "" : "mt-10 pt-6 border-t border-line"}>
      {!bare && (
        <p className="text-sm text-ink-soft">Just looking? Try it from either side.</p>
      )}
      <div className={`flex flex-wrap gap-3 ${bare ? "mt-6" : "mt-3"}`}>
        <button onClick={() => enter("customer")} disabled={busy !== null} className="btn-ghost px-5">
          {busy === "customer" ? "Setting up…" : "Try as a customer"}
        </button>
        <button onClick={() => enter("staff")} disabled={busy !== null} className="btn-ghost px-5">
          {busy === "staff" ? "Filling the kitchen…" : "Try as staff"}
        </button>
      </div>
      <p className="text-xs text-ink-muted mt-3">
        Demo accounts get their own sandbox and delete themselves after 24 hours.
      </p>
      {error && <p role="alert" className="text-xs text-bad mt-2">{error}</p>}
    </div>
  );
}
