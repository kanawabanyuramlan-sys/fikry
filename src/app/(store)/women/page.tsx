import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";
export const metadata: Metadata = { title: "Women", description: "Koleksi Women: sepatu, pakaian, tas dan aksesori.", alternates: { canonical: "/women" } };
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CatalogView scope={{ gender: "WOMEN" }} hide={{ gender: true }} searchParams={await searchParams} basePath="/women" eyebrow="Collection" title="Women" description="Sepatu, pakaian, tas dan aksesori pilihan." crumbs={[{ label: "Women" }]} />;
}
