"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <p className="eyebrow">Terjadi kesalahan</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Halaman gagal dimuat</h1>
        <p className="mt-2 text-sm text-ink-soft">Silakan coba lagi. Jika masalah berlanjut, hubungi customer service kami.</p>
        <div className="mt-6 flex justify-center gap-3">
          <button onClick={reset} className="btn btn-primary">
            Coba lagi
          </button>
          <Link href="/" className="btn btn-outline">
            Ke beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
