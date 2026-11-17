import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaff } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { staffLogin } from "@/app/admin/actions/auth";
import Image from "next/image";

export const metadata: Metadata = { title: "Login Tim", robots: { index: false, follow: false } };

export default async function AdminLogin() {
  if (await getStaff()) redirect("/admin");
  const s = await getSettings();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink lg:block">
        <Image src="/samples/hero-apparel.jpg" alt="" fill sizes="50vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-paper">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-paper/60">{s["store.name"]} Team</p>
          <p className="mt-2 font-serif text-[44px] leading-[1.02]">Satu toko, satu database, satu tim.</p>
          <p className="mt-2 text-sm text-paper/70">Kelola produk, stok, pesanan dan promosi bersama sesuai izin masing-masing.</p>
        </div>
      </div>
      <div className="grid place-items-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-ink">
            ← Kembali ke toko
          </Link>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Login tim toko</h1>
          <p className="mt-2 text-sm text-ink-soft">Akun tim dibuat melalui undangan Owner. Tidak ada pendaftaran publik.</p>
          <ActionForm action={staffLogin} className="mt-8 space-y-4">
            <Field label="Email" name="email" type="email" required autoComplete="username" />
            <Field label="Password" name="password" type="password" required autoComplete="current-password" />
            <SubmitButton className="btn-primary h-12 w-full">Masuk ke dashboard</SubmitButton>
          </ActionForm>
          <p className="mt-6 text-xs text-ink-soft">Lupa password? Hubungi Owner toko untuk reset.</p>
        </div>
      </div>
    </div>
  );
}
