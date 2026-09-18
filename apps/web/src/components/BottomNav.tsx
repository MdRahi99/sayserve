"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";

/**
 * The phone tab bar from the wireframes.
 *
 * Phones only: on a desktop the header does this job and a fixed bar at the
 * bottom of a wide screen is just a bar. Hidden on the staff side too, where
 * the board wants every pixel of a tablet.
 */
const TABS = [
  { href: "/menu", label: "Menu" },
  { href: "/chat", label: "Chat" },
  { href: "/orders", label: "Orders" },
  { href: "/signin", label: "Account" },
];

export function BottomNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));

  useEffect(() => setMounted(true), []);

  if (pathname.startsWith("/staff")) return null;

  return (
    <nav
      aria-label="Sections"
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card border-t border-line
                 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center h-14 text-[11px]
                  ${active ? "text-ink font-medium" : "text-ink-muted"}`}
              >
                {tab.label}
                {tab.href === "/orders" && mounted && count > 0 && (
                  <span className="sr-only">, {count} items in your cart</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
