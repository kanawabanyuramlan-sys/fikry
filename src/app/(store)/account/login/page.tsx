import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { isSafePath } from "@/lib/format";
import { LoginForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Login", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = isSafePath(next) ? next : undefined;
  if (await getCustomer()) redirect(safeNext ?? "/account");
  return (
    <div className="container-x grid max-w-md py-14">
      <p className="eyebrow">Akun pelanggan</p>
      <h1 className="h-display mt-2 text-4xl">Login</h1>
      <p className="mt-2 text-sm text-ink-soft">Lihat riwayat pesanan, wishlist dan alamat tersimpan.</p>
      <div className="card mt-8 p-6">
        <LoginForm next={safeNext} />
      </div>
      <p className="mt-6 text-center text-sm">
        Belum punya akun?{" "}
        <Link href={safeNext ? `/account/register?next=${encodeURIComponent(safeNext)}` : "/account/register"} className="link">
          Daftar sekarang
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-ink-soft">
        Tim toko? Masuk melalui{" "}
        <Link href="/admin/login" className="underline">
          dashboard admin
        </Link>
        .
      </p>
    </div>
  );
}
