import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "@/components/icons";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { ci } from "@/lib/catalog";
import { getSettings, settingInt } from "@/lib/settings";
import { fmtDateTime } from "@/lib/format";
import { Badge, Empty, PageHeader, Pager, Panel, qs, TableWrap } from "@/components/admin/ui";
import { ActionForm, SubmitButton } from "@/components/forms";
import { updateStock } from "@/app/admin/actions/ops";

export const metadata: Metadata = { title: "Inventory" };
const PER = 40;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireStaffPage("inventory.view");
  const sp = await searchParams;
  const s = await getSettings();
  const low = settingInt(s, "inventory.lowStock");
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const and: Prisma.ProductVariantWhereInput[] = [{ isActive: true }];
  if (sp.low === "1") and.push({ stock: { lte: low } });
  if (sp.out === "1") and.push({ stock: 0 });
  if (sp.q) and.push({ OR: [{ sku: ci(sp.q) }, { product: { name: ci(sp.q) } }, { product: { brand: { name: ci(sp.q) } } }] });
  const where = { AND: and };
  const [rows, total, totals, movements] = await Promise.all([
    db.productVariant.findMany({
      where,
      orderBy: [{ stock: "asc" }, { product: { name: "asc" } }],
      skip: (page - 1) * PER,
      take: PER,
      include: { product: { select: { id: true, name: true, status: true, brand: { select: { name: true } } } } },
    }),
    db.productVariant.count({ where }),
    db.productVariant.aggregate({ where: { isActive: true }, _sum: { stock: true }, _count: true }),
    db.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { user: { select: { name: true } }, variant: { select: { sku: true, product: { select: { name: true } } } } },
    }),
  ]);
  const lowCount = await db.productVariant.count({ where: { isActive: true, stock: { lte: low } } });
  const edit = can(me, "inventory.update");
  const href = (o: Record<string, string | undefined>) => qs("/admin/inventory", { q: sp.q, low: sp.low, out: sp.out, ...o });

  return (
    <>
      <PageHeader title="Inventory" description={`Stok per varian. Ambang stok menipis: ≤ ${low} (atur di Settings).`} />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="label">Total unit</p>
          <p className="text-2xl font-extrabold">{totals._sum.stock ?? 0}</p>
        </div>
        <div className="card p-4">
          <p className="label">Varian aktif</p>
          <p className="text-2xl font-extrabold">{totals._count}</p>
        </div>
        <Link href={href({ low: "1", out: undefined, page: undefined })} className="card p-4">
          <p className="label">Stok menipis</p>
          <p className="text-2xl font-extrabold text-sale">{lowCount}</p>
        </Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={href({ low: undefined, out: undefined, page: undefined })} className={`chip ${!sp.low && !sp.out ? "chip-active" : ""}`}>
          Semua
        </Link>
        <Link href={href({ low: "1", out: undefined, page: undefined })} className={`chip ${sp.low === "1" ? "chip-active" : ""}`}>
          Low stock
        </Link>
        <Link href={href({ out: "1", low: undefined, page: undefined })} className={`chip ${sp.out === "1" ? "chip-active" : ""}`}>
          Habis
        </Link>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Panel pad={false}>
          <form action="/admin/inventory" className="flex gap-2 border-b border-ink/[.07] p-4">
            <label className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
              <input name="q" defaultValue={sp.q} placeholder="Cari produk, brand atau SKU" className="input pl-9" />
            </label>
            <button className="btn btn-dark btn-sm">Cari</button>
          </form>
          {rows.length ? (
            <TableWrap>
              <table className="table-x">
                <thead>
                  <tr>
                    <th>Produk / varian</th>
                    <th className="text-right">Stok</th>
                    {edit && <th>Update stok</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id}>
                      <td>
                        <Link href={`/admin/products/${v.product.id}`} className="font-semibold hover:underline">
                          {v.product.name}
                        </Link>
                        <p className="text-xs text-ink-soft">
                          {v.product.brand.name} · {[v.color, v.size].filter(Boolean).join(" / ") || "Standar"} · <span className="font-mono">{v.sku}</span>
                          {v.product.status !== "PUBLISHED" && <> · {v.product.status}</>}
                        </p>
                      </td>
                      <td className="text-right">
                        <Badge tone={v.stock === 0 ? "red" : v.stock <= low ? "amber" : "green"}>{v.stock}</Badge>
                      </td>
                      {edit && (
                        <td>
                          <ActionForm action={updateStock} className="flex flex-wrap items-center gap-1.5">
                            <input type="hidden" name="variantId" value={v.id} />
                            <select name="mode" defaultValue="set" className="input w-auto py-1.5 text-xs" aria-label="Mode">
                              <option value="set">Set ke</option>
                              <option value="delta">+/−</option>
                            </select>
                            <input name="value" type="number" required defaultValue={v.stock} className="input w-20 py-1.5 text-xs" aria-label="Jumlah" />
                            <input name="note" placeholder="Catatan" className="input w-28 py-1.5 text-xs" aria-label="Catatan" />
                            <SubmitButton className="btn-outline btn-sm">Simpan</SubmitButton>
                          </ActionForm>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <Empty title="Tidak ada varian" text="Tidak ada stok yang cocok dengan filter." />
          )}
          <Pager page={page} pages={Math.ceil(total / PER)} href={(n) => href({ page: String(n) })} />
        </Panel>
        <Panel title="Stock movements" description="Setiap perubahan stok tercatat">
          <ul className="space-y-3 text-sm">
            {movements.map((m) => (
              <li key={m.id} className="border-b border-ink/[.06] pb-2">
                <p className="font-medium">
                  <span className={m.delta >= 0 ? "text-brand-dark" : "text-sale"}>{m.delta >= 0 ? `+${m.delta}` : m.delta}</span> {m.variant.product.name}
                </p>
                <p className="text-xs text-ink-soft">
                  {m.reason} {m.reference && `· ${m.reference}`} · sisa {m.stockAfter} · {m.user?.name ?? "Sistem"} · {fmtDateTime(m.createdAt)}
                </p>
              </li>
            ))}
            {!movements.length && <li className="text-ink-soft">Belum ada pergerakan stok.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
