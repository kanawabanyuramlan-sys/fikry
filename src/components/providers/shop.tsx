"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "./toast";

export type CartLine = { variantId: string; quantity: number };
const CART_KEY = "verda.cart.v1";
const WISH_KEY = "verda.wishlist.v1";

type ShopCtx = {
  ready: boolean;
  lines: CartLine[];
  count: number;
  add: (variantId: string, quantity?: number, label?: string) => void;
  setQty: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  replace: (lines: CartLine[]) => void;
  clear: () => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  wishlist: string[];
  wishLoggedIn: boolean;
  isWished: (productId: string) => boolean;
  toggleWish: (productId: string) => void;
  quickView: string | null;
  openQuickView: (slug: string | null) => void;
};

const Ctx = createContext<ShopCtx | null>(null);

function readLS<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [ready, setReady] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishLoggedIn, setWishLoggedIn] = useState(false);
  const [quickView, openQuickView] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const l = readLS<CartLine[]>(CART_KEY, []);
    setLines(Array.isArray(l) ? l.filter((x) => x && typeof x.variantId === "string") : []);
    const localWish = readLS<string[]>(WISH_KEY, []);
    setWishlist(localWish);
    loaded.current = true;
    setReady(true);
    // Logged-in customers keep their wishlist in the database; merge any guest items once.
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then(async (d: { loggedIn: boolean; ids: string[] }) => {
        if (!d.loggedIn) return;
        setWishLoggedIn(true);
        let ids = d.ids;
        if (localWish.length) {
          const r = await fetch("/api/wishlist", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ merge: localWish }),
          });
          if (r.ok) ids = ((await r.json()) as { ids: string[] }).ids;
          writeLS(WISH_KEY, []);
        }
        setWishlist(ids);
      })
      .catch(() => {});
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setLines(readLS<CartLine[]>(CART_KEY, []));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (loaded.current) writeLS(CART_KEY, lines);
  }, [lines]);

  const add = useCallback(
    (variantId: string, quantity = 1, label?: string) => {
      setLines((cur) => {
        const ex = cur.find((l) => l.variantId === variantId);
        if (ex) return cur.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(99, l.quantity + quantity) } : l));
        return [...cur, { variantId, quantity }];
      });
      // silent success: the cart drawer opening is the confirmation
      void label;
      setCartOpen(true);
    },
    [],
  );
  const setQty = useCallback((variantId: string, quantity: number) => {
    setLines((cur) => cur.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(99, quantity)) } : l)));
  }, []);
  const remove = useCallback((variantId: string) => setLines((cur) => cur.filter((l) => l.variantId !== variantId)), []);
  const replace = useCallback((l: CartLine[]) => setLines(l), []);
  const clear = useCallback(() => setLines([]), []);

  const toggleWish = useCallback(
    (productId: string) => {
      const has = wishlist.includes(productId);
      const next = has ? wishlist.filter((x) => x !== productId) : [...wishlist, productId];
      setWishlist(next);
      if (wishLoggedIn) {
        fetch("/api/wishlist", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ productId, on: !has }),
        }).catch(() => toast("error", "Gagal menyimpan wishlist"));
      } else writeLS(WISH_KEY, next);
      toast("info", has ? "Dihapus dari wishlist" : "Disimpan ke wishlist");
    },
    [wishlist, wishLoggedIn, toast],
  );

  const value = useMemo<ShopCtx>(
    () => ({
      ready,
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      add,
      setQty,
      remove,
      replace,
      clear,
      cartOpen,
      setCartOpen,
      wishlist,
      wishLoggedIn,
      isWished: (id) => wishlist.includes(id),
      toggleWish,
      quickView,
      openQuickView,
    }),
    [ready, lines, add, setQty, remove, replace, clear, cartOpen, wishlist, wishLoggedIn, toggleWish, quickView],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useShop outside ShopProvider");
  return c;
}
