"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "@/components/icons";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  ctaLabel: string | null;
  url: string | null;
  image: string | null;
  illustration: string | null;
  theme: string;
};

/**
 * Photographic hero: one large photo per slide; copy is a small annotation card, not a poster.
 * Slides cross-fade (opacity only) and pause on hover/focus and when the user asks.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const touch = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    if (paused || hover || n < 2) return;
    const t = setInterval(() => go(1), 7000);
    return () => clearInterval(t);
  }, [paused, hover, n, go]);
  if (!n) return null;
  const s = slides[i]!;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Koleksi pilihan"
      className="container-x pt-3 sm:pt-5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setHover(true)}
      onBlurCapture={() => setHover(false)}
      onTouchStart={(e) => (touch.current = e.touches[0]!.clientX)}
      onTouchEnd={(e) => {
        if (touch.current === null) return;
        const dx = e.changedTouches[0]!.clientX - touch.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touch.current = null;
      }}
    >
      <div className="relative h-[clamp(560px,82vh,780px)] overflow-hidden rounded-[28px] bg-surface">
        {slides.map((sl, idx) => (
          <div
            key={sl.id}
            aria-hidden={idx !== i}
            className={cn("absolute inset-0 transition-opacity duration-1000 ease-[cubic-bezier(.65,0,.35,1)]", idx === i ? "opacity-100" : "opacity-0")}
          >
            {sl.image ? (
              <Image src={sl.image} alt="" fill priority={idx === 0} sizes="100vw" className="object-cover" />
            ) : (
              <div className="h-full w-full bg-surface-2" />
            )}
          </div>
        ))}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/35 via-transparent to-transparent" />

        <div
          key={s.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} dari ${n}`}
          className="absolute inset-x-3 bottom-3 animate-fade-up rounded-[22px] bg-card/90 p-6 shadow-lift backdrop-blur-md sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-[440px] sm:p-8"
        >
          {s.subtitle && <p className="text-xs font-medium text-ink-soft">{s.subtitle}</p>}
          <h1 className="mt-2 font-serif text-[40px] leading-[1.02] tracking-[-.015em] text-ink sm:text-[54px]">{s.title}</h1>
          {s.description && <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{s.description}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {s.url && (
              <Link href={s.url} className="btn btn-primary h-11 px-6">
                {s.ctaLabel || "Belanja sekarang"} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link href="/new-arrivals" className="btn btn-ghost h-11 px-4">
              Koleksi terbaru
            </Link>
          </div>
        </div>

        {n > 1 && (
          <div className="absolute right-5 top-5 flex items-center gap-2">
            <span className="rounded-full bg-card/90 px-3 py-1.5 font-mono text-[11px] text-ink backdrop-blur">
              {String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
            <button aria-label={paused ? "Putar otomatis" : "Jeda"} onClick={() => setPaused((p) => !p)} className="grid h-9 w-9 place-items-center rounded-full bg-card/90 text-ink backdrop-blur hover:bg-card">
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </button>
            <button aria-label="Sebelumnya" onClick={() => go(-1)} className="hidden h-9 w-9 place-items-center rounded-full bg-card/90 text-ink backdrop-blur hover:bg-card sm:grid">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button aria-label="Berikutnya" onClick={() => go(1)} className="hidden h-9 w-9 place-items-center rounded-full bg-card/90 text-ink backdrop-blur hover:bg-card sm:grid">
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
