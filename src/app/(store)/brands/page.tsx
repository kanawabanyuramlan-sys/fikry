import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Brands", description: "Semua brand yang tersedia di toko kami.", alternates: { canonical: "/brands" } };

export default async function BrandsPage() {
  const brands = await db.brand.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
  });
  const groups = new Map<string, typeof brands>();
  for (const b of brands) {
    const first = b.name.charAt(0).toUpperCase();
    const k = /[A-Z]/.test(first) ? first : "#";
    groups.set(k, [...(groups.get(k) ?? []), b]);
  }
  return (
    <div className="container-x py-10">
      <p className="eyebrow">Multi-brand</p>
      <h1 className="h-display mt-2 text-4xl sm:text-5xl">Brands</h1>
      <p className="mt-3 max-w-xl text-sm text-ink-soft">Klik brand untuk melihat seluruh koleksinya.</p>
      <div className="mt-6 flex flex-wrap gap-1.5">
        {[...groups.keys()].map((k) => (
          <a key={k} href={`#brand-${k}`} className="chip">
            {k}
          </a>
        ))}
      </div>
      {!brands.length && <p className="mt-10 rounded-2xl bg-brand-off p-10 text-center text-ink-soft">Belum ada brand.</p>}
      <div className="mt-10 space-y-10">
        {[...groups.entries()].map(([k, list]) => (
          <section key={k} id={`brand-${k}`} className="scroll-mt-28">
            <h2 className="mb-4 font-serif text-3xl">{k}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((b) => (
                <Link key={b.id} href={`/brands/${b.slug}`} className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-lift">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-light text-lg font-extrabold text-brand-dark">
                    {b.logo ? <Image src={b.logo} alt="" width={56} height={56} className="object-contain" /> : b.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{b.name}</span>
                    <span className="text-xs text-ink-soft">{b._count.products} produk</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
