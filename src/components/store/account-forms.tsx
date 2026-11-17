"use client";

import Link from "next/link";
import { useState } from "react";
import { ActionForm, ActionButton, Field, SubmitButton, Select, Checkbox, TextArea } from "@/components/forms";
import {
  changeCustomerPassword,
  deleteAddress,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  saveAddress,
  updateProfile,
  submitComplaint,
} from "@/app/actions/store";
import { PROVINCES, COMPLAINT_TYPES } from "@/lib/constants";

export function LoginForm({ next }: { next?: string }) {
  return (
    <ActionForm action={loginCustomer} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Password" name="password" type="password" required autoComplete="current-password" />
      <SubmitButton className="btn-primary h-12 w-full">Masuk</SubmitButton>
    </ActionForm>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  return (
    <ActionForm action={registerCustomer} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Nama lengkap" name="name" required autoComplete="name" />
      <Field label="Email" name="email" type="email" required autoComplete="email" />
      <Field label="Nomor WhatsApp (opsional)" name="phone" inputMode="tel" autoComplete="tel" />
      <Field label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" hint="Minimal 8 karakter, mengandung huruf dan angka." />
      <SubmitButton className="btn-primary h-12 w-full">Buat akun</SubmitButton>
    </ActionForm>
  );
}

export function LogoutButton() {
  return (
    <ActionButton action={logoutCustomer} className="btn-outline btn-sm">
      Keluar
    </ActionButton>
  );
}

export function ProfileForm({ name, phone, email }: { name: string; phone: string; email: string }) {
  return (
    <ActionForm action={updateProfile} className="space-y-4">
      <Field label="Email" name="email_ro" value={email} disabled readOnly />
      <Field label="Nama" name="name" defaultValue={name} required />
      <Field label="Nomor WhatsApp" name="phone" defaultValue={phone} inputMode="tel" />
      <SubmitButton>Simpan profil</SubmitButton>
    </ActionForm>
  );
}

export function PasswordForm() {
  return (
    <ActionForm action={changeCustomerPassword} reset className="space-y-4">
      <Field label="Password saat ini" name="current" type="password" required autoComplete="current-password" />
      <Field label="Password baru" name="password" type="password" required autoComplete="new-password" hint="Minimal 8 karakter, huruf dan angka." />
      <SubmitButton className="btn-outline">Ganti password</SubmitButton>
    </ActionForm>
  );
}

type Addr = { id: string; label: string; recipient: string; phone: string; address: string; province: string; city: string; postalCode: string; isDefault: boolean };

export function AddressManager({ addresses }: { addresses: Addr[] }) {
  const [editing, setEditing] = useState<Addr | "new" | null>(null);
  const cur = editing && editing !== "new" ? editing : null;
  return (
    <div className="space-y-4">
      {addresses.length === 0 && !editing && <p className="text-sm text-ink-soft">Belum ada alamat tersimpan.</p>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className="rounded-2xl border border-ink/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-bold">
              {a.label} {a.isDefault && <span className="badge bg-brand-light text-brand-dark">Utama</span>}
            </p>
            <p className="mt-1">
              {a.recipient} · {a.phone}
            </p>
            <p className="text-ink-soft">
              {a.address}, {a.city}, {a.province} {a.postalCode}
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setEditing(a)} className="btn btn-outline btn-sm">
                Edit
              </button>
              <ActionButton action={deleteAddress.bind(null, a.id)} confirm="Hapus alamat ini?" className="btn-ghost btn-sm text-sale">
                Hapus
              </ActionButton>
            </div>
          </li>
        ))}
      </ul>
      {editing ? (
        <ActionForm key={cur?.id ?? "new"} action={saveAddress} onDone={() => setEditing(null)} className="grid gap-4 rounded-2xl bg-brand-off p-5 sm:grid-cols-2">
          <input type="hidden" name="id" value={cur?.id ?? ""} />
          <Field label="Label" name="label" defaultValue={cur?.label ?? "Rumah"} required />
          <Field label="Penerima" name="recipient" defaultValue={cur?.recipient} required />
          <Field label="No. WhatsApp" name="phone" defaultValue={cur?.phone} required />
          <Select label="Provinsi" name="province" defaultValue={cur?.province ?? ""} placeholder="Pilih provinsi" options={PROVINCES.map((p) => ({ value: p, label: p }))} required />
          <TextArea label="Alamat lengkap" name="address" defaultValue={cur?.address} required className="sm:col-span-2" />
          <Field label="Kota / Kabupaten" name="city" defaultValue={cur?.city} required />
          <Field label="Kode pos" name="postalCode" defaultValue={cur?.postalCode} required maxLength={5} />
          <div className="sm:col-span-2">
            <Checkbox label="Jadikan alamat utama" name="isDefault" defaultChecked={cur?.isDefault} />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <SubmitButton>Simpan alamat</SubmitButton>
            <button type="button" onClick={() => setEditing(null)} className="btn btn-ghost">
              Batal
            </button>
          </div>
        </ActionForm>
      ) : (
        <button onClick={() => setEditing("new")} className="btn btn-outline btn-sm">
          + Tambah alamat
        </button>
      )}
    </div>
  );
}

export function ComplaintForm({ defaultEmail }: { defaultEmail?: string }) {
  const [ticket, setTicket] = useState<string | null>(null);
  if (ticket)
    return (
      <div className="card mt-8 p-8 text-center">
        <p className="text-sm text-ink-soft">Nomor tiket</p>
        <p className="font-mono text-3xl font-bold">{ticket}</p>
        <p className="mt-3 text-sm text-ink-soft">Tim kami akan meninjau pengajuan dan menghubungi kamu melalui WhatsApp / email.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Kembali ke beranda
        </Link>
      </div>
    );
  return (
    <ActionForm action={submitComplaint} refresh={false} onDone={(r) => setTicket((r.data as { ticket: string }).ticket)} className="card mt-8 grid gap-4 p-6 sm:grid-cols-2">
      <Field label="Order ID" name="orderNumber" required placeholder="VRD-…" />
      <Field label="Email saat checkout" name="email" type="email" required defaultValue={defaultEmail} />
      <Field label="Nama" name="name" required />
      <Field label="No. WhatsApp" name="phone" required inputMode="tel" />
      <Field label="Produk yang dikomplain" name="productName" required placeholder="Nama produk, warna, ukuran" className="sm:col-span-2" />
      <Select label="Jenis pengajuan" name="type" options={Object.entries(COMPLAINT_TYPES).map(([value, label]) => ({ value, label }))} className="sm:col-span-2" />
      <TextArea label="Alasan / detail masalah" name="reason" required minLength={15} className="sm:col-span-2" />
      <label className="block sm:col-span-2">
        <span className="label">Foto pendukung (maks. 4, JPG/PNG/WEBP, 8 MB)</span>
        <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple className="input file:mr-3 file:rounded-full file:border-0 file:bg-brand-light file:px-3 file:py-1 file:text-xs file:font-semibold" />
      </label>
      <div className="sm:col-span-2">
        <SubmitButton className="btn-primary h-12">Kirim pengajuan</SubmitButton>
      </div>
    </ActionForm>
  );
}
