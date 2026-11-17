import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "@/components/icons";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { ci } from "@/lib/catalog";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime, rupiah } from "@/lib/format";
import { Badge, Empty, OrderStatusBadge, PageHeader, Pager, Panel, PaymentBadge, qs, TableWrap } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Orders" };
const PER = 25;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaffPage("orders.view");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const and: Prisma.OrderWhereInput[] = [];
  if (sp.status && (ORDER_STATUSES as readonly string[]).includes(sp.status)) and.push({ status: sp.status });
  if (sp.pay) and.push({ paymentStatus: sp.pay });
  if (sp.q) and.push({ OR: [{ orderNumber: ci(sp.q.toUpperCase()) }, { name: ci(sp.q) }, { email: ci(sp.q) }, { phone: ci(sp.q) }, { trackingNumber: ci(sp.q) }] });
  const where = { AND: and };
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const href = (o: Record<string, string | undefined>) => qs("/admin/orders", { q: sp.q, status: sp.status, pay: sp.pay, ...o });
  return (
    <>
      <PageHeader title="Orders & Shipping" description="Pengiriman dikelola langsung oleh toko. Ubah status, kurir dan nomor resi dari detail pesanan." />
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        <Link href={href({ status: undefined, page: undefined })} className={`chip shrink-0 ${!sp.status ? "chip-active" : ""}`}>
          Semua <span className="opacity-60">{counts.reduce((a, c) => a + c._count, 0)}</span>
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, page: undefined })} className={`chip shrink-0 ${sp.status === s ? "chip-active" : ""}`}>
            {ORDER_STATUS_LABEL[s]} <span className="opacity-60">{counts.find((c) => c.status === s)?._count ?? 0}</span>
          </Link>
        ))}
      </div>
      <Panel pad={false}>
        <form action="/admin/orders" className="flex flex-wrap gap-2 border-b border-ink/[.07] p-4">
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <label className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-ink-soft" />
            <input name="q" defaultValue={sp.q} placeholder="Order ID, nama, email, telepon, resi" className="input pl-9" />
          </label>
          <select name="pay" defaultValue={sp.pay ?? ""} className="input w-auto" aria-label="Status pembayaran">
            <option value="">Semua pembayaran</option>
            <option value="UNPAID">Belum dibayar</option>
            <option value="PAID">Lunas</option>
            <option value="REFUNDED">Refund</option>
          </select>
          <button className="btn btn-dark btn-sm">Cari</button>
        </form>
        {orders.length ? (
          <TableWrap>
            <table className="table-x">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Pelanggan</th>
                  <th>Status</th>
                  <th>Pembayaran</th>
                  <th>Pengiriman</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap">
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-bold hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-[11px] text-ink-soft">{fmtDateTime(o.createdAt)}</p>
                      {o.channel === "WHATSAPP" && <Badge tone="green">WhatsApp</Badge>}
                    </td>
                    <td>
                      <p className="max-w-[180px] truncate font-medium">{o.name}</p>
                      <p className="text-xs text-ink-soft">
                        {o.city} · {o._count.items} item
                      </p>
                    </td>
                    <td>
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td>
                      <PaymentBadge status={o.paymentStatus} />
                    </td>
                    <td className="text-xs">{o.trackingNumber ? <span className="font-mono">{o.shippingProvider} {o.trackingNumber}</span> : <span className="text-ink-soft">—</span>}</td>
                    <td className="whitespace-nowrap text-right font-semibold">{rupiah(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <Empty title="Belum ada pesanan" text="Pesanan pelanggan dari checkout website & WhatsApp akan tampil di sini." />
        )}
        <Pager page={page} pages={Math.ceil(total / PER)} href={(n) => href({ page: String(n) })} />
      </Panel>
    </>
  );
}
