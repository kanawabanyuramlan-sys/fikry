"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, ShoppingBag, Tag, MessageCircle } from "@/components/icons";
import { useShop } from "@/components/providers/shop";
import { CartLineRow, useQuote } from "./cart-drawer";
import { rupiah } from "@/lib/format";

export const COUPON_KEY = "verda.coupon";

export function CartView() {
  const shop = useShop();
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  useEffect(() => {
    try {
      const c = sessionStorage.getItem(COUPON_KEY);
      if (c) {
        setCoupon(c);
        setCouponInput(c);
      }
    } catch {}
  }, []);
  const { quote, loading, error } = useQuote(coupon);
  const applyCoupon = (code: string | null) => {
    setCoupon(code);
    try {
      if (code) sessionStorage.setItem(COUPON_KEY, code);
      else sessionStorage.removeItem(COUPON_KEY);
    } catch {}
  };
  const hasIssue = quote?.lines.some((l) => l.quantity <= 0 || l.quantity !== l.requested);

  if (shop.ready && !shop.lines.length)
    return (
      <div className="container-x grid min-h-[50vh] place-items-center py-16 text-center">
        <div>
          <ShoppingBag className="mx-auto h-12 w-12 text-ink-soft/50" />
          <h1 className="mt-4 font-serif text-[32px] leading-[1.05]">Keranjang kamu kosong</h1>
          <p className="mt-2 text-sm text-ink-soft">Yuk mulai belanja dan temukan produk favoritmu.</p>
          <Link href="/new-arrivals" className="btn btn-primary mt-6">
            Lihat New Arrivals
          </Link>
        </div>
      </div>
    );

  return (
    <div className="container-x py-8 sm:py-12">
      <h1 className="h-display text-4xl sm:text-5xl">Keranjang</h1>
      {!quote && (loading || !shop.ready) ? (
        <div className="grid h-60 place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
        </div>
      ) : error ? (
        <p className="mt-8 rounded-2xl bg-sale/10 p-5 text-sm text-sale">{error}</p>
      ) : (
        quote && (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_380px]">
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {quote.lines.map((l) => (
                <CartLineRow key={l.variantId} l={l} />
              ))}
            </ul>
            <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
              <h2 className="text-lg font-bold">Ringkasan</h2>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  applyCoupon(couponInput.trim().toUpperCase() || null);
                }}
              >
                <label className="relative flex-1">
                  <span className="sr-only">Kode voucher</span>
                  <Tag className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
                  <input value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Kode voucher" className="input pl-9 uppercase" />
                </label>
                <button className="btn btn-outline btn-sm">Pakai</button>
              </form>
              {coupon && quote.couponError && <p className="text-xs font-medium text-sale">{quote.couponError}</p>}
              {quote.coupon && (
                <p className="flex items-center justify-between rounded-xl bg-brand-light px-3 py-2 text-xs text-brand-dark">
                  <span>
                    <b>{quote.coupon.code}</b> — {quote.coupon.description}
                  </span>
                  <button className="font-semibold underline" onClick={() => (applyCoupon(null), setCouponInput(""))}>
                    Hapus
                  </button>
                </p>
              )}
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Subtotal ({quote.itemCount} item)</dt>
                  <dd className="font-semibold">{rupiah(quote.subtotal)}</dd>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-brand-dark">
                    <dt>Diskon voucher</dt>
                    <dd className="font-semibold">−{rupiah(quote.discount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Ongkos kirim</dt>
                  <dd className="text-ink-soft">Dihitung saat checkout</dd>
                </div>
                <div className="flex justify-between border-t border-ink/10 pt-3 text-base">
                  <dt className="font-bold">Total</dt>
                  <dd className="font-extrabold">{rupiah(quote.subtotal - quote.discount)}</dd>
                </div>
              </dl>
              {hasIssue && <p className="text-xs font-medium text-sale">Beberapa item melebihi stok. Sesuaikan jumlah sebelum checkout.</p>}
              <Link href="/checkout" aria-disabled={hasIssue} className={`btn btn-primary h-12 w-full ${hasIssue ? "pointer-events-none opacity-50" : ""}`}>
                Checkout
              </Link>
              <Link href="/checkout?via=wa" aria-disabled={hasIssue} className={`btn h-12 w-full bg-brand-dark text-paper hover:bg-brand-dark/90 ${hasIssue ? "pointer-events-none opacity-50" : ""}`}>
                <MessageCircle className="h-4 w-4" /> Pesan via WhatsApp
              </Link>
              <p className="text-center text-xs text-ink-soft">Harga & stok diverifikasi ulang saat pesanan dibuat.</p>
            </aside>
          </div>
        )
      )}
    </div>
  );
}
