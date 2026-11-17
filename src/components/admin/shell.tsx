"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Package, FolderTree, Tag, Boxes, ShoppingCart, Users, Star, LifeBuoy, Megaphone, Ticket,
  UsersRound, ShieldCheck, History, Settings, UserCircle, Menu, X, ExternalLink, LogOut,
} from "@/components/icons";
import { ActionButton } from "@/components/forms";
import { staffLogout } from "@/app/admin/actions/auth";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS = {
  overview: LayoutDashboard, products: Package, categories: FolderTree, brands: Tag, inventory: Boxes, orders: ShoppingCart,
  customers: Users, reviews: Star, complaints: LifeBuoy, promotions: Megaphone, coupons: Ticket, team: UsersRound,
  roles: ShieldCheck, activity: History, settings: Settings, account: UserCircle,
};
export type NavItem = { key: keyof typeof ICONS; label: string; href: string; badge?: number; group: string };

export function AdminShell({
  nav,
  user,
  storeName,
  children,
}: {
  nav: NavItem[];
  user: { name: string; role: string; email: string };
  storeName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const groups = [...new Set(nav.map((n) => n.group))];
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand-dark text-sm font-extrabold text-brand-lime">{storeName.slice(0, 1)}</span>
        <span className="text-lg font-extrabold tracking-tight">{storeName}</span>
        <span className="ml-1 rounded-md bg-brand-light px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand-dark">Admin</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3" aria-label="Admin">
        {groups.map((g) => (
          <div key={g}>
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-ink-soft/80">{g}</p>
            <ul className="space-y-0.5">
              {nav
                .filter((n) => n.group === g)
                .map((n) => {
                  const Icon = ICONS[n.key];
                  const active = isActive(n.href);
                  return (
                    <li key={n.href}>
                      <Link
                        href={n.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
                          active ? "bg-brand-dark text-paper" : "text-ink/75 hover:bg-ink/5 hover:text-ink",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                        <span className="flex-1">{n.label}</span>
                        {!!n.badge && (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", active ? "bg-card/20" : "bg-brand-lime text-ink")}>{n.badge}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-ink/10 p-3">
        <Link href="/admin/account" className="flex items-center gap-3 rounded-xl p-2 hover:bg-ink/5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-light text-xs font-bold text-brand-dark">{initials(user.name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            <span className="block truncate text-xs text-ink-soft">{user.role}</span>
          </span>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-off">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-ink/10 bg-card lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-fade-up bg-card shadow-lift">{sidebar}</aside>
        </div>
      )}
      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink/10 bg-card/90 px-4 backdrop-blur sm:px-6">
          <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5 lg:hidden" aria-label="Menu" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm text-ink-soft">
            Masuk sebagai <b className="text-ink">{user.name}</b> · {user.role}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/" target="_blank" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              <ExternalLink className="h-4 w-4" /> Lihat toko
            </Link>
            <ActionButton action={staffLogout} className="btn-outline btn-sm">
              <LogOut className="h-4 w-4" /> Keluar
            </ActionButton>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
      </div>
      {open && (
        <button className="fixed right-4 top-4 z-[60] grid h-10 w-10 place-items-center rounded-full bg-card shadow lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu">
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
