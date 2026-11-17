import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "@/components/icons";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { ci } from "@/lib/catalog";
import { fmtDate, rupiah } from "@/lib/format";
import { Badge, Empty, PageHeader, Pager, Panel, qs, TableWrap } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customers" };
const PER = 30;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaffPage("customers.view");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const where = sp.q ? { OR: [{ name: ci(sp.q) }, { email: ci(sp.q) }, { phone: ci(sp.q) }] } : {};
  const [rows, total] = await Promise.all([
    db.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { orders: true } } } }),
    db.customer.count({ where }),
  ]);
  const spend = await db.order.groupBy({
    by: ["customerId"],
    where: { customerId: { in: rows.map((r) => r.id) }, status: { not: "CANCELLED" } },
    _sum: { total: true },
  });
  return (
    <>
      <PageHeader title="Customers" description="Pelanggan terdaftar dan pembeli tamu (dari checkout)." />
      <Panel pad={false}>
        <form action="/admin/customers" className="flex gap-2 border-b border-ink/[.07] p-4">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
            <input name="q" defaultValue={sp.q} placeholder="Nama, email atau telepon" className="input pl-9" />
          </label>
          <button className="btn btn-dark btn-sm">Cari</button>
        </form>
        {rows.length ? (
          <TableWrap>
            <table className="table-x">
              <thead>
                <tr>
                  <th>Pelanggan</th>
                  <th>Tipe</th>
                  <th className="text-right">Pesanan</th>
                  <th className="text-right">Total belanja</th>
                  <th>Bergabung</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/customers/${c.id}`} className="font-semibold hover:underline">
                        {c.name}
                      </Link>
                      <p className="text-xs text-ink-soft">
                        {c.email} {c.phone && `· ${c.phone}`}
                      </p>
                    </td>
                    <td>{c.passwordHash ? <Badge tone="green">Member</Badge> : <Badge>Tamu</Badge>}</td>
                    <td className="text-right">{c._count.orders}</td>
                    <td className="text-right font-semibold">{rupiah(spend.find((s) => s.customerId === c.id)?._sum.total ?? 0)}</td>
                    <td className="text-xs text-ink-soft">{fmtDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <Empty title="Belum ada pelanggan" />
        )}
        <Pager page={page} pages={Math.ceil(total / PER)} href={(n) => qs("/admin/customers", { q: sp.q, page: String(n) })} />
      </Panel>
    </>
  );
}
