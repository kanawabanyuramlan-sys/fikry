"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X, ChevronDown, Loader2 } from "@/components/icons";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Facets = {
  brands: { slug: string; name: string; count: number }[];
  colors: { name: string; hex: string | null; count: number }[];
  sizes: string[];
  types: { slug: string; name: string; count: number }[];
  price: { min: number; max: number };
};

const SORTS = [
  { v: "newest", l: "Terbaru" },
  { v: "popular", l: "Terpopuler" },
  { v: "price-asc", l: "Harga: rendah ke tinggi" },
  { v: "price-desc", l: "Harga: tinggi ke rendah" },
];

function useParamNav() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const list = (k: string) => (sp.get(k) || "").split(",").filter(Boolean);
  const push = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(sp.toString());
    mut(p);
    p.delete("page");
    const qs = p.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const toggle = (k: string, v: string) =>
    push((p) => {
      const cur = list(k);
      const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
      if (next.length) p.set(k, next.join(","));
      else p.delete(k);
    });
  const setOne = (k: string, v: string | null) => push((p) => (v ? p.set(k, v) : p.delete(k)));
  return { sp, list, push, toggle, setOne, pending, pathname };
}

export function SortSelect() {
  const { sp, setOne, pending } = useParamNav();
  return (
    <label className="flex items-center gap-2 text-sm">
      {pending && <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />}
      <span className="hidden text-ink-soft sm:inline">Urutkan</span>
      <span className="relative">
        <select
          value={sp.get("sort") || "newest"}
          onChange={(e) => setOne("sort", e.target.value === "newest" ? null : e.target.value)}
          className="h-10 w-[42vw] max-w-[220px] appearance-none truncate rounded-full border border-ink/15 bg-card pl-4 pr-9 text-sm font-semibold outline-none focus:border-brand sm:w-auto"
          aria-label="Urutkan produk"
        >
          {SORTS.map((s) => (
            <option key={s.v} value={s.v}>
              {s.l}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-3 h-4 w-4" />
      </span>
    </label>
  );
}

function Group({ title, children, open: initial = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(initial);
  return (
    <div className="border-b border-ink/10 py-5">
      <button className="flex w-full items-center justify-between text-left text-sm font-bold" aria-expanded={open} onClick={() => setOpen(!open)}>
        {title}
        <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-sm">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 rounded accent-brand-dark" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-ink-soft">{count}</span>}
    </label>
  );
}

function FilterBody({ facets, hide }: { facets: Facets; hide: { brand?: boolean; gender?: boolean } }) {
  const nav = useParamNav();
  const [min, setMin] = useState(nav.sp.get("min") || "");
  const [max, setMax] = useState(nav.sp.get("max") || "");
  useEffect(() => {
    setMin(nav.sp.get("min") || "");
    setMax(nav.sp.get("max") || "");
  }, [nav.sp]);
  return (
    <div>
      {facets.types.length > 0 && (
        <Group title="Kategori / Tipe">
          {facets.types.map((t) => (
            <Check key={t.slug} label={t.name} count={t.count} checked={nav.list("type").includes(t.slug)} onChange={() => nav.toggle("type", t.slug)} />
          ))}
        </Group>
      )}
      {!hide.brand && facets.brands.length > 0 && (
        <Group title="Brand">
          <div className="max-h-60 overflow-y-auto pr-1">
            {facets.brands.map((b) => (
              <Check key={b.slug} label={b.name} count={b.count} checked={nav.list("brand").includes(b.slug)} onChange={() => nav.toggle("brand", b.slug)} />
            ))}
          </div>
        </Group>
      )}
      <Group title="Harga">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            nav.push((p) => {
              const a = parseInt(min.replace(/\D/g, ""), 10);
              const b = parseInt(max.replace(/\D/g, ""), 10);
              if (Number.isFinite(a) && a > 0) p.set("min", String(a));
              else p.delete("min");
              if (Number.isFinite(b) && b > 0) p.set("max", String(b));
              else p.delete("max");
            });
          }}
        >
          <div className="flex items-center gap-2">
            <input inputMode="numeric" aria-label="Harga minimum" placeholder={`Min ${rupiah(facets.price.min)}`} value={min} onChange={(e) => setMin(e.target.value)} className="input h-10 py-2 text-xs" />
            <span className="text-ink-soft">–</span>
            <input inputMode="numeric" aria-label="Harga maksimum" placeholder={`Max ${rupiah(facets.price.max)}`} value={max} onChange={(e) => setMax(e.target.value)} className="input h-10 py-2 text-xs" />
          </div>
          <button className="btn btn-outline btn-sm w-full">Terapkan harga</button>
        </form>
      </Group>
      {facets.colors.length > 0 && (
        <Group title="Warna">
          <div className="flex flex-wrap gap-2">
            {facets.colors.map((c) => {
              const on = nav.list("color").includes(c.name);
              return (
                <button
                  key={c.name}
                  onClick={() => nav.toggle("color", c.name)}
                  aria-pressed={on}
                  className={cn("chip", on && "chip-active")}
                >
                  <span className="h-3.5 w-3.5 rounded-full border border-ink/20" style={{ background: c.hex ?? "#ccc" }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </Group>
      )}
      {facets.sizes.length > 0 && (
        <Group title="Ukuran">
          <div className="grid grid-cols-4 gap-2">
            {facets.sizes.map((s) => {
              const on = nav.list("size").includes(s);
              return (
                <button key={s} onClick={() => nav.toggle("size", s)} aria-pressed={on} className={cn("h-9 rounded-lg border text-xs font-semibold", on ? "border-ink bg-ink text-paper" : "border-ink/15 hover:border-ink/40")}>
                  {s}
                </button>
              );
            })}
          </div>
        </Group>
      )}
      {!hide.gender && (
        <Group title="Gender" open={false}>
          {[
            ["MEN", "Men"],
            ["WOMEN", "Women"],
          ].map(([v, l]) => (
            <Check key={v} label={l!} checked={nav.sp.get("gender") === v} onChange={() => nav.setOne("gender", nav.sp.get("gender") === v ? null : v!)} />
          ))}
        </Group>
      )}
      <Group title="Ketersediaan & Diskon">
        <Check label="Hanya yang tersedia" checked={nav.sp.get("stock") === "1"} onChange={() => nav.setOne("stock", nav.sp.get("stock") === "1" ? null : "1")} />
        <Check label="Sedang diskon" checked={nav.sp.get("discount") === "1"} onChange={() => nav.setOne("discount", nav.sp.get("discount") === "1" ? null : "1")} />
      </Group>
    </div>
  );
}

export function FilterSidebar({ facets, hide = {} }: { facets: Facets; hide?: { brand?: boolean; gender?: boolean } }) {
  return (
    <aside className="hidden lg:block" aria-label="Filter produk">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-3">
        <FilterBody facets={facets} hide={hide} />
      </div>
    </aside>
  );
}

export function MobileFilters({ facets, hide = {}, total }: { facets: Facets; hide?: { brand?: boolean; gender?: boolean }; total: number }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn btn-outline btn-sm h-10 lg:hidden">
        <SlidersHorizontal className="h-4 w-4" /> Filter
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filter">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[88vh] animate-fade-up flex-col rounded-t-3xl bg-card">
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <p className="font-bold">Filter</p>
              <button aria-label="Tutup filter" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-ink/5">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              <FilterBody facets={facets} hide={hide} />
            </div>
            <div className="border-t border-ink/10 p-4">
              <button onClick={() => setOpen(false)} className="btn btn-primary w-full">
                Lihat {total} produk
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ActiveFilters({ facets }: { facets: Facets }) {
  const nav = useParamNav();
  const chips: { k: string; v: string; label: string }[] = [];
  nav.list("type").forEach((v) => chips.push({ k: "type", v, label: facets.types.find((t) => t.slug === v)?.name ?? v }));
  nav.list("brand").forEach((v) => chips.push({ k: "brand", v, label: facets.brands.find((t) => t.slug === v)?.name ?? v }));
  nav.list("color").forEach((v) => chips.push({ k: "color", v, label: v }));
  nav.list("size").forEach((v) => chips.push({ k: "size", v, label: `Size ${v}` }));
  if (nav.sp.get("min")) chips.push({ k: "min", v: "", label: `≥ ${rupiah(+nav.sp.get("min")!)}` });
  if (nav.sp.get("max")) chips.push({ k: "max", v: "", label: `≤ ${rupiah(+nav.sp.get("max")!)}` });
  if (nav.sp.get("stock")) chips.push({ k: "stock", v: "", label: "Tersedia" });
  if (nav.sp.get("discount")) chips.push({ k: "discount", v: "", label: "Diskon" });
  if (nav.sp.get("gender")) chips.push({ k: "gender", v: "", label: nav.sp.get("gender") === "MEN" ? "Men" : "Women" });
  if (nav.sp.get("q")) chips.push({ k: "q", v: "", label: `“${nav.sp.get("q")}”` });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.k + c.v} onClick={() => (c.v ? nav.toggle(c.k, c.v) : nav.setOne(c.k, null))} className="chip">
          {c.label} <X className="h-3 w-3" />
        </button>
      ))}
      <button
        onClick={() => nav.push((p) => ["type", "brand", "color", "size", "min", "max", "stock", "discount", "gender", "q"].forEach((k) => p.delete(k)))}
        className="text-xs font-semibold text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        Reset semua
      </button>
    </div>
  );
}
