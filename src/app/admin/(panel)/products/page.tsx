import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search } from "@/components/icons";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { ci, productStock } from "@/lib/catalog";
import { PRODUCT_STATUSES, PRODUCT_STATUS_LABEL } from "@/lib/constants";
import { rupiah, timeAgo } from "@/lib/format";
import { Empty, PageHeader, Pager, Panel, ProductStatusBadge, qs, TableWrap } from "@/components/admin/ui";
import { ProductIllustration } from "@/components/illustration";

export const metadata: Metadata = { title: "Products" };
const PER = 25;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireStaffPage("products.view");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const where: Prisma.ProductWhereInput = { AND: [] };
  const and = where.AND as Prisma.ProductWhereInput[];
  if (sp.status && (PRODUCT_STATUSES as readonly string[]).includes(sp.status)) and.push({ status: sp.status });
  if (sp.brand) and.push({ brandId: sp.brand });
  if (sp.mine === "1") and.push({ createdById: me.id });
  if (sp.q) and.push({ OR: [{ name: ci(sp.q) }, { sku: ci(sp.q) }, { brand: { name: ci(sp.q) } }] });
  const [items, total, counts, brands] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER,
      take: PER,
      include: {
        brand: { select: { name: true } },
        category: { select: { name: true } },
        images: { take: 1, orderBy: { sortOrder: "asc" } },
        variants: { select: { stock: true, colorHex: true, isActive: true } },
        createdBy: { select: { name: true } },
        updatedBy: { select: { name: true } },
      },
    }),
    db.product.count({ where }),
    db.product.groupBy({ by: ["status"], _count: true }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const tabs = [{ v: undefined, l: "Semua", n: counts.reduce((a, c) => a + c._count, 0) }, ...PRODUCT_STATUSES.map((s) => ({ v: s, l: PRODUCT_STATUS_LABEL[s]!, n: countOf(s) }))];
  const href = (over: Record<string, string | undefined>) => qs("/admin/products", { q: sp.q, status: sp.status, brand: sp.brand, mine: sp.mine, ...over });

  return (
    <>
      <PageHeader
        title="Product Management"
        description="Satu database produk untuk seluruh tim. Perubahan langsung terlihat oleh anggota lain."
        actions={
          can(me, "products.create") && (
            <Link href="/admin/products/new" className="btn btn-primary">
              <Plus className="h-4 w-4" /> Add Product
            </Link>
          )
        }
      />
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {tabs.map((t) => (
          <Link key={t.l} href={href({ status: t.v, page: undefined })} className={`chip shrink-0 ${sp.status === t.v ? "chip-active" : ""}`}>
            {t.l} <span className="opacity-60">{t.n}</span>
          </Link>
        ))}
        <Link href={href({ mine: sp.mine === "1" ? undefined : "1", page: undefined })} className={`chip shrink-0 ${sp.mine === "1" ? "chip-active" : ""}`}>
          Buatan saya
        </Link>
      </div>
      <Panel pad={false}>
        <form className="flex flex-wrap gap-2 border-b border-ink/[.07] p-4" action="/admin/products">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <label className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
            <input name="q" defaultValue={sp.q} placeholder="Cari nama, SKU atau brand" className="input pl-9" />
          </label>
          <select name="brand" defaultValue={sp.brand ?? ""} className="input w-auto" aria-label="Filter brand">
            <option value="">Semua brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button className="btn btn-dark btn-sm">Filter</button>
        </form>
        {items.length ? (
          <TableWrap>
            <table className="table-x">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Status</th>
                  <th className="text-right">Harga</th>
                  <th className="text-right">Stok</th>
                  <th>Dibuat / diubah</th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const stock = productStock(p.variants.filter((v) => v.isActive));
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-brand-off">
                            {p.images[0] ? (
                              <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-contain" />
                            ) : (
                              <ProductIllustration type={p.illustration} color={p.variants.find((v) => v.colorHex)?.colorHex} className="h-full w-full" />
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className="block max-w-[280px] truncate font-semibold hover:underline">{p.name}</span>
                            <span className="text-xs text-ink-soft">
                              {p.brand.name} · {p.category.name} · <span className="font-mono">{p.sku}</span>
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td>
                        <ProductStatusBadge status={p.status} outcome={p.reviewOutcome} />
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <span className="font-semibold">{rupiah(p.sellingPrice)}</span>
                        {p.discountPct > 0 && <span className="block text-[11px] text-sale">-{p.discountPct}%</span>}
                      </td>
                      <td className={`text-right font-semibold ${stock === 0 ? "text-sale" : ""}`}>{stock}</td>
                      <td className="whitespace-nowrap text-xs text-ink-soft">
                        {p.createdBy?.name ?? "—"}
                        <br />
                        {p.updatedBy?.name ?? "—"} · {timeAgo(p.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <Empty
            title="Tidak ada produk"
            text={sp.q || sp.status ? "Coba ubah filter pencarian." : "Mulai tambahkan produk pertama untuk katalog toko."}
            action={can(me, "products.create") && <Link href="/admin/products/new" className="btn btn-primary btn-sm">Add Product</Link>}
          />
        )}
        <Pager page={page} pages={Math.ceil(total / PER)} href={(n) => href({ page: String(n) })} />
      </Panel>
    </>
  );
}
