"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "@/components/icons";
import { useShop } from "@/components/providers/shop";
import { ProductGrid } from "./product-card";
import type { CardProduct } from "@/lib/catalog";

export function WishlistView() {
  const shop = useShop();
  const [items, setItems] = useState<CardProduct[] | null>(null);
  const key = shop.wishlist.join(",");
  useEffect(() => {
    if (!shop.ready) return;
    if (!shop.wishlist.length) {
      setItems([]);
      return;
    }
    fetch(`/api/products?ids=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d: CardProduct[]) => setItems(d))
      .catch(() => setItems([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, shop.ready]);
  return (
    <div className="container-x py-10 sm:py-14">
      <p className="eyebrow">Saved</p>
      <h1 className="h-display mt-2 text-4xl sm:text-5xl">Wishlist</h1>
      {!shop.wishLoggedIn && shop.wishlist.length > 0 && (
        <p className="mt-3 text-sm text-ink-soft">
          Wishlist tersimpan di perangkat ini.{" "}
          <Link href="/account/login?next=/wishlist" className="link">
            Login
          </Link>{" "}
          agar tersimpan di akun kamu.
        </p>
      )}
      <div className="mt-8">
        {items === null ? (
          <div className="grid h-60 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink-soft" />
          </div>
        ) : items.length === 0 ? (
          <div className="grid place-items-center rounded-3xl bg-brand-off px-6 py-20 text-center">
            <Heart className="h-10 w-10 text-ink-soft/50" />
            <p className="mt-4 text-lg font-bold">Wishlist masih kosong</p>
            <p className="mt-1 text-sm text-ink-soft">Tekan ikon hati pada produk untuk menyimpannya di sini.</p>
            <Link href="/shop" className="btn btn-primary mt-6">
              Jelajahi produk
            </Link>
          </div>
        ) : (
          <ProductGrid items={items} />
        )}
      </div>
    </div>
  );
}
