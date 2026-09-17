"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { closeSocket } from "@/lib/socket";
import { useUser } from "@/lib/useUser";

const TABS = [
  { key: "board", href: "/staff", label: "Board" },
  { key: "menu", href: "/staff/menu", label: "Menu" },
  { key: "dashboard", href: "/staff/dashboard", label: "Dashboard" },
  { key: "settings", href: "/staff/settings", label: "Settings" },
] as const;

export function StaffNav({ active }: { active: (typeof TABS)[number]["key"] }) {
  const { user } = useUser();
  const router = useRouter();

  async function signOut() {
    await api.auth.logout().catch(() => {});
    closeSocket();
    router.push("/staff/signin");
  }

  return (
    <div className="border-b border-line bg-card">
      <div className="px-4 lg:px-6 h-14 flex items-center justify-between gap-6">
        <nav className="flex items-center gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <Link key={tab.key} href={tab.href}
              className={`px-3 h-9 inline-flex items-center rounded-lg text-sm whitespace-nowrap
                ${active === tab.key ? "bg-surface font-medium" : "text-ink-soft hover:bg-surface/60"}`}>
              {tab.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 shrink-0">
          {user && (
            <span className="text-xs text-ink-soft hidden sm:inline">
              {user.name} · {user.role}
            </span>
          )}
          <button onClick={signOut} className="text-xs text-ink-muted hover:underline">Sign out</button>
        </div>
      </div>
    </div>
  );
}
