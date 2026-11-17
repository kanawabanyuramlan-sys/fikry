import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { fmtDate, rupiah } from "@/lib/format";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { ActionButton, ActionForm, Checkbox, Field, Select, SubmitButton } from "@/components/forms";
import { deleteCoupon, saveCoupon } from "@/app/admin/actions/ops";

export const metadata: Metadata = { title: "Vouchers" };

type C = Awaited<ReturnType<typeof db.coupon.findMany>>[number];
const d = (x: Date | null) => (x ? x.toISOString().slice(0, 10) : "");

function CouponForm({ c }: { c?: C }) {
  return (
    <ActionForm action={saveCoupon} reset={!c} className="grid gap-3 sm:grid-cols-4">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Kode" name="code" defaultValue={c?.code} required className="[&_input]:uppercase" />
      <Select
        label="Tipe"
        name="type"
        defaultValue={c?.type ?? "PERCENT"}
        options={[
          { value: "PERCENT", label: "Persen (%)" },
          { value: "FIXED", label: "Potongan (Rp)" },
        ]}
      />
      <Field label="Nilai" name="value" type="number" min={1} defaultValue={c ? String(c.value) : ""} required />
      <Field label="Min. belanja (Rp)" name="minSpend" type="number" min={0} defaultValue={String(c?.minSpend ?? 0)} />
      <Field label="Maks. potongan (Rp)" name="maxDiscount" type="number" min={0} defaultValue={c?.maxDiscount ? String(c.maxDiscount) : ""} />
      <Field label="Kuota pemakaian" name="maxUses" type="number" min={1} defaultValue={c?.maxUses ? String(c.maxUses) : ""} placeholder="Tanpa batas" />
      <Field label="Mulai" name="startsAt" type="date" defaultValue={d(c?.startsAt ?? null)} />
      <Field label="Berakhir" name="endsAt" type="date" defaultValue={d(c?.endsAt ?? null)} />
      <Field label="Deskripsi" name="description" defaultValue={c?.description ?? ""} className="sm:col-span-3" />
      <div className="flex items-end">
        <Checkbox label="Aktif" name="isActive" defaultChecked={c?.isActive ?? true} />
      </div>
      <div className="sm:col-span-4">
        <SubmitButton>{c ? "Simpan" : "Create voucher"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function CouponsPage() {
  await requireStaffPage("promotions.manage");
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Voucher Management" description="Kode diskon yang divalidasi di server saat checkout (tanggal, kuota, minimal belanja)." />
      <Panel title="Create voucher" className="mb-6">
        <CouponForm />
      </Panel>
      <div className="space-y-3">
        {coupons.map((c) => (
          <details key={c.id} className="card">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4">
              <span className="font-mono text-base font-bold">{c.code}</span>
              <span className="text-sm">{c.type === "PERCENT" ? `${c.value}%` : rupiah(c.value)}</span>
              <span className="text-xs text-ink-soft">
                min {rupiah(c.minSpend)} · dipakai {c.usedCount}
                {c.maxUses ? `/${c.maxUses}` : ""} · {c.endsAt ? `s/d ${fmtDate(c.endsAt)}` : "tanpa batas waktu"}
              </span>
              <span className="ml-auto">{c.isActive ? <Badge tone="solid">Aktif</Badge> : <Badge>Nonaktif</Badge>}</span>
            </summary>
            <div className="space-y-3 border-t border-ink/[.07] p-4">
              <CouponForm c={c} />
              <ActionButton action={deleteCoupon.bind(null, c.id)} confirm={`Hapus voucher ${c.code}?`} className="btn-ghost btn-sm text-sale">
                Hapus voucher
              </ActionButton>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
