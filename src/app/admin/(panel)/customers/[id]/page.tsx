import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { fmtDate, fmtDateTime, rupiah, waLink } from "@/lib/format";
import { Badge, OrderStatusBadge, PageHeader, Panel, PaymentBadge, Stat, TableWrap } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("customers.view");
  const { id } = await params;
  const c = await db.customer.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" } }, addresses: true, _count: { select: { wishlist: true, reviews: true } } },
  });
  if (!c) notFound();
  const valid = c.orders.filter((o) => o.status !== "CANCELLED");
  return (
    <>
      <PageHeader
        title={c.name}
        back={{ href: "/admin/customers", label: "Customers" }}
        description={
          <span className="flex items-center gap-2">
            {c.passwordHash ? <Badge tone="green">Member</Badge> : <Badge>Tamu</Badge>} sejak {fmtDate(c.createdAt)}
          </span>
        }
        actions={
          c.phone && (
            <a href={waLink(c.phone, `Halo ${c.name}, `)} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-brand-dark text-paper">
              WhatsApp
            </a>
          )
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pesanan" value={c.orders.length} />
        <Stat label="Total belanja" value={rupiah(valid.reduce((s, o) => s + o.total, 0))} />
        <Stat label="Wishlist" value={c._count.wishlist} />
        <Stat label="Ulasan" value={c._count.reviews} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Order history" pad={false}>
          <TableWrap>
            <table className="table-x">
              <tbody>
                {c.orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-bold hover:underline">
                        {o.orderNumber}
                      </Link>
                      <p className="text-[11px] text-ink-soft">{fmtDateTime(o.createdAt)}</p>
                    </td>
                    <td>
                      <OrderStatusBadge status={o.status} />
                    </td>
                    <td>
                      <PaymentBadge status={o.paymentStatus} />
                    </td>
                    <td className="text-right font-semibold">{rupiah(o.total)}</td>
                  </tr>
                ))}
                {!c.orders.length && (
                  <tr>
                    <td className="text-ink-soft">Belum ada pesanan.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>
        </Panel>
        <div className="space-y-6">
          <Panel title="Contact details">
            <p className="text-sm">{c.email}</p>
            <p className="text-sm">{c.phone ?? "—"}</p>
          </Panel>
          <Panel title="Saved addresses">
            {c.addresses.length ? (
              <ul className="space-y-3 text-sm">
                {c.addresses.map((a) => (
                  <li key={a.id}>
                    <b>{a.label}</b> — {a.recipient}, {a.phone}
                    <br />
                    <span className="text-ink-soft">
                      {a.address}, {a.city}, {a.province} {a.postalCode}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">Tidak ada alamat tersimpan.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
