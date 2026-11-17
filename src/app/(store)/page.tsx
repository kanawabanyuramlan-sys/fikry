import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Truck,
  RefreshCw,
  MessageCircle,
  Mail,
  PRODUCT_GLYPHS,
  Tag,
  User,
  Sparkle,
} from "@/components/icons";
import { db } from "@/lib/db";
import { cardSelect, descendantIds, getCategoryTree, getTopSellerIds, PUBLISHED, type CardProduct } from "@/lib/catalog";
import { getActivePromotions } from "@/lib/promotions";
import { getSettings } from "@/lib/settings";
import { HeroCarousel } from "@/components/store/hero";
import { ProductCard } from "@/components/store/product-card";
import { ProductIllustration } from "@/components/illustration";
import { NewsletterForm } from "@/components/store/newsletter";
import { cn } from "@/lib/utils";

/* Hallmark · genre: editorial · macrostructure: Photographic · design-system: design.md · designed-as-app */

function SectionHead({ title, note, href, cta = "Lihat semua" }: { title: string; note?: string; href?: string; cta?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-serif text-[34px] leading-[1.05] tracking-[-.015em] sm:text-[44px]">{title}</h2>
        {note && <p className="mt-2 max-w-md text-sm text-ink-soft">{note}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap text-sm font-semibold text-ink sm:self-auto">
          {cta}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

function Rail({ items, topIds }: { items: CardProduct[]; topIds?: string[] }) {
  if (!items.length) return <p className="rounded-2xl bg-surface p-8 text-center text-sm text-ink-soft">Belum ada produk untuk ditampilkan.</p>;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
      {items.map((p) => (
        <div key={p.id} className="w-[46%] shrink-0 snap-start sm:w-[31%] lg:w-auto">
          <ProductCard p={p} bestSeller={topIds?.includes(p.id)} />
        </div>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const [promos, tree, top, s] = await Promise.all([getActivePromotions(), getCategoryTree(), getTopSellerIds(8), getSettings()]);
  const topIds = top.map((t) => t.id);
  const [newArrivals, soldProducts, flaggedBest, trending, brands, perCategory, counts] = await Promise.all([
    db.product.findMany({ where: { AND: [PUBLISHED, { isNewArrival: true }] }, orderBy: { publishedAt: "desc" }, take: 8, select: cardSelect }),
    topIds.length ? db.product.findMany({ where: { AND: [PUBLISHED, { id: { in: topIds } }] }, select: cardSelect }) : Promise.resolve([]),
    db.product.findMany({ where: { AND: [PUBLISHED, { isBestSeller: true }] }, orderBy: { updatedAt: "desc" }, take: 8, select: cardSelect }),
    db.product.findMany({ where: { AND: [PUBLISHED, { isFeatured: true }] }, orderBy: { updatedAt: "desc" }, take: 8, select: cardSelect }),
    db.brand.findMany({
      where: { isActive: true, products: { some: { status: "PUBLISHED" } } },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      include: { _count: { select: { products: { where: { status: "PUBLISHED" } } } } },
      take: 12,
    }),
    db.product.groupBy({ by: ["categoryId"], where: PUBLISHED, _count: true }),
    Promise.all([db.product.count({ where: PUBLISHED }), db.brand.count({ where: { isActive: true } }), db.category.count({ where: { isActive: true } })]),
  ]);
  // Best sellers: ranked by real units sold; topped up with staff-flagged picks while sales data is thin.
  const ranked = topIds.map((id) => soldProducts.find((p) => p.id === id)).filter(Boolean) as CardProduct[];
  const bestSellers = [...ranked, ...flaggedBest.filter((p) => !topIds.includes(p.id))].slice(0, 8);
  const featuredCats = tree.roots.filter((c) => c.isFeatured).slice(0, 5);
  const catCount = (ids: string[]) => perCategory.filter((r) => ids.includes(r.categoryId)).reduce((a, r) => a + r._count, 0);
  const [productCount, brandCount, categoryCount] = counts;
  const editorialPhoto = promos.heroes[1]?.image ?? promos.heroes[0]?.image ?? null;

  const services = [
    { icon: Truck, title: "Dikirim langsung oleh toko", text: s["shipping.estimate"] },
    { icon: RefreshCw, title: "Retur & tukar ukuran", text: "Ikuti kebijakan retur toko." },
    { icon: BadgeCheck, title: "Diperiksa sebelum dikirim", text: "Kondisi & kelengkapan dicek tim." },
    { icon: MessageCircle, title: "Tanya via WhatsApp", text: "Stok, ukuran, dan status pesanan." },
  ];

  return (
    <>
      <HeroCarousel
        slides={promos.heroes.map((h) => ({
          id: h.id, title: h.title, subtitle: h.subtitle, description: h.description, ctaLabel: h.ctaLabel,
          url: h.url, image: h.image, illustration: h.illustration, theme: h.theme,
        }))}
      />

      {/* Service row */}
      <section className="container-x pt-6">
        <ul className="grid grid-cols-1 gap-px overflow-hidden rounded-[22px] border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {services.map((v) => (
            <li key={v.title} className="flex items-start gap-3.5 bg-card p-5">
              <span className="icon-tile">
                <v.icon weight="duotone" className="h-[22px] w-[22px]" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{v.title}</p>
                <p className="mt-0.5 text-xs leading-snug text-ink-soft">{v.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {featuredCats.length > 0 && (
        <section className="container-x pt-20 sm:pt-28">
          <SectionHead title="Belanja per kategori" note="Sepatu, pakaian, tas, aksesori, dan kebutuhan harian dari berbagai brand." href="/shop" cta="Semua produk" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-5">
            {featuredCats.map((c) => {
              const Glyph = PRODUCT_GLYPHS[c.illustration ?? ""] ?? Tag;
              return (
                <Link key={c.id} href={`/c/${c.slug}`} className="group min-w-0">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-[18px] bg-surface">
                    {c.image ? (
                      <Image src={c.image} alt={c.name} fill sizes="(min-width:1024px) 20vw, 50vw" className="object-cover transition duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />
                    ) : (
                      <ProductIllustration type={c.illustration} caption={false} className="h-full w-full" />
                    )}
                  </div>
                  <div className="mt-3 flex items-center gap-2.5">
                    <Glyph weight="light" className="h-5 w-5 shrink-0 text-brand-dark" />
                    <span className="truncate font-medium">{c.name}</span>
                    <span className="ml-auto text-xs text-ink-soft">{catCount(descendantIds(c))}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-soft transition group-hover:text-ink" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="container-x pt-20 sm:pt-28">
        <SectionHead title="Baru tiba" note="Produk terbaru yang masuk katalog minggu ini." href="/new-arrivals" />
        <Rail items={newArrivals} />
      </section>

      {/* Editorial fold: one large photo, annotation beside it */}
      <section className="container-x pt-20 sm:pt-28">
        <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="relative min-h-[420px] overflow-hidden rounded-[28px] bg-surface lg:min-h-[620px]">
            {editorialPhoto && <Image src={editorialPhoto} alt="" fill sizes="(min-width:1024px) 55vw, 100vw" className="object-cover" />}
          </div>
          <div className="flex flex-col justify-between gap-10 rounded-[28px] bg-surface p-7 sm:p-10">
            <div>
              <h2 className="font-serif text-[38px] leading-[1.02] tracking-[-.015em] sm:text-[52px]">Dikurasi dengan tenang, dipakai setiap hari.</h2>
              <p className="mt-5 max-w-md leading-relaxed text-ink-soft">{s["store.description"]}</p>
            </div>
            <dl className="grid grid-cols-3 divide-x divide-rule border-y border-rule">
              {[
                [productCount, "produk aktif"],
                [brandCount, "brand"],
                [categoryCount, "kategori"],
              ].map(([v, l]) => (
                <div key={l as string} className="px-3 py-5 first:pl-0">
                  <dd className="font-serif text-4xl leading-none sm:text-5xl">{v}</dd>
                  <dt className="mt-2 text-xs text-ink-soft">{l}</dt>
                </div>
              ))}
            </dl>
            <ul className="divide-y divide-rule">
              {[
                { t: "Men", d: "Sepatu, outerwear, dan tas harian", href: "/men", icon: User },
                { t: "Women", d: "Pilihan nyaman dan tas", href: "/women", icon: Sparkle },
                { t: "Sale", d: "Harga spesial selama stok ada", href: "/sale", icon: Tag },
              ].map((x) => (
                <li key={x.t}>
                  <Link href={x.href} className="group flex items-center gap-4 py-4">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-card text-brand-dark">
                      <x.icon weight="duotone" className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{x.t}</span>
                      <span className="block truncate text-sm text-ink-soft">{x.d}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-ink-soft transition group-hover:translate-x-0.5 group-hover:text-ink" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-x pt-20 sm:pt-28">
        <SectionHead title="Paling dicari" note={ranked.length ? "Diurutkan dari jumlah terjual." : "Pilihan tim sambil data penjualan terkumpul."} href="/shop?sort=popular" />
        <Rail items={bestSellers} topIds={topIds} />
      </section>

      {promos.banners.length > 0 && (
        <section className="container-x pt-20 sm:pt-28">
          <div className="grid gap-5 md:grid-cols-2">
            {promos.banners.slice(0, 4).map((b) => (
              <Link key={b.id} href={b.url || "/shop"} className="group grid min-h-[260px] grid-cols-[minmax(0,1fr)_minmax(0,1fr)] overflow-hidden rounded-[24px] bg-surface">
                <div className="flex flex-col justify-center p-6 sm:p-8">
                  {b.subtitle && <p className="text-xs font-medium text-ink-soft">{b.subtitle}</p>}
                  <h3 className="mt-1.5 font-serif text-[28px] leading-[1.05] sm:text-[34px]">{b.title}</h3>
                  {b.description && <p className="mt-2 text-sm text-ink-soft">{b.description}</p>}
                  <span className="mt-5 inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-semibold">
                    {b.ctaLabel || "Lihat"} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
                <div className="relative">
                  {b.image ? (
                    <Image src={b.image} alt="" fill sizes="(min-width:768px) 25vw, 50vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />
                  ) : (
                    <ProductIllustration type={b.illustration} caption={false} className="h-full w-full" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {brands.length > 0 && (
        <section className="container-x pt-20 sm:pt-28">
          <SectionHead title="Brand di toko" href="/brands" cta="Semua brand" />
          <ul className="grid grid-cols-2 border-t border-rule sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((b) => (
              <li key={b.id} className="border-b border-rule">
                <Link href={`/brands/${b.slug}`} className="group flex items-center justify-between gap-3 py-5 pr-4">
                  {b.logo ? (
                    <Image src={b.logo} alt={b.name} width={110} height={36} className="h-8 w-auto object-contain" />
                  ) : (
                    <span className="truncate font-serif text-2xl">{b.name}</span>
                  )}
                  <span className="flex shrink-0 items-center gap-1 text-xs text-ink-soft">
                    {b._count.products}
                    <ArrowUpRight className="h-3.5 w-3.5 transition group-hover:text-ink" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="container-x pt-20 sm:pt-28">
        <SectionHead title="Sedang ramai" note="Pilihan tim untuk minggu ini." href="/shop?sort=popular" />
        <Rail items={trending} topIds={topIds} />
      </section>

      <section className="container-x pt-20 sm:pt-28">
        <div className={cn("grid items-center gap-8 rounded-[28px] bg-surface p-7 sm:p-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]")}>
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-card text-brand-dark">
              <Mail weight="duotone" className="h-6 w-6" />
            </span>
            <div>
              <h2 className="font-serif text-[32px] leading-[1.05] sm:text-[40px]">Kabar koleksi baru, tanpa spam.</h2>
              <p className="mt-2 text-sm text-ink-soft">Info restock dan promo dari toko. Berhenti berlangganan kapan saja.</p>
            </div>
          </div>
          <div className="w-full max-w-md lg:justify-self-end">
            <NewsletterForm />
          </div>
        </div>
      </section>
    </>
  );
}
