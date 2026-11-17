import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CatalogView } from "@/components/store/catalog-view";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await db.brand.findUnique({ where: { slug: (await params).slug } });
  return b ? { title: b.name, description: b.description ?? `Koleksi ${b.name}.`, alternates: { canonical: `/brands/${b.slug}` } } : { title: "Brand" };
}

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const b = await db.brand.findUnique({ where: { slug } });
  if (!b || !b.isActive) notFound();
  return (
    <CatalogView
      scope={{ brandSlug: slug }}
      hide={{ brand: true }}
      searchParams={await searchParams}
      basePath={`/brands/${slug}`}
      eyebrow="Brand"
      title={b.name}
      description={b.description}
      crumbs={[{ label: "Brands", href: "/brands" }, { label: b.name }]}
    />
  );
}
