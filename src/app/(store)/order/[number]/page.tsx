import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, MessageCircle, Landmark, Truck, Copy } from "@/components/icons";
import { timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { fmtDate, fmtDateTime, rupiah, waLink } from "@/lib/format";
import { OrderTimeline } from "@/components/store/order-timeline";

export const metadata: Metadata = { title: "Detail Pesanan", robots: { index: false, follow: false } };

function safeEq(a: string, b: string) {
  const A = Buffer.from(a);
  const B = Buffer.from(b);
  return A.length === B.length && timingSafeEqual(A, B);
}

export default async function OrderPage({ params, searchParams }: { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string }> }) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  const order = await db.order.findUnique({
    where: { orderNumber: number.toUpperCase() },
    include: { items: { include: { product: { select: { slug: true } } } }, history: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) notFound();
  const me = await getCustomer();
  // Access: secret link token from checkout, or the logged-in customer who placed it through their account.
  const allowed = (t && safeEq(t, order.accessToken)) || (me && order.customerId === me.id && order.viaAccount);
  if (!allowed) notFound();
  const s = await getSettings();
  const fresh = Date.now() - order.createdAt.getTime() < 30 * 60 * 1000;
  const waText = [
    `Halo ${s["store.name"]}, saya ingin konfirmasi pesanan:`,
    `Order ID: ${order.orderNumber}`,
    ...order.items.map((i) => `• ${i.productName} (${[i.color, i.size].filter(Boolean).join("/")}) x${i.quantity}`),
    `Total: ${rupiah(order.total)}`,
    `Nama: ${order.name}`,
    order.paymentMethod === "BANK_TRANSFER" ? "Saya akan mengirim bukti transfer." : "Mohon info pembayarannya.",
  ].join("\n");

  return (
    <div className="container-x max-w-5xl py-10 sm:py-14">
      {fresh && order.status === "RECEIVED" && (
        <div className="mb-8 flex flex-col items-start gap-4 rounded-3xl bg-brand-dark p-6 text-paper sm:flex-row sm:items-center sm:p-8">
          <CheckCircle2 className="h-12 w-12 shrink-0 text-brand-lime" />
          <div>
            <h1 className="font-serif text-[32px] leading-[1.05] sm:text-[40px]">Terima kasih! Pesanan kamu sudah kami terima.</h1>
            <p className="mt-1 text-sm text-paper/75">Simpan Order ID di bawah. Halaman ini juga bisa diakses lewat menu Lacak Pesanan.</p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label">Order ID</p>
          <p className="flex items-center gap-2 font-mono text-2xl font-bold">
            {order.orderNumber} <Copy className="h-4 w-4 text-ink-soft" aria-hidden />
          </p>
          <p className="text-sm text-ink-soft">Dibuat {fmtDateTime(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="badge bg-brand-light text-brand-dark">{ORDER_STATUS_LABEL[order.status]}</span>
          <span className={`badge ${order.paymentStatus === "PAID" ? "bg-brand text-paper" : "bg-warn-soft text-warn"}`}>
            {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </span>
        </div>
      </div>

      <div className="card mt-8 p-6">
        <OrderTimeline status={order.status} history={order.history} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {order.paymentStatus === "UNPAID" && order.status !== "CANCELLED" && (
            <section className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Landmark className="h-5 w-5 text-brand-dark" /> Informasi pembayaran
              </h2>
              <p className="mt-1 text-sm text-ink-soft">{PAYMENT_METHOD_LABEL[order.paymentMethod]}</p>
              <div className="mt-4 rounded-2xl bg-brand-off p-4">
                <p className="text-sm text-ink-soft">Total yang harus dibayar</p>
                <p className="text-2xl font-extrabold">{rupiah(order.total)}</p>
                {order.paymentMethod === "BANK_TRANSFER" && <p className="mt-3 whitespace-pre-line text-sm font-semibold">{s["payment.bankInfo"]}</p>}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink/80">{s["payment.instructions"]}</p>
              <a href={waLink(s["contact.whatsapp"], waText)} target="_blank" rel="noopener noreferrer" className="btn mt-5 h-12 w-full bg-brand-dark text-paper hover:bg-brand-dark/90 sm:w-auto">
                <MessageCircle className="h-5 w-5" /> Konfirmasi via WhatsApp
              </a>
            </section>
          )}
          {(order.trackingNumber || order.shippingProvider) && (
            <section className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Truck className="h-5 w-5 text-brand-dark" /> Pengiriman
              </h2>
              <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-2 text-sm">
                <dt className="text-ink-soft">Kurir</dt>
                <dd className="font-semibold">{order.shippingProvider ?? "—"}</dd>
                <dt className="text-ink-soft">No. resi</dt>
                <dd className="font-mono font-semibold">{order.trackingNumber ?? "—"}</dd>
                <dt className="text-ink-soft">Estimasi tiba</dt>
                <dd>{fmtDate(order.estimatedDelivery)}</dd>
                {order.shippingNotes && (
                  <>
                    <dt className="text-ink-soft">Catatan</dt>
                    <dd>{order.shippingNotes}</dd>
                  </>
                )}
              </dl>
            </section>
          )}
          <section className="card p-6">
            <h2 className="text-lg font-bold">Produk</h2>
            <ul className="mt-3 divide-y divide-ink/10">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-3 text-sm">
                  <div>
                    {i.product ? (
                      <Link href={`/p/${i.product.slug}`} className="font-semibold hover:underline">
                        {i.productName}
                      </Link>
                    ) : (
                      <p className="font-semibold">{i.productName}</p>
                    )}
                    <p className="text-xs text-ink-soft">
                      {i.brandName} · {[i.color, i.size].filter(Boolean).join(" / ")} · {i.quantity} × {rupiah(i.price)}
                    </p>
                  </div>
                  <p className="font-semibold">{rupiah(i.price * i.quantity)}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="card p-6 text-sm">
            <h2 className="text-lg font-bold">Ringkasan</h2>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd>{rupiah(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-brand-dark">
                  <dt>Voucher {order.couponCode}</dt>
                  <dd>−{rupiah(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink-soft">Ongkir</dt>
                <dd>{order.shippingCost ? rupiah(order.shippingCost) : "Gratis"}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-extrabold">
                <dt>Total</dt>
                <dd>{rupiah(order.total)}</dd>
              </div>
            </dl>
          </section>
          <section className="card p-6 text-sm">
            <h2 className="text-lg font-bold">Alamat</h2>
            <p className="mt-2 font-semibold">{order.name}</p>
            <p className="text-ink-soft">{order.phone}</p>
            <p className="mt-2">{order.address}</p>
            <p>
              {order.city}, {order.province} {order.postalCode}
            </p>
          </section>
          <div className="flex flex-col gap-2">
            <Link href="/complaint" className="btn btn-outline">
              Ajukan retur / komplain
            </Link>
            <Link href="/shop" className="btn btn-ghost">
              Lanjut belanja
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
