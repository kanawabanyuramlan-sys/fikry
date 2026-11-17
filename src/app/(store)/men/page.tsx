import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
export const metadata: Metadata = { title: "Men", description: "Koleksi Men: sepatu, pakaian, tas dan aksesori.", alternates: { canonical: "/men" } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogView scope={{ gender: "MEN" }} hide={{ gender: true }} searchParams={await searchParams} basePath="/men" eyebrow="Collection" title="Men" description="Sepatu, pakaian, tas dan aksesori pilihan." crumbs={[{ label: "Men" }]} />;
}
