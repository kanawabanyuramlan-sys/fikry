import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/store/catalog-view";
import { categoryPath, getCategoryTree } from "@/lib/catalog";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { bySlug } = await getCategoryTree();
  const c = bySlug.get(slug);
  if (!c) return { title: "Kategori tidak ditemukan" };
  return { title: c.name, description: c.description ?? `Belanja ${c.name} dari berbagai brand.`, alternates: { canonical: `/c/${slug}` } };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { bySlug, map } = await getCategoryTree();
  const c = bySlug.get(slug);
  if (!c) notFound();
  const path = categoryPath(c, map);
  return (
    <CatalogView
      scope={{ categorySlug: slug }}
      searchParams={await searchParams}
      basePath={`/c/${slug}`}
      eyebrow={path.length > 1 ? path[0]!.name : "Category"}
      title={c.name}
      description={c.description}
      crumbs={path.map((p, i) => ({ label: p.name, href: i < path.length - 1 ? `/c/${p.slug}` : undefined }))}
    />
  );
}
