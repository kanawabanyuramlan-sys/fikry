import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { SIZE_ORDER } from "./constants";

const IS_PG = (process.env.DATABASE_URL || "").startsWith("postgres");
/** Case-insensitive contains that works on both SQLite (LIKE is ci) and PostgreSQL. */
export const ci = (v: string) => (IS_PG ? { contains: v, mode: "insensitive" } : { contains: v }) as { contains: string };

// ───────── categories ─────────
export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  image: string | null;
  illustration: string | null;
  description: string | null;
  showInMenu: boolean;
  isFeatured: boolean;
  sortOrder: number;
  attributeTemplate: string | null;
  children: CategoryNode[];
};

export const getCategoryTree = cache(async () => {
  const rows = await db.category.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const map = new Map<string, CategoryNode>();
  rows.forEach((r) => map.set(r.id, { ...r, children: [] }));
  const roots: CategoryNode[] = [];
  map.forEach((n) => {
    if (n.parentId && map.has(n.parentId)) map.get(n.parentId)!.children.push(n);
    else roots.push(n);
  });
  return { roots, map, bySlug: new Map([...map.values()].map((n) => [n.slug, n])) };
});

export function descendantIds(node: CategoryNode): string[] {
  return [node.id, ...node.children.flatMap(descendantIds)];
}

export function categoryPath(node: CategoryNode, map: Map<string, CategoryNode>) {
  const path: CategoryNode[] = [];
  let cur: CategoryNode | undefined = node;
  while (cur) {
    path.unshift(cur);
    cur = cur.parentId ? map.get(cur.parentId) : undefined;
  }
  return path;
}

// ───────── product card shape ─────────
export const cardSelect = {
  id: true,
  slug: true,
  name: true,
  sellingPrice: true,
  originalPrice: true,
  discountPct: true,
  isNewArrival: true,
  isBestSeller: true,
  isFeatured: true,
  illustration: true,
  createdAt: true,
  brand: { select: { name: true, slug: true } },
  images: { select: { url: true, alt: true, isSample: true }, orderBy: { sortOrder: "asc" }, take: 2 },
  variants: { where: { isActive: true }, select: { id: true, color: true, colorHex: true, size: true, stock: true } },
} satisfies Prisma.ProductSelect;

export type CardProduct = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export const PUBLISHED: Prisma.ProductWhereInput = { status: "PUBLISHED", brand: { isActive: true } };

// ───────── best sellers from real order data ─────────
export const getTopSellerIds = cache(async (limit = 12) => {
  const rows = await db.orderItem.groupBy({
    by: ["productId"],
    where: { productId: { not: null }, order: { status: { not: "CANCELLED" } } },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  return rows.filter((r) => r.productId).map((r) => ({ id: r.productId!, sold: r._sum.quantity ?? 0 }));
});

// ───────── catalog search ─────────
export type CatalogScope = {
  categorySlug?: string;
  brandSlug?: string;
  gender?: "MEN" | "WOMEN";
  newArrivals?: boolean;
  sale?: boolean;
};

export type CatalogParams = {
  q?: string;
  type?: string[]; // subcategory slugs
  brand?: string[];
  color?: string[];
  size?: string[];
  min?: number;
  max?: number;
  inStock?: boolean;
  discount?: boolean;
  gender?: string;
  sort?: string;
  page?: number;
};

const arr = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v : v ? v.split(",") : []).map((s) => s.trim()).filter(Boolean);

export function parseCatalogParams(sp: Record<string, string | string[] | undefined>): CatalogParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : (sp[k] as string | undefined));
  const num = (k: string) => {
    const n = parseInt(one(k) || "", 10);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  return {
    q: one("q")?.slice(0, 80) || undefined,
    type: arr(sp.type),
    brand: arr(sp.brand),
    color: arr(sp.color),
    size: arr(sp.size),
    min: num("min"),
    max: num("max"),
    inStock: one("stock") === "1",
    discount: one("discount") === "1",
    gender: one("gender") || undefined,
    sort: one("sort") || "newest",
    page: Math.max(1, num("page") || 1),
  };
}

async function scopeWhere(scope: CatalogScope): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [PUBLISHED];
  if (scope.categorySlug) {
    const { bySlug } = await getCategoryTree();
    const node = bySlug.get(scope.categorySlug);
    and.push({ categoryId: { in: node ? descendantIds(node) : ["__none__"] } });
  }
  if (scope.brandSlug) and.push({ brand: { slug: scope.brandSlug } });
  if (scope.gender) and.push({ gender: { in: [scope.gender, "UNISEX"] } });
  if (scope.newArrivals) and.push({ isNewArrival: true });
  if (scope.sale) and.push({ discountPct: { gt: 0 } });
  return { AND: and };
}

export const PAGE_SIZE = 24;

export async function searchCatalog(scope: CatalogScope, p: CatalogParams) {
  const base = await scopeWhere(scope);
  const and: Prisma.ProductWhereInput[] = [base];
  if (p.q) {
    const words = p.q.split(/\s+/).filter(Boolean).slice(0, 5);
    for (const w of words) {
      and.push({
        OR: [
          { name: ci(w) },
          { brand: { name: ci(w) } },
          { category: { name: ci(w) } },
          { category: { parent: { name: ci(w) } } },
          { sku: ci(w) },
          { material: ci(w) },
        ],
      });
    }
  }
  if (p.type?.length) {
    const { bySlug } = await getCategoryTree();
    const ids = p.type.flatMap((s) => (bySlug.get(s) ? descendantIds(bySlug.get(s)!) : []));
    and.push({ categoryId: { in: ids.length ? ids : ["__none__"] } });
  }
  if (p.brand?.length) and.push({ brand: { slug: { in: p.brand } } });
  if (p.min !== undefined) and.push({ sellingPrice: { gte: p.min } });
  if (p.max !== undefined) and.push({ sellingPrice: { lte: p.max } });
  if (p.discount) and.push({ discountPct: { gt: 0 } });
  if (p.gender && ["MEN", "WOMEN", "KIDS", "UNISEX"].includes(p.gender)) and.push({ gender: { in: [p.gender, "UNISEX"] } });
  const variantFilter: Prisma.ProductVariantWhereInput = { isActive: true };
  if (p.color?.length) variantFilter.color = { in: p.color };
  if (p.size?.length) variantFilter.size = { in: p.size };
  if (p.inStock) variantFilter.stock = { gt: 0 };
  if (p.color?.length || p.size?.length || p.inStock) and.push({ variants: { some: variantFilter } });

  const where: Prisma.ProductWhereInput = { AND: and };
  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    p.sort === "price-asc"
      ? [{ sellingPrice: "asc" }]
      : p.sort === "price-desc"
        ? [{ sellingPrice: "desc" }]
        : p.sort === "popular"
          ? [{ orderItems: { _count: "desc" } }, { isBestSeller: "desc" }, { createdAt: "desc" }]
          : [{ publishedAt: "desc" }, { createdAt: "desc" }];

  const page = p.page || 1;
  const [total, items, facetRows] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, select: cardSelect, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    db.product.findMany({
      where: base,
      select: {
        sellingPrice: true,
        categoryId: true,
        brand: { select: { name: true, slug: true } },
        variants: { where: { isActive: true }, select: { color: true, colorHex: true, size: true } },
      },
    }),
  ]);

  // Facets adapt to the products available in the current scope (category / brand / page).
  const brands = new Map<string, { slug: string; name: string; count: number }>();
  const colors = new Map<string, { name: string; hex: string | null; count: number }>();
  const sizes = new Map<string, number>();
  const catCount = new Map<string, number>();
  let minPrice = Infinity;
  let maxPrice = 0;
  for (const r of facetRows) {
    const b = brands.get(r.brand.slug) ?? { ...r.brand, count: 0 };
    b.count++;
    brands.set(r.brand.slug, b);
    catCount.set(r.categoryId, (catCount.get(r.categoryId) ?? 0) + 1);
    minPrice = Math.min(minPrice, r.sellingPrice);
    maxPrice = Math.max(maxPrice, r.sellingPrice);
    const seenC = new Set<string>();
    const seenS = new Set<string>();
    for (const v of r.variants) {
      if (v.color && !seenC.has(v.color)) {
        seenC.add(v.color);
        const c = colors.get(v.color) ?? { name: v.color, hex: v.colorHex, count: 0 };
        c.count++;
        colors.set(v.color, c);
      }
      if (v.size && !seenS.has(v.size)) {
        seenS.add(v.size);
        sizes.set(v.size, (sizes.get(v.size) ?? 0) + 1);
      }
    }
  }
  const { map, bySlug } = await getCategoryTree();
  // Product-type facet: children of the scoped category (or top-level categories when unscoped)
  const scopeNode = scope.categorySlug ? bySlug.get(scope.categorySlug) : undefined;
  const typeNodes = scopeNode ? scopeNode.children : [...map.values()].filter((n) => !n.parentId);
  const types = typeNodes
    .map((n) => ({ slug: n.slug, name: n.name, count: descendantIds(n).reduce((s, id) => s + (catCount.get(id) ?? 0), 0) }))
    .filter((t) => t.count > 0);

  const sizeRank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s);
    return i === -1 ? 999 : i;
  };

  return {
    total,
    items,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    facets: {
      brands: [...brands.values()].sort((a, b) => a.name.localeCompare(b.name)),
      colors: [...colors.values()].sort((a, b) => b.count - a.count),
      sizes: [...sizes.keys()].sort((a, b) => sizeRank(a) - sizeRank(b) || a.localeCompare(b, undefined, { numeric: true })),
      types,
      price: { min: Number.isFinite(minPrice) ? minPrice : 0, max: maxPrice },
    },
  };
}

export function productStock(variants: { stock: number }[]) {
  return variants.reduce((s, v) => s + Math.max(0, v.stock), 0);
}
