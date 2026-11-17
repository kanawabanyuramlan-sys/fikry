import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { COMPLAINT_STATUS_LABEL, COMPLAINT_TYPES } from "@/lib/constants";
import { fmtDateTime, parseJson, waLink } from "@/lib/format";
import { ComplaintBadge, Empty, PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Select, SubmitButton, TextArea } from "@/components/forms";
import { updateComplaint } from "@/app/admin/actions/ops";

export const metadata: Metadata = { title: "Returns & Complaints" };

export default async function ComplaintsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("complaints.manage");
  const { status } = await searchParams;
  const rows = await db.complaint.findMany({
    where: status ? { status } : { status: { in: ["SUBMITTED", "REVIEWING", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
    include: { order: { select: { id: true, orderNumber: true } } },
  });
  return (
    <>
      <PageHeader title="Returns, Exchange & Complaints" description="Pengajuan retur/penukaran/garansi dari pelanggan beserta foto pendukung." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/admin/complaints" className={`chip ${!status ? "chip-active" : ""}`}>
          Terbuka
        </Link>
        {Object.entries(COMPLAINT_STATUS_LABEL).map(([v, l]) => (
          <Link key={v} href={`/admin/complaints?status=${v}`} className={`chip ${status === v ? "chip-active" : ""}`}>
            {l}
          </Link>
        ))}
      </div>
      {rows.length ? (
        <div className="space-y-4">
          {rows.map((c) => {
            const photos = parseJson<string[]>(c.photos, []);
            return (
              <Panel key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2">
                      <span className="font-mono font-bold">{c.ticketNumber}</span> <ComplaintBadge status={c.status} />
                    </p>
                    <p className="mt-1 text-sm">
                      <b>{COMPLAINT_TYPES[c.type]}</b> · {c.productName} · order{" "}
                      <Link href={`/admin/orders/${c.order.id}`} className="font-mono underline">
                        {c.order.orderNumber}
                      </Link>
                    </p>
                    <p className="text-xs text-ink-soft">
                      {c.name} · {c.email} · {c.phone} · {fmtDateTime(c.createdAt)}
                    </p>
                  </div>
                  <a href={waLink(c.phone, `Halo ${c.name}, terkait tiket ${c.ticketNumber}: `)} target="_blank" rel="noopener noreferrer" className="btn btn-sm bg-brand-dark text-paper">
                    WhatsApp
                  </a>
                </div>
                <p className="mt-3 whitespace-pre-line rounded-xl bg-brand-off p-3 text-sm">{c.reason}</p>
                {photos.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {photos.map((p) => (
                      <a key={p} href={p} target="_blank" rel="noopener noreferrer" className="relative h-20 w-20 overflow-hidden rounded-lg bg-brand-off">
                        <Image src={p} alt="Foto pendukung" fill sizes="80px" className="object-cover" />
                      </a>
                    ))}
                  </div>
                )}
                <ActionForm action={updateComplaint} className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
                  <input type="hidden" name="id" value={c.id} />
                  <Select label="Status" name="status" defaultValue={c.status} options={Object.entries(COMPLAINT_STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
                  <TextArea label="Catatan internal" name="adminNote" defaultValue={c.adminNote ?? ""} rows={1} className="[&_textarea]:min-h-[42px]" />
                  <SubmitButton>Update</SubmitButton>
                </ActionForm>
              </Panel>
            );
          })}
        </div>
      ) : (
        <Panel>
          <Empty title="Tidak ada pengajuan" text="Pengajuan dari halaman Retur & Komplain akan tampil di sini." />
        </Panel>
      )}
    </>
  );
}
