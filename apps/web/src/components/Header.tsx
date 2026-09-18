"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { useUser } from "@/lib/useUser";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const { user, setUser } = useUser();

  // The cart lives in localStorage, so the server render cannot know the count.
  // Showing it only after mount avoids a hydration mismatch.
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-line h-16">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-medium text-ink">
            <Logo />
            SayServe
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/menu" className="text-ink-soft hover:text-ink">Menu</Link>
            <Link href="/chat" className="text-ink-soft hover:text-ink">Just tell us</Link>
            <Link href="/orders" className="text-ink-soft hover:text-ink">Your orders</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline tag bg-ok-bg text-ok">Open until 23:00</span>
          {mounted && (
            user
              ? <AccountMenu user={user} onSignedOut={() => setUser(null)} />
              : <Link href="/signin" className="text-sm text-ink-soft hover:text-ink px-2">Sign in</Link>
          )}
          <Link href="/cart" className="btn-primary h-10 px-4">
            Cart{mounted && count > 0 ? ` · ${count}` : ""}
          </Link>
        </div>
      </div>
    </header>
  );
}
