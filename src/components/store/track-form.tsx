"use client";

import Link from "next/link";
import { useState } from "react";
import { Package, Truck } from "@/components/icons";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { trackOrder, type TrackResult } from "@/app/actions/store";
import { fmtDate, fmtDateTime, rupiah } from "@/lib/format";
import { PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { OrderTimeline } from "./order-timeline";

export function TrackForm() {
  const [res, setRes] = useState<TrackResult | null>(null);
  return (
    <>
      <ActionForm action={trackOrder} refresh={false} onDone={(r) => setRes(r.data as TrackResult)} className="card mt-8 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Field label="Order ID" name="orderNumber" required placeholder="VRD-261116-XXXXX" className="[&_input]:uppercase" />
        <Field label="Email / No. WhatsApp" name="contact" required autoComplete="email" />
        <SubmitButton className="btn-primary h-[42px]">Lacak</SubmitButton>
      </ActionForm>
      {res && (
        <section className="card mt-6 space-y-6 p-6" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="label">Order ID</p>
              <p className="font-mono text-xl font-bold">{res.orderNumber}</p>
              <p className="text-xs text-ink-soft">
                {fmtDateTime(res.createdAt)} · {rupiah(res.total)} · {PAYMENT_STATUS_LABEL[res.paymentStatus]}
              </p>
            </div>
            <span className="badge bg-brand-light text-brand-dark">{res.statusLabel}</span>
          </div>
          <OrderTimeline status={res.status} history={res.history.map((h) => ({ status: h.status, createdAt: h.at, note: h.note }))} />
          {(res.trackingNumber || res.shippingProvider) && (
            <div className="flex items-start gap-3 rounded-2xl bg-brand-off p-4 text-sm">
              <Truck className="h-5 w-5 text-brand-dark" />
              <div>
                <p className="font-semibold">
                  {res.shippingProvider} · <span className="font-mono">{res.trackingNumber}</span>
                </p>
                {res.estimatedDelivery && <p className="text-ink-soft">Estimasi tiba {fmtDate(res.estimatedDelivery)}</p>}
              </div>
            </div>
          )}
          <ul className="space-y-1 text-sm">
            {res.items.map((i, k) => (
              <li key={k} className="flex items-center gap-2">
                <Package className="h-4 w-4 text-ink-soft" /> {i.name} {i.variant && `(${i.variant})`} × {i.qty}
              </li>
            ))}
          </ul>
          <Link href={res.link} className="btn btn-outline btn-sm">
            Lihat detail & info pembayaran
          </Link>
        </section>
      )}
    </>
  );
}
