import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
export const metadata: Metadata = { title: "Sale", description: "Produk dengan potongan harga.", alternates: { canonical: "/sale" } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogView scope={{ sale: true }} searchParams={await searchParams} basePath="/sale" eyebrow="Special offers" title="Sale" description="Harga spesial selama stok tersedia." crumbs={[{ label: "Sale" }]} />;
}
