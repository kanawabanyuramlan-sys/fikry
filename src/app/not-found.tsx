import Link from "next/link";
import { ProductIllustration } from "@/components/illustration";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-brand-off px-4 text-center">
      <div>
        <ProductIllustration type="sneaker" color="#78B82A" plain className="mx-auto h-48 w-48" />
        <p className="eyebrow mt-4">404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-ink-soft">Produk atau halaman ini mungkin sudah dipindahkan atau tidak tersedia.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn btn-primary">
            Ke beranda
          </Link>
          <Link href="/shop" className="btn btn-outline">
            Lihat katalog
          </Link>
        </div>
      </div>
    </div>
  );
}
