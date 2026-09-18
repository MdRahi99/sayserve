"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, type User } from "@/lib/api";
import { closeSocket } from "@/lib/socket";

/**
 * The name in the header was plain text with nothing behind it.
 *
 * Now it opens the obvious things: orders, and a way out. Signing out also
 * drops the socket, because it carries the old cookie and would otherwise stay
 * connected as someone who has just left.
 */
export function AccountMenu({ user, onSignedOut }: {
  user: User;
  onSignedOut: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    setBusy(true);
    await api.auth.logout().catch(() => {});
    closeSocket();
    onSignedOut();
    setOpen(false);
    setBusy(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={wrapper} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 h-10 px-2 rounded-lg hover:bg-surface text-sm"
      >
        <span className="w-7 h-7 rounded-full bg-surface grid place-items-center text-xs font-medium">
          {user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden sm:inline max-w-[9rem] truncate">{user.name}</span>
        <span aria-hidden className="text-ink-muted text-xs">▾</span>
      </button>

      {open && (
        <div role="menu"
          className="absolute right-0 top-12 w-56 card shadow-lg p-1.5 z-40">
          <div className="px-3 py-2 border-b border-line mb-1.5">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-ink-muted mt-0.5">
              {user.isDemo ? "Demo account" : user.role === "customer" ? "Customer" : user.role}
            </p>
          </div>

          <Link role="menuitem" href="/orders" onClick={() => setOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm hover:bg-surface">
            Your orders
          </Link>

          {["staff", "admin"].includes(user.role) && (
            <Link role="menuitem" href="/staff" onClick={() => setOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm hover:bg-surface">
              Kitchen board
            </Link>
          )}

          <button role="menuitem" onClick={signOut} disabled={busy}
            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface text-bad">
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
