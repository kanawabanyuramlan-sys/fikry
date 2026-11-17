import type { Metadata } from "next";
import { TrackForm } from "@/components/store/track-form";

export const metadata: Metadata = { title: "Lacak Pesanan", description: "Cek status pesanan dengan Order ID." };

export default function TrackPage() {
  return (
    <div className="container-x max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Order Tracking</p>
      <h1 className="h-display mt-2 text-4xl sm:text-5xl">Lacak Pesanan</h1>
      <p className="mt-3 text-sm text-ink-soft">Masukkan Order ID dan email atau nomor WhatsApp yang digunakan saat checkout.</p>
      <TrackForm />
    </div>
  );
}
