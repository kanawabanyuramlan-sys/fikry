import Link from "next/link";
import { AlertTriangle, ArrowRight } from "@/components/icons";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { getSettings, settingInt } from "@/lib/settings";
import { fmtDate, rupiah, timeAgo } from "@/lib/format";
import { Empty, OrderStatusBadge, PageHeader, Panel, PaymentBadge, Stat, TableWrap } from "@/components/admin/ui";
import { SalesChart } from "@/components/admin/sales-chart";

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export default async function Overview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const me = await requireStaffPage();
  const { denied } = await searchParams;
  const s = await getSettings();
  const low = settingInt(s, "inventory.lowStock");
  const canFin = can(me, "analytics.view");
  const canOrders = can(me, "orders.view");
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 29);

  const [revenue, gross, orderCount, productCount, activeProducts, customerCount, pendingOrders, lowStock, recentOrders, recent, salesRows, pendingApproval] =
    await Promise.all([
      canFin ? db.order.aggregate({ _sum: { total: true }, where: { paymentStatus: "PAID", status: { not: "CANCELLED" } } }) : null,
      canFin ? db.order.aggregate({ _sum: { total: true }, where: { status: { not: "CANCELLED" } } }) : null,
      db.order.count(),
      db.product.count(),
      db.product.count({ where: { status: "PUBLISHED" } }),
      db.customer.count(),
      db.order.count({ where: { status: "RECEIVED" } }),
      can(me, "inventory.view")
        ? db.productVariant.findMany({
            where: { isActive: true, stock: { lte: low }, product: { status: "PUBLISHED" } },
            include: { product: { select: { id: true, name: true } } },
            orderBy: { stock: "asc" },
            take: 6,
          })
        : [],
      canOrders ? db.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }) : [],
      can(me, "activity.view") ? db.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { user: { select: { name: true } } } }) : [],
      canFin ? db.order.findMany({ where: { createdAt: { gte: since }, status: { not: "CANCELLED" } }, select: { createdAt: true, total: true } }) : [],
      can(me, "products.publish") ? db.product.count({ where: { status: "PENDING" } }) : 0,
    ]);
  const lowCount = can(me, "inventory.view")
    ? await db.productVariant.count({ where: { isActive: true, stock: { lte: low }, product: { status: "PUBLISHED" } } })
    : 0;

  // bucket real orders per day
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    return { key: dayKey(d), label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }), total: 0, count: 0 };
  });
  const idx = new Map(days.map((d, i) => [d.key, i]));
  for (const o of salesRows) {
    const k = dayKey(o.createdAt);
    const i = idx.get(k);
    if (i !== undefined) {
      days[i]!.total += o.total;
      days[i]!.count += 1;
    }
  }

  return (
    <>
      <PageHeader title={`Halo, ${me.name.split(" ")[0]} 👋`} description={`${me.role.name} · ringkasan toko hari ini`} />
      {denied && (
        <p className="mb-5 flex items-center gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <AlertTriangle className="h-4 w-4" /> Anda tidak memiliki izin untuk membuka halaman tersebut.
        </p>
      )}
      {pendingApproval > 0 && (
        <Link href="/admin/products?status=PENDING" className="mb-5 flex items-center gap-3 rounded-2xl bg-brand-lime/40 px-4 py-3 text-sm font-semibold">
          {pendingApproval} produk menunggu approval Anda <ArrowRight className="ml-auto h-4 w-4" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {canFin && <Stat accent label="Total Revenue" value={rupiah(revenue?._sum.total ?? 0)} hint={`Pesanan lunas · nilai pesanan aktif ${rupiah(gross?._sum.total ?? 0)}`} />}
        <Stat label="Total Orders" value={orderCount} hint={`${pendingOrders} menunggu konfirmasi`} />
        <Stat label="Total Products" value={productCount} hint={`${activeProducts} aktif dipublikasikan`} />
        <Stat label="Total Customers" value={customerCount} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active Products" value={activeProducts} />
        <Stat label="Pending Orders" value={pendingOrders} />
        <Stat label="Low Stock" value={lowCount} hint={`varian stok ≤ ${low}`} />
        <Stat label="Pending Approval" value={await db.product.count({ where: { status: "PENDING" } })} />
      </div>

      {canFin && (
        <Panel className="mt-6" title="Sales Overview" description="Nilai pesanan (tidak termasuk dibatalkan) 30 hari terakhir — data nyata dari database">
          {salesRows.length ? <SalesChart days={days} /> : <Empty title="Belum ada penjualan" text="Grafik akan terisi otomatis saat pesanan pertama masuk." />}
        </Panel>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {canOrders && (
          <Panel title="Recent Orders" actions={<Link href="/admin/orders" className="text-sm font-semibold text-brand-dark">Semua →</Link>} pad={false}>
            {recentOrders.length ? (
              <TableWrap>
                <table className="table-x">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Pelanggan</th>
                      <th>Status</th>
                      <th>Bayar</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o) => (
                      <tr key={o.id}>
                        <td>
                          <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-bold hover:underline">
                            {o.orderNumber}
                          </Link>
                          <p className="text-[11px] text-ink-soft">{fmtDate(o.createdAt)}</p>
                        </td>
                        <td className="max-w-[160px] truncate">{o.name}</td>
                        <td>
                          <OrderStatusBadge status={o.status} />
                        </td>
                        <td>
                          <PaymentBadge status={o.paymentStatus} />
                        </td>
                        <td className="text-right font-semibold">{rupiah(o.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            ) : (
              <Empty title="Belum ada pesanan" text="Pesanan dari checkout pelanggan akan muncul di sini." />
            )}
          </Panel>
        )}
        <div className="min-w-0 space-y-6">
          {can(me, "inventory.view") && (
            <Panel title="Low Stock" actions={<Link href="/admin/inventory?low=1" className="text-sm font-semibold text-brand-dark">Inventori →</Link>}>
              {lowStock.length ? (
                <ul className="space-y-2.5 text-sm">
                  {lowStock.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3">
                      <Link href={`/admin/products/${v.product.id}`} className="min-w-0 truncate hover:underline">
                        {v.product.name} <span className="text-ink-soft">· {[v.color, v.size].filter(Boolean).join("/")}</span>
                      </Link>
                      <span className={`badge ${v.stock === 0 ? "bg-sale/10 text-sale" : "bg-warn-soft text-warn"}`}>{v.stock}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-soft">Semua stok aman.</p>
              )}
            </Panel>
          )}
          {can(me, "activity.view") && (
            <Panel title="Recent Activities" actions={<Link href="/admin/activity" className="text-sm font-semibold text-brand-dark">Log →</Link>}>
              <ul className="space-y-3">
                {recent.map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="leading-snug">{a.summary}</p>
                    <p className="text-[11px] text-ink-soft">{timeAgo(a.createdAt)}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
