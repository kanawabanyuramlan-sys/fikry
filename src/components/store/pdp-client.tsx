"use client";

import Link from "next/link";
import { useState } from "react";
import { X, ZoomIn, Star, ShieldCheck, Truck, RotateCcw } from "@/components/icons";
import { ProductMedia } from "./product-media";
import { VariantPicker, type PickerProduct } from "./buy-box";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type Img = { url: string; alt: string | null; isSample?: boolean };

function ZoomFrame({ img, illustration, color, alt }: { img?: Img; illustration: string | null; color: string | null; alt: string }) {
  const [origin, setOrigin] = useState("50% 50%");
  const [zoom, setZoom] = useState(false);
  return (
    <div
      className="relative cursor-zoom-in overflow-hidden rounded-3xl bg-brand-off"
      onMouseEnter={() => setZoom(true)}
      onMouseLeave={() => setZoom(false)}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
      }}
    >
      <div className="transition-transform duration-200 ease-out" style={{ transformOrigin: origin, transform: zoom ? "scale(1.9)" : "scale(1)" }}>
        <ProductMedia image={img?.url} sample={img?.isSample} illustration={illustration} color={color} alt={img?.alt || alt} priority sizes="(min-width:1024px) 55vw, 100vw" label={!zoom} />
      </div>
    </div>
  );
}

export function PdpClient({
  product,
  images,
  illustration,
  brand,
  conditionLabel,
  rating,
  shippingNote,
}: {
  product: PickerProduct;
  images: Img[];
  illustration: string | null;
  brand: { name: string; slug: string };
  conditionLabel: string;
  rating: { avg: number; count: number };
  shippingNote: string;
}) {
  const firstHex = product.variants.find((v) => v.colorHex)?.colorHex ?? null;
  const [hex, setHex] = useState<string | null>(firstHex);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const slides: (Img | null)[] = images.length ? images : [null];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      {/* Gallery */}
      <div className="flex flex-col-reverse gap-3 md:flex-row">
        {slides.length > 1 && (
          <div className="no-scrollbar flex gap-2 overflow-x-auto md:max-h-[640px] md:w-20 md:flex-col md:overflow-y-auto">
            {slides.map((s, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                aria-label={`Gambar ${i + 1}`}
                aria-current={i === active}
                className={cn("w-16 shrink-0 overflow-hidden rounded-xl border-2 md:w-full", i === active ? "border-ink" : "border-transparent opacity-70 hover:opacity-100")}
              >
                <ProductMedia image={s?.url} illustration={illustration} color={hex} alt={product.name} label={false} sizes="80px" />
              </button>
            ))}
          </div>
        )}
        <div className="relative flex-1">
          <ZoomFrame img={slides[active] ?? undefined} illustration={illustration} color={hex} alt={product.name} />
          <button
            onClick={() => setLightbox(true)}
            className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-card/90 shadow-sm hover:bg-card"
            aria-label="Perbesar gambar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          {images[0]?.isSample && (
            <p className="mt-2 text-xs text-ink-soft">Foto contoh berlisensi untuk menggambarkan jenis produk, bukan foto barang yang dijual. Foto asli dapat diminta via WhatsApp.</p>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Link href={`/brands/${brand.slug}`} className="text-xs font-semibold uppercase tracking-[.16em] text-ink-soft hover:text-ink">
          {brand.name}
        </Link>
        <h1 className="mt-2 font-serif text-[40px] leading-[1.02] tracking-[-.015em] sm:text-[52px]">{product.name}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {rating.count > 0 ? (
            <a href="#reviews" className="flex items-center gap-1.5">
              <span className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cn("h-4 w-4", n <= Math.round(rating.avg) ? "fill-ink text-ink" : "text-ink/20")} />
                ))}
              </span>
              <span className="font-semibold">{rating.avg.toFixed(1)}</span>
              <span className="text-ink-soft underline underline-offset-2">({rating.count} ulasan)</span>
            </a>
          ) : (
            <a href="#reviews" className="text-ink-soft underline underline-offset-2">
              Belum ada ulasan
            </a>
          )}
          <span className="badge bg-brand-light text-brand-dark">{conditionLabel}</span>
        </div>
        <div className="mt-5 flex flex-wrap items-baseline gap-3">
          <span className={cn("text-2xl font-extrabold", product.discountPct > 0 && "text-sale")}>{rupiah(product.sellingPrice)}</span>
          {product.discountPct > 0 && (
            <>
              <span className="text-base text-ink-soft line-through">{rupiah(product.originalPrice)}</span>
              <span className="badge bg-sale text-paper">Hemat {product.discountPct}%</span>
            </>
          )}
        </div>
        <div className="mt-7">
          <VariantPicker product={product} onColor={(h) => h && setHex(h)} />
        </div>
        <ul className="mt-7 space-y-3.5 rounded-2xl border border-rule bg-card p-5 text-sm">
          <li className="flex gap-3">
            <Truck weight="duotone" className="h-5 w-5 shrink-0 text-brand-dark" /> <span>{shippingNote}</span>
          </li>
          <li className="flex gap-3">
            <RotateCcw weight="duotone" className="h-5 w-5 shrink-0 text-brand-dark" />
            <span>
              Retur & tukar ukuran sesuai <Link href="/pages/returns" className="link">kebijakan retur</Link>.
            </span>
          </li>
          <li className="flex gap-3">
            <ShieldCheck weight="duotone" className="h-5 w-5 shrink-0 text-brand-dark" />
            <span>
              Diperiksa sebelum dikirim · <Link href="/pages/warranty" className="link">garansi toko</Link>
            </span>
          </li>
        </ul>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[70] bg-card" role="dialog" aria-modal="true" aria-label="Gambar produk">
          <button onClick={() => setLightbox(false)} aria-label="Tutup" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-ink text-paper">
            <X className="h-5 w-5" />
          </button>
          <div className="flex h-full items-center justify-center overflow-auto p-4">
            <div className="w-full max-w-[min(90vh,1100px)]">
              <ProductMedia image={slides[active]?.url} sample={slides[active]?.isSample} fit="contain" illustration={illustration} color={hex} alt={product.name} sizes="100vw" />
            </div>
          </div>
          {slides.length > 1 && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
              {slides.map((_, i) => (
                <button key={i} aria-label={`Gambar ${i + 1}`} onClick={() => setActive(i)} className={cn("h-2 rounded-full", i === active ? "w-8 bg-ink" : "w-2 bg-ink/30")} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
