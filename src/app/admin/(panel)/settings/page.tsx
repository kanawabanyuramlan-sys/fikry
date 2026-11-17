import type { Metadata } from "next";
import Image from "next/image";
import { requireStaffPage } from "@/lib/auth";
import { getSettings, POLICY_PAGES } from "@/lib/settings";
import { PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Checkbox, Field, SubmitButton, TextArea } from "@/components/forms";
import { saveSettings } from "@/app/admin/actions/ops";

export const metadata: Metadata = { title: "Website Settings" };

export default async function SettingsPage() {
  await requireStaffPage("settings.manage");
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Website Settings" description="Seluruh informasi toko, kontak dan kebijakan dapat diubah di sini tanpa mengubah kode." />
      <div className="space-y-6">
        <Panel title="Store identity">
          <ActionForm action={saveSettings} className="grid gap-4 sm:grid-cols-2">
            <Field label="Store name" name="store.name" defaultValue={s["store.name"]} required />
            <Field label="Tagline" name="store.tagline" defaultValue={s["store.tagline"]} />
            <TextArea label="Store description" name="store.description" defaultValue={s["store.description"]} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <span className="label">Logo</span>
              <div className="flex flex-wrap items-center gap-4">
                {s["store.logo"] && (
                  <span className="relative h-12 w-32 overflow-hidden rounded-lg bg-brand-off">
                    <Image src={s["store.logo"]} alt="Logo" fill sizes="128px" className="object-contain" />
                  </span>
                )}
                <input type="file" name="logoFile" accept="image/png,image/webp,image/jpeg" className="input max-w-sm" />
                {s["store.logo"] && <Checkbox label="Hapus logo (pakai wordmark)" name="removeLogo" />}
              </div>
            </div>
            <div className="sm:col-span-2">
              <SubmitButton>Simpan identitas</SubmitButton>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Contact & social media" description="Dipakai di footer, halaman Contact Us dan tombol WhatsApp mengambang.">
          <ActionForm action={saveSettings} className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp number" name="contact.whatsapp" defaultValue={s["contact.whatsapp"]} hint="Format 62812xxxx" />
            <Field label="Email" name="contact.email" type="email" defaultValue={s["contact.email"]} />
            <Field label="Instagram URL" name="social.instagram" defaultValue={s["social.instagram"]} />
            <Field label="TikTok URL" name="social.tiktok" defaultValue={s["social.tiktok"]} />
            <TextArea label="Store address" name="contact.address" defaultValue={s["contact.address"]} />
            <TextArea label="Business hours" name="contact.hours" defaultValue={s["contact.hours"]} />
            <Field label="Pesan otomatis WhatsApp" name="whatsapp.greeting" defaultValue={s["whatsapp.greeting"]} className="sm:col-span-2" />
            <div className="sm:col-span-2">
              <SubmitButton>Simpan kontak</SubmitButton>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Payment & shipping" description="Pembayaran manual (transfer). Payment gateway dapat diintegrasikan kemudian.">
          <ActionForm action={saveSettings} className="grid gap-4 sm:grid-cols-3">
            <TextArea label="Bank account info" name="payment.bankInfo" defaultValue={s["payment.bankInfo"]} className="sm:col-span-3" />
            <TextArea label="Payment instructions" name="payment.instructions" defaultValue={s["payment.instructions"]} className="sm:col-span-3" />
            <Field label="Ongkir flat Jawa–Bali (Rp)" name="shipping.flatJavaBali" inputMode="numeric" defaultValue={s["shipping.flatJavaBali"]} />
            <Field label="Ongkir flat luar Jawa (Rp)" name="shipping.flatOther" inputMode="numeric" defaultValue={s["shipping.flatOther"]} />
            <Field label="Gratis ongkir min. (Rp, 0 = nonaktif)" name="shipping.freeThreshold" inputMode="numeric" defaultValue={s["shipping.freeThreshold"]} />
            <Field label="Estimasi pengiriman (teks)" name="shipping.estimate" defaultValue={s["shipping.estimate"]} className="sm:col-span-3" />
            <div className="sm:col-span-3">
              <SubmitButton>Simpan pembayaran & ongkir</SubmitButton>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Product workflow & inventory">
          <ActionForm action={saveSettings} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="__approvalSection" value="1" />
            <div className="sm:col-span-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 p-3 hover:bg-brand-off">
                <input type="checkbox" name="products.requireApproval" value="true" defaultChecked={s["products.requireApproval"] === "true"} className="mt-0.5 h-4 w-4 accent-brand-dark" />
                <span>
                  <span className="block text-sm font-semibold">Produk dari staff harus disetujui sebelum tampil</span>
                  <span className="block text-xs text-ink-soft">Jika dimatikan, staff dengan izin tambah produk dapat langsung mempublikasikan.</span>
                </span>
              </label>
            </div>
            <Field label="Ambang stok menipis" name="inventory.lowStock" inputMode="numeric" defaultValue={s["inventory.lowStock"]} />
            <div className="sm:col-span-2">
              <SubmitButton>Simpan workflow</SubmitButton>
            </div>
          </ActionForm>
        </Panel>

        <Panel title="Policies & information pages" description="Shipping, warranty, return, exchange, refund, authenticity dan lainnya. Jangan mengklaim garansi resmi atau reseller resmi tanpa bukti.">
          <ActionForm action={saveSettings} className="space-y-4">
            {POLICY_PAGES.map((p) => (
              <TextArea key={p.key} label={`${p.title} (/pages/${p.slug})`} name={p.key} defaultValue={s[p.key]} rows={5} />
            ))}
            <SubmitButton>Simpan kebijakan</SubmitButton>
          </ActionForm>
        </Panel>
      </div>
    </>
  );
}
