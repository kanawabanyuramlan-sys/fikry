import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { isSafePath } from "@/lib/format";
import { RegisterForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Daftar", robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCustomer()) redirect("/account");
  return (
    <div className="container-x grid max-w-md py-14">
      <p className="eyebrow">Akun pelanggan</p>
      <h1 className="h-display mt-2 text-4xl">Daftar</h1>
      <p className="mt-2 text-sm text-ink-soft">Akun ini khusus pelanggan. Akun tim toko hanya dibuat melalui undangan Owner.</p>
      <div className="card mt-8 p-6">
        <RegisterForm next={isSafePath(next) ? next : undefined} />
      </div>
      <p className="mt-6 text-center text-sm">
        Sudah punya akun?{" "}
        <Link href="/account/login" className="link">
          Login
        </Link>
      </p>
    </div>
  );
}
