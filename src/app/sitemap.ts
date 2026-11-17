import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/mailer";
import { POLICY_PAGES } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl();
  const [products, categories, brands] = await Promise.all([
    db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
    db.brand.findMany({ where: { isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  const statics = ["", "/shop", "/new-arrivals", "/men", "/women", "/sale", "/brands", "/contact", "/track"].map((p) => ({
    url: base + p,
    changeFrequency: "daily" as const,
    priority: p === "" ? 1 : 0.7,
  }));
  return [
    ...statics,
    ...POLICY_PAGES.map((p) => ({ url: `${base}/pages/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.3 })),
    ...categories.map((c) => ({ url: `${base}/c/${c.slug}`, lastModified: c.updatedAt, changeFrequency: "daily" as const, priority: 0.8 })),
    ...brands.map((b) => ({ url: `${base}/brands/${b.slug}`, lastModified: b.updatedAt, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "weekly" as const, priority: 0.9 })),
  ];
}
