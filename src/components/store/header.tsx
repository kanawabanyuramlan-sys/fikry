"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, User, Heart, ShoppingBag, Menu, X, ChevronDown, ChevronRight, ArrowRight } from "@/components/icons";
import { useShop } from "@/components/providers/shop";
import { ProductIllustration } from "@/components/illustration";
import { cn } from "@/lib/utils";

export type NavCategory = { name: string; slug: string; illustration: string | null; image: string | null; children: { name: string; slug: string }[] };
type Menu = {
  key: string;
  label: string;
  href: string;
  accent?: boolean;
  columns?: { title: string; links: { label: string; href: string }[] }[];
  feature?: { title: string; href: string; illustration: string; image: string | null };
};

export function Logo({ name, logo, className }: { name: string; logo?: string; className?: string }) {
  if (logo) return <Image src={logo} alt={name} width={120} height={32} className={cn("h-8 w-auto", className)} />;
  return (
    <span className={cn("flex items-baseline gap-1 font-serif text-[30px] leading-none tracking-[.01em]", className)}>
      {name}
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand" />
    </span>
  );
}

export function SiteHeader({
  storeName,
  logo,
  categories,
  brands,
  customerName,
}: {
  storeName: string;
  logo?: string;
  categories: NavCategory[];
  brands: { name: string; slug: string }[];
  customerName: string | null;
}) {
  const shop = useShop();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);
  const [mobileSection, setMobileSection] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setOpen(null);
    setMobile(false);
    setSearchOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 30);
  }, [searchOpen]);
  useEffect(() => {
    document.body.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setSearchOpen(false);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const genderCols = (g: "men" | "women") => [
    {
      title: "Shop by category",
      links: categories.map((c) => ({ label: c.name, href: `/${g}?type=${c.slug}` })),
    },
    {
      title: "Highlights",
      links: [
        { label: "New Arrivals", href: `/${g}?sort=newest` },
        { label: "Most Popular", href: `/${g}?sort=popular` },
        { label: "On Sale", href: `/${g}?discount=1` },
        { label: `All ${g === "men" ? "Men" : "Women"}`, href: `/${g}` },
      ],
    },
  ];

  const menus: Menu[] = [
    { key: "home", label: "Home", href: "/" },
    { key: "new", label: "New Arrivals", href: "/new-arrivals" },
    { key: "men", label: "Men", href: "/men", columns: genderCols("men"), feature: { title: "Men's essentials", href: "/men", illustration: "jacket", image: "/samples/hero-apparel.jpg" } },
    { key: "women", label: "Women", href: "/women", columns: genderCols("women"), feature: { title: "Women's picks", href: "/women", illustration: "bag", image: "/samples/shoulder-bag.jpg" } },
    ...categories.map<Menu>((c) => ({
      key: c.slug,
      label: c.name,
      href: `/c/${c.slug}`,
      columns: c.children.length
        ? [
            ...chunk(c.children, 6).map((links, i) => ({
              title: i === 0 ? c.name : "",
              links: links.map((l) => ({ label: l.name, href: `/c/${l.slug}` })),
            })),
          ]
        : undefined,
      feature: { title: `Shop all ${c.name}`, href: `/c/${c.slug}`, illustration: c.illustration ?? "accessory", image: c.image },
    })),
    {
      key: "brands",
      label: "Brands",
      href: "/brands",
      columns: chunk(brands, 6).map((links, i) => ({
        title: i === 0 ? "All brands" : "",
        links: links.map((b) => ({ label: b.name, href: `/brands/${b.slug}` })),
      })),
    },
    { key: "sale", label: "Sale", href: "/sale", accent: true },
  ];

  const hover = (key: string | null) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (key === null) closeTimer.current = setTimeout(() => setOpen(null), 120);
    else setOpen(key);
  };
  const active = menus.find((m) => m.key === open && m.columns?.length);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/shop?q=${encodeURIComponent(q.trim())}`);
    setSearchOpen(false);
  };

  return (
    <header className={cn("sticky top-0 z-40 border-b bg-paper/90 backdrop-blur-md transition-shadow", scrolled ? "border-ink/10 shadow-soft" : "border-transparent")}>
      <div className="container-x flex h-16 items-center gap-3 lg:h-[72px]">
        <button className="btn-ghost -ml-2 grid h-10 w-10 place-items-center rounded-full lg:hidden" aria-label="Buka menu" onClick={() => setMobile(true)}>
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" aria-label={`${storeName} home`} className="shrink-0">
          <Logo name={storeName} logo={logo} />
        </Link>
        <nav className="ml-6 hidden h-full items-stretch lg:flex" aria-label="Main">
          {menus.map((m) => (
            <div key={m.key} className="flex" onMouseEnter={() => hover(m.columns?.length ? m.key : null)} onMouseLeave={() => hover(null)}>
              <Link
                href={m.href}
                aria-expanded={m.columns ? open === m.key : undefined}
                onFocus={() => m.columns && setOpen(m.key)}
                className={cn(
                  "relative flex items-center whitespace-nowrap px-2 text-[13px] font-semibold transition xl:px-3",
                  m.accent ? "text-sale" : "text-ink/80 hover:text-ink",
                  (open === m.key || (m.href !== "/" && pathname.startsWith(m.href)) || (m.href === "/" && pathname === "/")) &&
                    "text-ink after:absolute after:inset-x-2.5 after:bottom-0 after:h-[2px] after:rounded-full after:bg-brand",
                )}
              >
                {m.label}
              </Link>
            </div>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label="Cari" onClick={() => setSearchOpen((v) => !v)}>
            <Search className="h-5 w-5" />
          </button>
          <Link href={customerName ? "/account" : "/account/login"} className="hidden h-10 items-center gap-2 rounded-full px-2.5 hover:bg-ink/5 sm:flex" aria-label="Akun">
            <User className="h-5 w-5" />
            <span className="hidden max-w-[90px] truncate text-xs font-semibold xl:inline">{customerName ? customerName.split(" ")[0] : "Login"}</span>
          </Link>
          <Link href="/wishlist" className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label="Wishlist">
            <Heart className="h-5 w-5" />
            {shop.ready && shop.wishlist.length > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-dark px-1 text-[9px] font-bold text-paper">
                {shop.wishlist.length}
              </span>
            )}
          </Link>
          <button onClick={() => shop.setCartOpen(true)} className="relative grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5" aria-label={`Keranjang, ${shop.count} item`}>
            <ShoppingBag className="h-5 w-5" />
            {shop.ready && shop.count > 0 && (
              <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand px-1 text-[9px] font-bold text-paper">
                {shop.count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mega menu */}
      {active && (
        <div className="absolute inset-x-0 top-full hidden border-t border-rule bg-paper shadow-lift lg:block" onMouseEnter={() => hover(active.key)} onMouseLeave={() => hover(null)}>
          <div className="container-x grid animate-fade-up grid-cols-[1fr_320px] gap-10 py-9">
            <div className="flex flex-wrap gap-x-16 gap-y-6">
              {active.columns!.map((col, i) => (
                <div key={i} className="min-w-[160px]">
                  <p className="eyebrow mb-4 h-4">{col.title}</p>
                  <ul className="space-y-2.5">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <Link href={l.href} className="text-sm text-ink/75 transition hover:text-ink hover:underline hover:underline-offset-4">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {active.feature && (
              <Link href={active.feature.href} className="group relative overflow-hidden rounded-2xl bg-surface">
                <div className="relative h-48 overflow-hidden">
                  {active.feature.image ? (
                    <Image src={active.feature.image} alt="" fill sizes="320px" className="object-cover transition duration-700 group-hover:scale-105" />
                  ) : (
                    <ProductIllustration type={active.feature.illustration} caption={false} className="h-full w-full" />
                  )}
                </div>
                <div className="flex items-center justify-between px-5 pb-5">
                  <span className="text-sm font-bold">{active.feature.title}</span>
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Search */}
      {searchOpen && (
        <div className="absolute inset-x-0 top-full border-t border-ink/5 bg-card shadow-lift">
          <form onSubmit={submitSearch} className="container-x flex items-center gap-3 py-5" role="search">
            <Search className="h-5 w-5 text-ink-soft" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari produk, brand, atau kategori…"
              className="h-12 flex-1 bg-transparent text-lg font-medium outline-none placeholder:text-ink-soft/60"
              aria-label="Kata kunci pencarian"
            />
            <button className="btn btn-primary btn-sm" type="submit">
              Cari
            </button>
            <button type="button" aria-label="Tutup pencarian" onClick={() => setSearchOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
              <X className="h-5 w-5" />
            </button>
          </form>
          <div className="container-x flex flex-wrap gap-2 pb-5">
            {["Sneakers", "Hoodie", "Backpack", "Slide", "Watch"].map((t) => (
              <Link key={t} href={`/shop?q=${t}`} className="chip">
                {t}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {mobile && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobile(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm animate-fade-up flex-col bg-card">
            <div className="flex h-16 items-center justify-between border-b border-ink/10 px-4">
              <Logo name={storeName} logo={logo} />
              <button aria-label="Tutup menu" onClick={() => setMobile(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Mobile">
              {menus.map((m) => (
                <div key={m.key} className="border-b border-ink/5">
                  {m.columns?.length ? (
                    <>
                      <button
                        className="flex w-full items-center justify-between px-3 py-3.5 text-left text-[15px] font-semibold"
                        aria-expanded={mobileSection === m.key}
                        onClick={() => setMobileSection(mobileSection === m.key ? null : m.key)}
                      >
                        {m.label}
                        <ChevronDown className={cn("h-4 w-4 transition", mobileSection === m.key && "rotate-180")} />
                      </button>
                      {mobileSection === m.key && (
                        <div className="pb-3 pl-3">
                          <Link href={m.href} className="flex items-center gap-1 px-3 py-2 text-sm font-semibold text-brand-dark">
                            Lihat semua <ChevronRight className="h-4 w-4" />
                          </Link>
                          {m.columns.flatMap((c) => c.links).map((l) => (
                            <Link key={l.href} href={l.href} className="block px-3 py-2 text-sm text-ink/75">
                              {l.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <Link href={m.href} className={cn("block px-3 py-3.5 text-[15px] font-semibold", m.accent && "text-sale")}>
                      {m.label}
                    </Link>
                  )}
                </div>
              ))}
            </nav>
            <div className="grid grid-cols-2 gap-2 border-t border-ink/10 p-4">
              <Link href={customerName ? "/account" : "/account/login"} className="btn btn-outline btn-sm">
                <User className="h-4 w-4" /> {customerName ? "Akun saya" : "Login"}
              </Link>
              <Link href="/track" className="btn btn-outline btn-sm">
                Lacak pesanan
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}
