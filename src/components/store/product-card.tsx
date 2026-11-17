"use client";

import Link from "next/link";
import { Heart, Eye, ShoppingBag } from "@/components/icons";
import { useShop } from "@/components/providers/shop";
import { ProductMedia } from "./product-media";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CardProduct } from "@/lib/catalog";

export function ProductCard({ p, bestSeller, priority }: { p: CardProduct; bestSeller?: boolean; priority?: boolean }) {
  const shop = useShop();
  const colors = [...new Map(p.variants.filter((v) => v.color).map((v) => [v.color, v.colorHex])).entries()];
  const inStock = p.variants.filter((v) => v.stock > 0);
  const wished = shop.isWished(p.id);
  const discount = p.discountPct;
  const img = p.images[0];

  const quickAdd = () => {
    if (inStock.length === 1 && p.variants.length === 1) shop.add(inStock[0]!.id, 1, p.name);
    else shop.openQuickView(p.slug);
  };

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-[18px] bg-surface">
        <Link href={`/p/${p.slug}`} aria-label={p.name} className="block">
          <ProductMedia
            image={img?.url}
            sample={img?.isSample}
            illustration={p.illustration}
            alt={p.name}
            priority={priority}
            className="transition duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.03]"
          />
          {p.images[1] && (
            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:opacity-100">
              <ProductMedia image={p.images[1].url} alt={p.name} label={false} />
            </div>
          )}
        </Link>
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {discount > 0 && <span className="badge bg-card text-sale">−{discount}%</span>}
          {p.isNewArrival && <span className="badge bg-card text-ink">New</span>}
          {(bestSeller || p.isBestSeller) && <span className="badge bg-brand-dark text-paper">Best seller</span>}
        </div>
        <button
          type="button"
          onClick={() => shop.toggleWish(p.id)}
          aria-pressed={wished}
          aria-label={wished ? "Hapus dari wishlist" : "Simpan ke wishlist"}
          className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-card/90 text-ink backdrop-blur transition hover:bg-card"
        >
          <Heart weight={wished ? "fill" : "regular"} className={cn("h-[18px] w-[18px]", wished && "text-sale")} />
        </button>
        <div className="absolute inset-x-2.5 bottom-2.5 flex justify-end gap-2 transition duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
          <button
            type="button"
            onClick={() => shop.openQuickView(p.slug)}
            className="hidden h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-card/95 text-xs font-semibold text-ink backdrop-blur hover:bg-card md:flex"
          >
            <Eye className="h-4 w-4" /> Lihat cepat
          </button>
          <button
            type="button"
            onClick={quickAdd}
            disabled={inStock.length === 0}
            aria-label={`Tambah ${p.name} ke keranjang`}
            className="grid h-10 w-10 place-items-center rounded-full bg-ink text-paper transition hover:bg-ink/85 disabled:bg-ink-soft"
          >
            <ShoppingBag className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col px-0.5 pt-3.5">
        <p className="text-[11px] font-medium uppercase tracking-[.14em] text-ink-soft">{p.brand.name}</p>
        <Link href={`/p/${p.slug}`} className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-ink hover:text-brand-dark">
          {p.name}
        </Link>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className={cn("text-sm font-semibold", discount > 0 ? "text-sale" : "text-ink")}>{rupiah(p.sellingPrice)}</span>
          {discount > 0 && <span className="text-xs text-ink-soft line-through">{rupiah(p.originalPrice)}</span>}
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          {colors.slice(0, 5).map(([name, hex]) => (
            <span key={name} title={name ?? ""} className="h-3 w-3 rounded-full ring-1 ring-ink/15" style={{ background: hex ?? "oklch(var(--surface-2))" }} />
          ))}
          {colors.length > 5 && <span className="text-[11px] text-ink-soft">+{colors.length - 5}</span>}
          {inStock.length === 0 && <span className="text-[11px] font-semibold text-sale">Stok habis</span>}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items, topIds, className }: { items: CardProduct[]; topIds?: string[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-5 md:grid-cols-3 xl:grid-cols-4", className)}>
      {items.map((p, i) => (
        <ProductCard key={p.id} p={p} bestSeller={topIds?.includes(p.id)} priority={i < 4} />
      ))}
    </div>
  );
}
