import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { ILLUSTRATIONS, PROMOTION_TYPES } from "@/lib/constants";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionButton, ActionForm, Checkbox, Field, Select, SubmitButton, TextArea } from "@/components/forms";
import { deletePromotion, savePromotion } from "@/app/admin/actions/ops";

export const metadata: Metadata = { title: "Promotion" };

const local = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

export default async function PromotionEdit({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("promotions.manage");
  const { id } = await params;
  const p = id === "new" ? null : await db.promotion.findUnique({ where: { id } });
  if (id !== "new" && !p) notFound();
  return (
    <>
      <PageHeader
        title={p ? "Edit Advertisement" : "Add Advertisement"}
        back={{ href: "/admin/promotions", label: "Promotions" }}
        actions={
          p && (
            <ActionButton action={deletePromotion.bind(null, p.id)} confirm="Hapus promosi ini?" className="btn-danger btn-sm">
              Delete
            </ActionButton>
          )
        }
      />
      <Panel>
        <ActionForm action={savePromotion} className="grid gap-4 sm:grid-cols-2">
          {p && <input type="hidden" name="id" value={p.id} />}
          <Select label="Jenis promosi" name="type" defaultValue={p?.type ?? "BANNER"} options={Object.entries(PROMOTION_TYPES).map(([value, label]) => ({ value, label }))} />
          <Select
            label="Tema warna"
            name="theme"
            defaultValue={p?.theme ?? "green"}
            options={[
              { value: "green", label: "Dark green" },
              { value: "lime", label: "Fresh lime" },
              { value: "light", label: "Light green" },
              { value: "dark", label: "Deep forest" },
            ]}
          />
          <Field label="Judul / headline" name="title" defaultValue={p?.title} required className="sm:col-span-2" />
          <Field label="Subjudul / eyebrow" name="subtitle" defaultValue={p?.subtitle ?? ""} />
          <Field label="Label tombol (CTA)" name="ctaLabel" defaultValue={p?.ctaLabel ?? ""} placeholder="Shop Now" />
          <TextArea label="Deskripsi" name="description" defaultValue={p?.description ?? ""} className="sm:col-span-2" />
          <Field label="URL tujuan" name="url" defaultValue={p?.url ?? ""} placeholder="/sale atau https://…" />
          <Field label="Urutan" name="sortOrder" type="number" defaultValue={String(p?.sortOrder ?? 0)} />
          <Field label="Mulai tayang" name="startsAt" type="datetime-local" defaultValue={local(p?.startsAt ?? null)} />
          <Field label="Berakhir" name="endsAt" type="datetime-local" defaultValue={local(p?.endsAt ?? null)} />
          <label className="block">
            <span className="label">Upload banner (JPG/PNG/WEBP)</span>
            <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="input" />
          </label>
          <Select label="Atau ilustrasi" name="illustration" defaultValue={p?.illustration ?? ""} placeholder="—" options={ILLUSTRATIONS.map((i) => ({ value: i, label: i }))} />
          {p?.image && (
            <div className="sm:col-span-2">
              <div className="relative mb-2 h-32 w-56 overflow-hidden rounded-xl bg-brand-off">
                <Image src={p.image} alt="" fill sizes="224px" className="object-cover" />
              </div>
              <Checkbox label="Hapus banner saat ini" name="removeImage" />
            </div>
          )}
          <div className="sm:col-span-2">
            <Checkbox label="Aktif" name="isActive" defaultChecked={p?.isActive ?? true} hint="Promosi tayang hanya jika aktif DAN berada dalam rentang tanggal." />
          </div>
          <div className="sm:col-span-2">
            <SubmitButton>Simpan promosi</SubmitButton>
          </div>
        </ActionForm>
      </Panel>
    </>
  );
}
