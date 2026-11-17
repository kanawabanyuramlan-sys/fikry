"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, X, Loader2, Check } from "@/components/icons";
import { useShop } from "@/components/providers/shop";
import { ProductMedia } from "./product-media";
import { SIZE_ORDER } from "@/lib/constants";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PickerVariant = { id: string; color: string | null; colorHex: string | null; size: string | null; stock: number };
export type PickerProduct = {
  id: string;
  name: string;
  slug: string;
  sellingPrice: number;
  originalPrice: number;
  discountPct: number;
  variants: PickerVariant[];
};

const rank = (s: string) => {
  const i = SIZE_ORDER.indexOf(s);
  return i === -1 ? 500 : i;
};

export function useVariantPicker(p: PickerProduct, onColor?: (hex: string | null, name: string | null) => void) {
  const colors = useMemo(
    () => [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color!, v.colorHex])).entries()],
    [p.variants],
  );
  const sizes = useMemo(
    () =>
      [...new Set(p.variants.map((v) => v.size).filter(Boolean) as string[])].sort(
        (a, b) => rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true }),
      ),
    [p.variants],
  );
  const [color, setColor] = useState<string | null>(colors.length === 1 ? colors[0]![0] : null);
  const [size, setSize] = useState<string | null>(sizes.length === 1 ? sizes[0]! : null);
  const needColor = colors.length > 0;
  const needSize = sizes.length > 0;
  const variant =
    p.variants.find((v) => (!needColor || v.color === color) && (!needSize || v.size === size)) ?? null;
  const ready = (!needColor || !!color) && (!needSize || !!size) && !!variant;
  const stockFor = (s: string) =>
    p.variants.filter((v) => v.size === s && (!color || v.color === color)).reduce((a, v) => a + v.stock, 0);
  const colorStock = (c: string) => p.variants.filter((v) => v.color === c).reduce((a, v) => a + v.stock, 0);
  useEffect(() => {
    if (onColor) onColor(colors.find(([n]) => n === color)?.[1] ?? null, color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);
  return { colors, sizes, color, setColor, size, setSize, variant, ready, needColor, needSize, stockFor, colorStock };
}

export function VariantPicker({
  product,
  onColor,
  compact,
}: {
  product: PickerProduct;
  onColor?: (hex: string | null, name: string | null) => void;
  compact?: boolean;
}) {
  const shop = useShop();
  const router = useRouter();
  const vp = useVariantPicker(product, onColor);
  const [qty, setQty] = useState(1);
  const [tried, setTried] = useState(false);
  const stock = vp.variant?.stock ?? 0;
  const soldOut = product.variants.every((v) => v.stock <= 0);
  useEffect(() => setQty(1), [vp.variant?.id]);

  const missing = [vp.needColor && !vp.color && "warna", vp.needSize && !vp.size && "ukuran"].filter(Boolean).join(" dan ");
  const add = (buyNow = false) => {
    setTried(true);
    if (!vp.ready || !vp.variant || stock <= 0) return;
    shop.add(vp.variant.id, qty, product.name);
    if (buyNow) {
      shop.setCartOpen(false);
      router.push("/checkout");
    }
  };

  return (
    <div className="space-y-6">
      {vp.colors.length > 0 && (
        <fieldset>
          <legend className="mb-2.5 text-sm">
            <span className="font-semibold">Warna:</span> <span className="text-ink-soft">{vp.color ?? "Pilih warna"}</span>
          </legend>
          <div className="flex flex-wrap gap-2.5">
            {vp.colors.map(([name, hex]) => {
              const out = vp.colorStock(name) <= 0;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => vp.setColor(name)}
                  aria-pressed={vp.color === name}
                  title={`${name}${out ? " (habis)" : ""}`}
                  className={cn(
                    "relative grid h-10 w-10 place-items-center rounded-full border-2 transition",
                    vp.color === name ? "border-ink" : "border-transparent hover:border-ink/30",
                  )}
                >
                  <span className="h-7 w-7 rounded-full border border-ink/15" style={{ background: hex ?? "#ccc" }} />
                  {out && <span className="absolute h-[2px] w-9 rotate-45 bg-ink/50" />}
                  <span className="sr-only">{name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      {vp.sizes.length > 0 && (
        <fieldset>
          <legend className="mb-2.5 flex w-full items-center justify-between text-sm">
            <span>
              <span className="font-semibold">Ukuran:</span> <span className="text-ink-soft">{vp.size ?? "Pilih ukuran"}</span>
            </span>
            {!compact && (
              <Link href="/pages/exchange" className="text-xs font-semibold text-ink-soft underline underline-offset-4">
                Panduan & tukar ukuran
              </Link>
            )}
          </legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            {vp.sizes.map((s) => {
              const st = vp.stockFor(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={st <= 0}
                  onClick={() => vp.setSize(s)}
                  aria-pressed={vp.size === s}
                  className={cn(
                    "h-11 rounded-xl border text-sm font-semibold transition",
                    vp.size === s ? "border-ink bg-ink text-paper" : "border-ink/15 hover:border-ink/50",
                    st <= 0 && "cursor-not-allowed border-dashed text-ink-soft/50 line-through hover:border-ink/15",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="text-sm" aria-live="polite">
        {soldOut ? (
          <p className="font-semibold text-sale">Stok habis untuk semua varian.</p>
        ) : vp.ready ? (
          stock > 0 ? (
            <p className="flex items-center gap-1.5 font-medium text-brand-dark">
              <Check className="h-4 w-4" /> {stock <= 5 ? `Tersisa ${stock} — segera pesan` : "Stok tersedia"}
            </p>
          ) : (
            <p className="font-semibold text-sale">Varian ini sedang habis</p>
          )
        ) : (
          <p className={cn("text-ink-soft", tried && "font-semibold text-sale")}>Pilih {missing} terlebih dahulu.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center rounded-full border border-ink/15">
          <button type="button" aria-label="Kurangi jumlah" className="grid h-12 w-11 place-items-center disabled:opacity-30" disabled={qty <= 1} onClick={() => setQty((q) => q - 1)}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center font-semibold">{qty}</span>
          <button type="button" aria-label="Tambah jumlah" className="grid h-12 w-11 place-items-center disabled:opacity-30" disabled={!vp.ready || qty >= stock} onClick={() => setQty((q) => q + 1)}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={() => add(false)} disabled={soldOut || (vp.ready && stock <= 0)} className="btn btn-primary h-12 flex-1">
          Tambah ke Keranjang
        </button>
        <button
          type="button"
          aria-label="Wishlist"
          onClick={() => shop.toggleWish(product.id)}
          className="grid h-12 w-12 place-items-center rounded-full border border-ink/15 hover:border-ink/50"
        >
          <Heart className={cn("h-5 w-5", shop.isWished(product.id) && "fill-sale text-sale")} />
        </button>
      </div>
      {!compact && (
        <button type="button" onClick={() => add(true)} disabled={soldOut || (vp.ready && stock <= 0)} className="btn btn-outline h-12 w-full">
          Beli Sekarang
        </button>
      )}
    </div>
  );
}

type QuickProduct = PickerProduct & {
  brand: { name: string };
  description: string;
  illustration: string | null;
  images: { url: string; alt: string | null; isSample: boolean }[];
};

export function QuickView() {
  const shop = useShop();
  const [p, setP] = useState<QuickProduct | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [hex, setHex] = useState<string | null>(null);
  useEffect(() => {
    if (!shop.quickView) return;
    setP(null);
    setErr(null);
    fetch(`/api/products?slug=${encodeURIComponent(shop.quickView)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: QuickProduct) => {
        setP(d);
        setHex(d.variants.find((v) => v.colorHex)?.colorHex ?? null);
      })
      .catch(() => setErr("Produk tidak dapat dimuat."));
    const k = (e: KeyboardEvent) => e.key === "Escape" && shop.openQuickView(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.quickView]);
  useEffect(() => {
    if (shop.cartOpen) shop.openQuickView(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.cartOpen]);
  if (!shop.quickView) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Quick view">
      <div className="absolute inset-0 bg-ink/40" onClick={() => shop.openQuickView(null)} />
      <div className="relative max-h-[92vh] w-full max-w-4xl animate-fade-up overflow-y-auto rounded-t-3xl bg-card shadow-lift sm:rounded-3xl">
        <button onClick={() => shop.openQuickView(null)} aria-label="Tutup" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-card/90 hover:bg-card">
          <X className="h-5 w-5" />
        </button>
        {!p ? (
          <div className="grid h-72 place-items-center text-sm text-ink-soft">{err ?? <Loader2 className="h-6 w-6 animate-spin" />}</div>
        ) : (
          <div className="grid sm:grid-cols-2">
            <ProductMedia image={p.images[0]?.url} sample={p.images[0]?.isSample} illustration={p.illustration} color={hex} alt={p.name} sizes="(min-width:640px) 450px, 100vw" />
            <div className="space-y-5 p-6 sm:p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{p.brand.name}</p>
                <h2 className="mt-1 font-serif text-[32px] leading-[1.05]">{p.name}</h2>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={cn("text-lg font-bold", p.discountPct > 0 && "text-sale")}>{rupiah(p.sellingPrice)}</span>
                  {p.discountPct > 0 && (
                    <>
                      <span className="text-sm text-ink-soft line-through">{rupiah(p.originalPrice)}</span>
                      <span className="badge bg-sale text-paper">-{p.discountPct}%</span>
                    </>
                  )}
                </div>
              </div>
              <VariantPicker product={p} compact onColor={(h) => h && setHex(h)} />
              <Link href={`/p/${p.slug}`} onClick={() => shop.openQuickView(null)} className="link inline-block text-sm">
                Lihat detail lengkap →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
