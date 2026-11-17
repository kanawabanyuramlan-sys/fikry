"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle, X } from "@/components/icons";
import { ProductIllustration } from "@/components/illustration";
import { waLink } from "@/lib/format";

export function AnnouncementBar({ items }: { items: { id: string; title: string; url: string | null }[] }) {
  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  useEffect(() => {
    if (items.length < 2 || hold) return;
    const t = setInterval(() => setI((x) => (x + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length, hold]);
  if (!items.length) return null;
  const cur = items[i % items.length]!;
  const go = (d: number) => setI((x) => (x + d + items.length) % items.length);
  return (
    <div
      className="bg-brand-dark text-paper"
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocusCapture={() => setHold(true)}
      onBlurCapture={() => setHold(false)}
    >
      <div className="container-x flex h-9 items-center justify-between gap-2 text-xs font-medium">
        <button aria-label="Pengumuman sebelumnya" onClick={() => go(-1)} className={items.length > 1 ? "opacity-70 hover:opacity-100" : "invisible"}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div key={cur.id} className="animate-fade-up truncate text-center" aria-live="polite">
          {cur.url ? (
            <Link href={cur.url} className="underline-offset-4 hover:underline">
              {cur.title}
            </Link>
          ) : (
            cur.title
          )}
        </div>
        <button aria-label="Pengumuman berikutnya" onClick={() => go(1)} className={items.length > 1 ? "opacity-70 hover:opacity-100" : "invisible"}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function WhatsAppFloat({ phone, message }: { phone: string; message: string }) {
  if (!phone) return null;
  return (
    <a
      href={waLink(phone, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat WhatsApp customer service"
      className="fixed bottom-5 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-brand-dark px-4 text-sm font-semibold text-paper shadow-lift transition hover:scale-[1.03] sm:right-6"
    >
      <MessageCircle className="h-6 w-6" />
      <span className="hidden sm:inline">Chat kami</span>
    </a>
  );
}

const POPUP_KEY = "verda.popup.seen";
/** Popup shown at most once every 3 days per browser, after 8s, never on checkout/cart. */
export function PromoPopup({
  promo,
}: {
  promo: { id: string; title: string; description: string | null; ctaLabel: string | null; url: string | null; illustration: string | null; image: string | null } | null;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!promo) return;
    if (/^\/(checkout|cart|order|account)/.test(location.pathname)) return;
    try {
      const seen = JSON.parse(localStorage.getItem(POPUP_KEY) || "{}") as { id?: string; at?: number };
      if (seen.id === promo.id && Date.now() - (seen.at ?? 0) < 3 * 864e5) return;
    } catch {}
    const t = setTimeout(() => setShow(true), 8000);
    return () => clearTimeout(t);
  }, [promo]);
  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(POPUP_KEY, JSON.stringify({ id: promo?.id, at: Date.now() }));
    } catch {}
  };
  useEffect(() => {
    if (!show) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);
  if (!promo || !show) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={promo.title}>
      <div className="absolute inset-0 bg-ink/50" onClick={close} />
      <div className="relative grid w-full max-w-2xl animate-fade-up overflow-hidden rounded-3xl bg-card shadow-lift sm:grid-cols-2">
        <button onClick={close} aria-label="Tutup" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-card/90 hover:bg-card">
          <X className="h-4 w-4" />
        </button>
        <div className="bg-brand-light">
          {promo.image ? (
            <div className="relative h-48 w-full sm:h-full">
              <Image src={promo.image} alt="" fill sizes="(min-width:640px) 336px, 100vw" className="object-cover" />
            </div>
          ) : (
            <ProductIllustration type={promo.illustration} caption={false} className="h-48 w-full sm:h-full" />
          )}
        </div>
        <div className="flex flex-col justify-center gap-3 p-7">
          <p className="eyebrow">Special Offer</p>
          <h2 className="font-serif text-[32px] leading-[1.05]">{promo.title}</h2>
          {promo.description && <p className="text-sm text-ink-soft">{promo.description}</p>}
          {promo.url && (
            <Link href={promo.url} onClick={close} className="btn btn-primary mt-2 self-start">
              {promo.ctaLabel || "Lihat promo"}
            </Link>
          )}
          <button onClick={close} className="self-start text-xs font-semibold text-ink-soft hover:text-ink">
            Tidak, terima kasih
          </button>
        </div>
      </div>
    </div>
  );
}
