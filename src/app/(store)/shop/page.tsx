import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = (await searchParams).q;
  return { title: q ? `Hasil pencarian “${q}”` : "Shop All", alternates: { canonical: "/shop" } };
}

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  return (
    <CatalogView
      scope={{}}
      searchParams={sp}
      basePath="/shop"
      eyebrow={q ? "Search" : "Shop"}
      title={q ? `“${q}”` : "All Products"}
      description={q ? "Hasil pencarian dari seluruh katalog." : "Seluruh produk dari semua brand dan kategori."}
      crumbs={[{ label: q ? "Search" : "Shop" }]}
    />
  );
}
