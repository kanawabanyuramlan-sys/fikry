import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Star, Eye } from "@/components/icons";
import { db } from "@/lib/db";
import { cardSelect, categoryPath, getCategoryTree, PUBLISHED, productStock } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { can, getCustomer, getStaff } from "@/lib/auth";
import { CONDITIONS, GENDERS, PRODUCT_STATUS_LABEL } from "@/lib/constants";
import { fmtDate, parseJson } from "@/lib/format";
import { appUrl } from "@/lib/mailer";
import { PdpClient } from "@/components/store/pdp-client";
import { ProductGrid } from "@/components/store/product-card";
import { ReviewForm } from "@/components/store/review-form";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      reviews: { where: { status: "APPROVED" }, orderBy: { createdAt: "desc" }, include: { customer: { select: { name: true } } } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p) return { title: "Produk tidak ditemukan" };
  const title = p.seoTitle || `${p.brand.name} ${p.name}`;
  const description = p.seoDescription || p.description.slice(0, 155);
  return {
    title,
    description,
    alternates: { canonical: `/p/${p.slug}` },
    robots: p.status === "PUBLISHED" ? undefined : { index: false, follow: false },
    openGraph: { title, description, type: "website", images: p.images[0] ? [{ url: p.images[0].url }] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const p = await load(slug);
  if (!p) notFound();
  let preview = false;
  if (p.status !== "PUBLISHED" || !p.brand.isActive) {
    // Team members can preview unpublished products (e.g. during approval); customers cannot.
    const staff = await getStaff();
    if (!can(staff, "products.view")) notFound();
    preview = true;
  }
  const [s, tree, customer] = await Promise.all([getSettings(), getCategoryTree(), getCustomer()]);
  const node = tree.map.get(p.categoryId);
  const path = node ? categoryPath(node, tree.map) : [];
  const attrs = parseJson<{ name: string; value: string }[]>(p.attributes, []);
  const rating = p.reviews.length ? p.reviews.reduce((a, r) => a + r.rating, 0) / p.reviews.length : 0;
  const stock = productStock(p.variants);

  const related = await db.product.findMany({
    where: { AND: [PUBLISHED, { id: { not: p.id } }, { OR: [{ categoryId: p.categoryId }, { brandId: p.brandId }] }] },
    orderBy: [{ isBestSeller: "desc" }, { publishedAt: "desc" }],
    take: 4,
    select: cardSelect,
  });

  const specs: [string, string][] = [
    ["Brand", p.brand.name],
    ["Kategori", path.map((c) => c.name).join(" / ") || p.category.name],
    ["SKU", p.sku],
    ["Gender", GENDERS[p.gender] ?? p.gender],
    ["Kondisi", CONDITIONS[p.condition] ?? p.condition],
    ...(p.material ? [["Material", p.material] as [string, string]] : []),
    ...attrs.filter((a) => a.name && a.value).map((a) => [a.name, a.value] as [string, string]),
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.sku,
    description: p.description,
    brand: { "@type": "Brand", name: p.brand.name },
    category: path.map((c) => c.name).join(" > "),
    image: p.images.map((i) => (i.url.startsWith("http") ? i.url : appUrl() + i.url)),
    itemCondition: p.condition === "NEW" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
    offers: {
      "@type": "Offer",
      url: `${appUrl()}/p/${p.slug}`,
      priceCurrency: "IDR",
      price: p.sellingPrice,
      availability: stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(p.reviews.length ? { aggregateRating: { "@type": "AggregateRating", ratingValue: rating.toFixed(1), reviewCount: p.reviews.length } } : {}),
  };

  return (
    <div className="container-x pb-10 pt-6">
      {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}
      {preview && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm">
          <Eye className="h-4 w-4" /> Mode pratinjau tim — status produk: <b>{PRODUCT_STATUS_LABEL[p.status]}</b>. Halaman ini tidak terlihat oleh pelanggan.
          <Link href={`/admin/products/${p.id}`} className="link ml-auto">
            Edit
          </Link>
        </div>
      )}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1 text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        {path.map((c) => (
          <span key={c.id} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            <Link href={`/c/${c.slug}`} className="hover:text-ink">
              {c.name}
            </Link>
          </span>
        ))}
        <ChevronRight className="h-3 w-3" />
        <span className="line-clamp-1 text-ink">{p.name}</span>
      </nav>

      <PdpClient
        product={{
          id: p.id,
          name: p.name,
          slug: p.slug,
          sellingPrice: p.sellingPrice,
          originalPrice: p.originalPrice,
          discountPct: p.discountPct,
          variants: p.variants.map((v) => ({ id: v.id, color: v.color, colorHex: v.colorHex, size: v.size, stock: v.stock })),
        }}
        images={p.images.map((i) => ({ url: i.url, alt: i.alt, isSample: i.isSample }))}
        illustration={p.illustration}
        brand={{ name: p.brand.name, slug: p.brand.slug }}
        conditionLabel={CONDITIONS[p.condition] ?? p.condition}
        rating={{ avg: rating, count: p.reviews.length }}
        shippingNote={s["shipping.estimate"]}
      />

      <section className="mt-16 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
        <div className="divide-y divide-ink/10 border-y border-ink/10">
          <details open className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold">
              Deskripsi <span className="text-2xl font-light transition group-open:rotate-45">+</span>
            </summary>
            <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/80">{p.description}</div>
          </details>
          <details open className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold">
              Spesifikasi <span className="text-2xl font-light transition group-open:rotate-45">+</span>
            </summary>
            <dl className="mt-4 grid grid-cols-[minmax(110px,40%)_1fr] gap-y-2.5 text-sm">
              {specs.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </details>
          {[
            ["Pengiriman", s["page.shipping"], "/pages/shipping"],
            ["Garansi", s["page.warranty"], "/pages/warranty"],
            ["Retur & Penukaran", s["page.returns"], "/pages/returns"],
          ].map(([title, body, href]) => (
            <details key={title} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-lg font-bold">
                {title} <span className="text-2xl font-light transition group-open:rotate-45">+</span>
              </summary>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink/80">{body}</div>
              <Link href={href!} className="link mt-3 inline-block text-sm">
                Selengkapnya
              </Link>
            </details>
          ))}
        </div>

        <div id="reviews" className="scroll-mt-28">
          <h2 className="font-serif text-[32px] leading-[1.05]">Ulasan Pelanggan</h2>
          {p.reviews.length > 0 ? (
            <p className="mt-2 flex items-center gap-2 text-sm">
              <Star className="h-4 w-4 fill-ink" /> <b>{rating.toFixed(1)}</b> dari 5 · {p.reviews.length} ulasan
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">Belum ada ulasan untuk produk ini.</p>
          )}
          <ul className="mt-6 space-y-5">
            {p.reviews.slice(0, 10).map((r) => (
              <li key={r.id} className="border-b border-ink/10 pb-5">
                <div className="flex items-center justify-between">
                  <span className="flex">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={n <= r.rating ? "h-4 w-4 fill-warn text-warn" : "h-4 w-4 text-ink/15"} />
                    ))}
                  </span>
                  <span className="text-xs text-ink-soft">{fmtDate(r.createdAt)}</span>
                </div>
                {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                <p className="mt-1 text-sm text-ink/80">{r.body}</p>
                <p className="mt-2 text-xs text-ink-soft">— {r.customer.name.split(" ")[0]}</p>
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {customer ? (
              <ReviewForm productId={p.id} />
            ) : (
              <p className="rounded-2xl bg-brand-off p-5 text-sm">
                <Link href={`/account/login?next=/p/${p.slug}%23reviews`} className="link">
                  Login
                </Link>{" "}
                untuk menulis ulasan.
              </p>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-7 font-serif text-[34px] leading-[1.05] sm:text-[44px]">You may also like</h2>
          <ProductGrid items={related} />
        </section>
      )}
    </div>
  );
}
