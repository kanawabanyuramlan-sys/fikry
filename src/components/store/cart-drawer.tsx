"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, X, Loader2 } from "@/components/icons";
import { useShop } from "@/components/providers/shop";
import { ProductMedia } from "./product-media";
import { rupiah } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

/** Re-prices the local cart on the server; returns null while loading. */
export function useQuote(coupon?: string | null, province?: string | null) {
  const { lines, ready, replace } = useShop();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(lines) + (coupon ?? "") + (province ?? "");
  useEffect(() => {
    if (!ready) return;
    if (!lines.length) {
      setQuote(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lines, coupon: coupon || null, province: province || null }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("quote"))))
      .then((q: Quote) => {
        if (cancelled) return;
        setQuote(q);
        setError(null);
        // drop variants that no longer exist / are unpublished
        if (q.missing.length) replace(lines.filter((l) => !q.missing.includes(l.variantId)));
      })
      .catch(() => !cancelled && setError("Gagal memuat keranjang. Periksa koneksi Anda."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);
  return { quote, loading, error };
}

export function CartLineRow({ l, compact }: { l: Quote["lines"][number]; compact?: boolean }) {
  const shop = useShop();
  return (
    <li className="flex gap-3 py-4">
      <Link href={`/p/${l.slug}`} className="w-20 shrink-0 overflow-hidden rounded-xl sm:w-24">
        <ProductMedia image={l.image} illustration={l.illustration} color={l.colorHex} alt={l.name} label={false} sizes="96px" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">{l.brand}</p>
            <Link href={`/p/${l.slug}`} className="line-clamp-2 text-sm font-semibold leading-snug">
              {l.name}
            </Link>
            <p className="mt-0.5 text-xs text-ink-soft">
              {[l.color, l.size && `Size ${l.size}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button aria-label={`Hapus ${l.name}`} onClick={() => shop.remove(l.variantId)} className="h-8 w-8 shrink-0 rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink">
            <Trash2 className="mx-auto h-4 w-4" />
          </button>
        </div>
        {l.issue && <p className="mt-1 text-xs font-medium text-sale">{l.issue}</p>}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex items-center rounded-full border border-ink/15">
            <button aria-label="Kurangi" className="grid h-8 w-8 place-items-center disabled:opacity-30" disabled={l.requested <= 1} onClick={() => shop.setQty(l.variantId, l.requested - 1)}>
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm font-semibold" aria-live="polite">
              {l.requested}
            </span>
            <button aria-label="Tambah" className="grid h-8 w-8 place-items-center disabled:opacity-30" disabled={l.requested >= l.stock} onClick={() => shop.setQty(l.variantId, l.requested + 1)}>
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{rupiah(l.lineTotal)}</p>
            {!compact && l.quantity > 1 && <p className="text-[11px] text-ink-soft">{rupiah(l.price)} / item</p>}
          </div>
        </div>
      </div>
    </li>
  );
}

export function CartDrawer() {
  const shop = useShop();
  const { quote, loading, error } = useQuote();
  useEffect(() => {
    if (!shop.cartOpen) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && shop.setCartOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [shop]);
  if (!shop.cartOpen) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Keranjang belanja">
      <div className="absolute inset-0 bg-ink/40" onClick={() => shop.setCartOpen(false)} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md animate-fade-up flex-col bg-card shadow-lift">
        <div className="flex h-16 items-center justify-between border-b border-ink/10 px-5">
          <h2 className="text-base font-bold">Keranjang ({shop.count})</h2>
          <button aria-label="Tutup keranjang" onClick={() => shop.setCartOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-ink/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          {!shop.lines.length ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <ShoppingBag className="mx-auto h-10 w-10 text-ink-soft/50" />
                <p className="mt-3 font-semibold">Keranjang masih kosong</p>
                <p className="mt-1 text-sm text-ink-soft">Temukan produk favoritmu dan tambahkan ke keranjang.</p>
                <Link href="/new-arrivals" onClick={() => shop.setCartOpen(false)} className="btn btn-primary mt-5">
                  Mulai belanja
                </Link>
              </div>
            </div>
          ) : loading && !quote ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
            </div>
          ) : error ? (
            <p className="py-10 text-center text-sm text-sale">{error}</p>
          ) : (
            <ul className="divide-y divide-ink/10">{quote?.lines.map((l) => <CartLineRow key={l.variantId} l={l} compact />)}</ul>
          )}
        </div>
        {quote && shop.lines.length > 0 && (
          <div className="space-y-3 border-t border-ink/10 p-5">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Subtotal</span>
              <span className="font-bold">{rupiah(quote.subtotal)}</span>
            </div>
            {quote.freeShippingThreshold > 0 && (
              <p className="rounded-xl bg-brand-light px-3 py-2 text-xs text-brand-dark">
                {quote.subtotal >= quote.freeShippingThreshold
                  ? "Pesanan ini memenuhi syarat gratis ongkir."
                  : `Belanja ${rupiah(quote.freeShippingThreshold - quote.subtotal)} lagi untuk gratis ongkir.`}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Link href="/cart" onClick={() => shop.setCartOpen(false)} className="btn btn-outline">
                Lihat keranjang
              </Link>
              <Link href="/checkout" onClick={() => shop.setCartOpen(false)} className="btn btn-primary">
                Checkout
              </Link>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
