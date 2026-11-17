import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
export const metadata: Metadata = { title: "New Arrivals", description: "Produk terbaru yang baru saja tiba.", alternates: { canonical: "/new-arrivals" } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogView scope={{ newArrivals: true }} searchParams={await searchParams} basePath="/new-arrivals" eyebrow="Just landed" title="New Arrivals" description="Koleksi terbaru dari brand pilihan." crumbs={[{ label: "New Arrivals" }]} />;
}
