import type { Metadata } from "next";
import Link from "next/link";
import { getCustomer } from "@/lib/auth";
import { ComplaintForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Retur, Penukaran & Komplain" };

export default async function ComplaintPage() {
  const me = await getCustomer();
  return (
    <div className="container-x max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Customer Protection</p>
      <h1 className="h-display mt-2 text-4xl sm:text-5xl">Retur & Komplain</h1>
      <p className="mt-3 text-sm text-ink-soft">
        Ajukan pengembalian, penukaran, refund atau klaim garansi toko. Baca dulu{" "}
        <Link href="/pages/returns" className="link">
          kebijakan retur
        </Link>
        ,{" "}
        <Link href="/pages/exchange" className="link">
          penukaran
        </Link>{" "}
        dan{" "}
        <Link href="/pages/warranty" className="link">
          garansi
        </Link>
        .
      </p>
      <ComplaintForm defaultEmail={me?.email} />
    </div>
  );
}
