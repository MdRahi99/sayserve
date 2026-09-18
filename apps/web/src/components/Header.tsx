"use client";

import { useCart } from "@/lib/cart";
import { useUser } from "@/lib/useUser";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const { user } = useUser();

  // The cart lives in localStorage, so the server render cannot know the count.
  // Showing it only after mount avoids a hydration mismatch.
  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-line h-16">
      <div className="h-full px-4 lg:px-8 flex items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-medium">
            SayServe
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-sm">
            <Link href="/menu" className="text-ink-soft hover:text-ink">
              Menu
            </Link>
            <Link href="/chat" className="text-ink-soft hover:text-ink">
              Just tell us
            </Link>
            <Link href="/orders" className="text-ink-soft hover:text-ink">
              Your orders
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline tag bg-ok-bg text-ok">
            Open until 23:00
          </span>
          {mounted &&
            (user ? (
              <span className="hidden sm:inline text-sm text-ink-soft">
                {user.name}
              </span>
            ) : (
              <Link
                href="/signin"
                className="hidden sm:inline text-sm text-ink-soft hover:text-ink"
              >
                Sign in
              </Link>
            ))}
          <Link href="/cart" className="btn-primary h-10 px-4">
            Cart{mounted && count > 0 ? ` · ${count}` : ""}
          </Link>
        </div>
      </div>
    </header>
  );
}
