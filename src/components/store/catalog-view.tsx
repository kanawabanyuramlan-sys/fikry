import Link from "next/link";
import { ChevronRight, SearchX } from "@/components/icons";
import { getTopSellerIds, parseCatalogParams, searchCatalog, type CatalogScope } from "@/lib/catalog";
import { ProductGrid } from "./product-card";
import { ActiveFilters, FilterSidebar, MobileFilters, SortSelect } from "./filters";
import { cn } from "@/lib/utils";

export type Crumb = { label: string; href?: string };

export async function CatalogView({
  scope,
  searchParams,
  title,
  eyebrow,
  description,
  crumbs = [],
  basePath,
  hide = {},
  banner,
}: {
  scope: CatalogScope;
  searchParams: Record<string, string | string[] | undefined>;
  title: string;
  eyebrow?: string;
  description?: string | null;
  crumbs?: Crumb[];
  basePath: string;
  hide?: { brand?: boolean; gender?: boolean };
  banner?: React.ReactNode;
}) {
  const params = parseCatalogParams(searchParams);
  const [res, top] = await Promise.all([searchCatalog(scope, params), getTopSellerIds(12)]);
  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && k !== "page") p.set(k, v);
    if (n > 1) p.set("page", String(n));
    const qs = p.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="container-x pb-10 pt-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-xs text-ink-soft">
        <Link href="/" className="hover:text-ink">
          Home
        </Link>
        {crumbs.map((c) => (
          <span key={c.label} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3" />
            {c.href ? (
              <Link href={c.href} className="hover:text-ink">
                {c.label}
              </Link>
            ) : (
              <span className="text-ink">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      {banner}
      <header className="mb-6 flex flex-col gap-2">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="h-display text-4xl sm:text-5xl">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-ink-soft sm:text-base">{description}</p>}
      </header>

      <div className="sticky top-16 z-20 -mx-4 mb-6 flex items-center justify-between gap-3 border-y border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-x-0 lg:bg-transparent lg:px-0">
        <div className="flex items-center gap-3">
          <MobileFilters facets={res.facets} hide={hide} total={res.total} />
          <p className="whitespace-nowrap text-sm text-ink-soft" aria-live="polite">
            <span className="font-bold text-ink">{res.total}</span> produk
          </p>
        </div>
        <SortSelect />
      </div>

      <div className="grid gap-10 lg:grid-cols-[250px_1fr]">
        <FilterSidebar facets={res.facets} hide={hide} />
        <div className="min-w-0">
          <div className="mb-5">
            <ActiveFilters facets={res.facets} />
          </div>
          {res.items.length ? (
            <ProductGrid items={res.items} topIds={top.map((t) => t.id)} />
          ) : (
            <div className="grid place-items-center rounded-3xl bg-brand-off px-6 py-20 text-center">
              <SearchX className="h-10 w-10 text-ink-soft/60" />
              <p className="mt-4 text-lg font-bold">Tidak ada produk yang cocok</p>
              <p className="mt-1 max-w-sm text-sm text-ink-soft">Coba kurangi filter atau gunakan kata kunci lain.</p>
              <Link href={basePath} className="btn btn-primary mt-6">
                Reset filter
              </Link>
            </div>
          )}
          {res.pages > 1 && (
            <nav aria-label="Halaman" className="mt-12 flex flex-wrap items-center justify-center gap-2">
              {res.page > 1 && (
                <Link href={pageHref(res.page - 1)} className="btn btn-outline btn-sm">
                  Sebelumnya
                </Link>
              )}
              {Array.from({ length: res.pages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === res.pages || Math.abs(n - res.page) <= 1)
                .map((n) => (
                  <Link
                    key={n}
                    href={pageHref(n)}
                    aria-current={n === res.page ? "page" : undefined}
                    className={cn("grid h-9 min-w-9 place-items-center rounded-full px-3 text-sm font-semibold", n === res.page ? "bg-ink text-paper" : "hover:bg-ink/5")}
                  >
                    {n}
                  </Link>
                ))}
              {res.page < res.pages && (
                <Link href={pageHref(res.page + 1)} className="btn btn-outline btn-sm">
                  Berikutnya
                </Link>
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
