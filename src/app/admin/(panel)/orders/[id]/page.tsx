import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle } from "@/components/icons";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { fmtDateTime, rupiah, waLink } from "@/lib/format";
import { OrderStatusBadge, PageHeader, Panel, PaymentBadge } from "@/components/admin/ui";
import { ActionForm, Field, Select, SubmitButton, TextArea } from "@/components/forms";
import { updateOrderStatus, updatePayment, updateShipping } from "@/app/admin/actions/ops";
import { OrderTimeline } from "@/components/store/order-timeline";

export const metadata: Metadata = { title: "Order Detail" };

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaffPage("orders.view");
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, slug: true } } } },
      history: { orderBy: { createdAt: "desc" }, include: { user: { select: { name: true } } } },
      customer: { select: { id: true, passwordHash: true, _count: { select: { orders: true } } } },
      complaints: true,
    },
  });
  if (!o) notFound();
  const manage = can(me, "orders.manage");
  const nextStatuses = ORDER_STATUSES.filter((s) => s !== o.status);
  const msg = `Halo ${o.name}, kami dari tim toko terkait pesanan ${o.orderNumber}. `;

  return (
    <>
      <PageHeader
        title={o.orderNumber}
        back={{ href: "/admin/orders", label: "Orders" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={o.status} /> <PaymentBadge status={o.paymentStatus} /> {fmtDateTime(o.createdAt)} · {PAYMENT_METHOD_LABEL[o.paymentMethod]}
          </span>
        }
        actions={
          <a href={waLink(o.phone, msg)} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-brand-dark text-paper">
            <MessageCircle className="h-4 w-4" /> Chat pelanggan
          </a>
        }
      />
      <Panel className="mb-6">
        <OrderTimeline status={o.status} history={[...o.history].reverse()} />
      </Panel>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Panel title="Items" pad={false}>
            <table className="table-x">
              <tbody>
                {o.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {i.product ? (
                        <Link href={`/admin/products/${i.product.id}`} className="font-semibold hover:underline">
                          {i.productName}
                        </Link>
                      ) : (
                        <span className="font-semibold">{i.productName}</span>
                      )}
                      <p className="text-xs text-ink-soft">
                        {i.brandName} · {[i.color, i.size].filter(Boolean).join(" / ")} · <span className="font-mono">{i.sku}</span>
                      </p>
                    </td>
                    <td className="whitespace-nowrap text-right text-sm">
                      {i.quantity} × {rupiah(i.price)}
                    </td>
                    <td className="whitespace-nowrap text-right font-semibold">{rupiah(i.price * i.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1.5 border-t border-ink/[.07] p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd>{rupiah(o.subtotal)}</dd>
              </div>
              {o.discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Voucher {o.couponCode}</dt>
                  <dd>−{rupiah(o.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Ongkir</dt>
                <dd>{rupiah(o.shippingCost)}</dd>
              </div>
              <div className="flex justify-between text-base font-extrabold">
                <dt>Total</dt>
                <dd>{rupiah(o.total)}</dd>
              </div>
            </dl>
          </Panel>

          {manage && o.status !== "CANCELLED" && (
            <Panel title="Update status" description="Membatalkan pesanan otomatis mengembalikan stok.">
              <ActionForm action={updateOrderStatus} reset className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end">
                <input type="hidden" name="id" value={o.id} />
                <input type="hidden" name="trackingNumber" value={o.trackingNumber ?? ""} />
                <Select label="Status baru" name="status" options={nextStatuses.map((s) => ({ value: s, label: ORDER_STATUS_LABEL[s]! }))} defaultValue={nextStatuses[ORDER_STATUSES.indexOf(o.status as never)] ?? nextStatuses[0]} />
                <Field label="Catatan (opsional, terlihat di riwayat)" name="note" />
                <SubmitButton>Update</SubmitButton>
              </ActionForm>
            </Panel>
          )}

          <Panel title="Status history">
            <ul className="space-y-3 text-sm">
              {o.history.map((h) => (
                <li key={h.id} className="flex flex-wrap justify-between gap-2 border-b border-ink/[.06] pb-2">
                  <span>
                    <b>{ORDER_STATUS_LABEL[h.status]}</b>
                    {h.note && <span className="text-ink-soft"> — {h.note}</span>}
                  </span>
                  <span className="text-xs text-ink-soft">
                    {h.user?.name ?? "Sistem/Pelanggan"} · {fmtDateTime(h.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="font-semibold">{o.name}</p>
            <p className="text-sm">{o.email}</p>
            <p className="text-sm">{o.phone}</p>
            <p className="mt-3 text-sm">{o.address}</p>
            <p className="text-sm">
              {o.city}, {o.province} {o.postalCode}
            </p>
            {o.notes && <p className="mt-3 rounded-xl bg-brand-off p-3 text-sm">Catatan: {o.notes}</p>}
            {o.customer && can(me, "customers.view") && (
              <Link href={`/admin/customers/${o.customer.id}`} className="link mt-3 inline-block text-sm">
                Profil pelanggan ({o.customer._count.orders} pesanan) →
              </Link>
            )}
          </Panel>

          <Panel title="Shipping management">
            {manage ? (
              <ActionForm action={updateShipping} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={o.id} />
                <Field label="Shipping provider" name="shippingProvider" defaultValue={o.shippingProvider ?? ""} placeholder="JNE / J&T / SiCepat" list="couriers" />
                <datalist id="couriers">
                  {["JNE", "J&T Express", "SiCepat", "AnterAja", "Pos Indonesia", "GoSend", "GrabExpress", "Kurir toko"].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                <Field label="Tracking number" name="trackingNumber" defaultValue={o.trackingNumber ?? ""} />
                <Field label="Shipping cost (Rp)" name="shippingCost" inputMode="numeric" defaultValue={String(o.shippingCost)} />
                <Field label="Estimated delivery" name="estimatedDelivery" type="date" defaultValue={o.estimatedDelivery ? o.estimatedDelivery.toISOString().slice(0, 10) : ""} />
                <TextArea label="Shipping notes" name="shippingNotes" defaultValue={o.shippingNotes ?? ""} className="sm:col-span-2" />
                <div className="sm:col-span-2">
                  <SubmitButton>Simpan pengiriman</SubmitButton>
                </div>
              </ActionForm>
            ) : (
              <dl className="grid grid-cols-[130px_1fr] gap-y-1.5 text-sm">
                <dt className="text-ink-soft">Kurir</dt>
                <dd>{o.shippingProvider ?? "—"}</dd>
                <dt className="text-ink-soft">Resi</dt>
                <dd className="font-mono">{o.trackingNumber ?? "—"}</dd>
              </dl>
            )}
          </Panel>

          <Panel title="Payment" description="Tidak ada payment gateway: verifikasi transfer manual lalu tandai Lunas.">
            {manage ? (
              <ActionForm action={updatePayment} className="flex items-end gap-2">
                <input type="hidden" name="id" value={o.id} />
                <Select
                  label="Status pembayaran"
                  name="paymentStatus"
                  defaultValue={o.paymentStatus}
                  options={[
                    { value: "UNPAID", label: "Belum dibayar" },
                    { value: "PAID", label: "Lunas (terverifikasi)" },
                    { value: "REFUNDED", label: "Refund" },
                  ]}
                  className="flex-1"
                />
                <SubmitButton>Simpan</SubmitButton>
              </ActionForm>
            ) : (
              <PaymentBadge status={o.paymentStatus} />
            )}
          </Panel>

          {o.complaints.length > 0 && (
            <Panel title="Complaints">
              <ul className="space-y-2 text-sm">
                {o.complaints.map((c) => (
                  <li key={c.id}>
                    <Link href="/admin/complaints" className="font-mono font-semibold hover:underline">
                      {c.ticketNumber}
                    </Link>{" "}
                    · {c.type} · {c.status}
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
