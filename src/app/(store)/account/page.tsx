import type { Metadata } from "next";
import Link from "next/link";
import { Heart, Package, Search } from "@/components/icons";
import { db } from "@/lib/db";
import { requireCustomerPage } from "@/lib/auth";
import { ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { fmtDate, rupiah } from "@/lib/format";
import { AddressManager, LogoutButton, PasswordForm, ProfileForm } from "@/components/store/account-forms";

export const metadata: Metadata = { title: "Akun Saya", robots: { index: false } };

export default async function AccountPage() {
  const me = await requireCustomerPage("/account");
  const [orders, addresses, wishCount] = await Promise.all([
    db.order.findMany({ where: { customerId: me.id, viaAccount: true }, orderBy: { createdAt: "desc" }, include: { items: true } }),
    db.address.findMany({ where: { customerId: me.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] }),
    db.wishlistItem.count({ where: { customerId: me.id } }),
  ]);
  return (
    <div className="container-x py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Akun saya</p>
          <h1 className="h-display mt-2 text-4xl sm:text-5xl">Halo, {me.name.split(" ")[0]}</h1>
          <p className="mt-1 text-sm text-ink-soft">{me.email}</p>
        </div>
        <LogoutButton />
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        <a href="#orders" className="card flex flex-col gap-1 p-4 sm:p-5">
          <Package className="h-5 w-5 text-brand-dark" />
          <span className="text-2xl font-extrabold">{orders.length}</span>
          <span className="text-xs text-ink-soft">Pesanan</span>
        </a>
        <Link href="/wishlist" className="card flex flex-col gap-1 p-4 sm:p-5">
          <Heart className="h-5 w-5 text-brand-dark" />
          <span className="text-2xl font-extrabold">{wishCount}</span>
          <span className="text-xs text-ink-soft">Wishlist</span>
        </Link>
        <Link href="/track" className="card flex flex-col gap-1 p-4 sm:p-5">
          <Search className="h-5 w-5 text-brand-dark" />
          <span className="text-sm font-bold">Lacak</span>
          <span className="text-xs text-ink-soft">Pesanan tamu</span>
        </Link>
      </div>

      <section id="orders" className="mt-12 scroll-mt-28">
        <h2 className="font-serif text-[32px] leading-[1.05]">Riwayat pesanan</h2>
        {orders.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-brand-off p-6 text-sm text-ink-soft">
            Belum ada pesanan dari akun ini. Pesanan sebagai tamu dapat dicek di{" "}
            <Link href="/track" className="link">
              Lacak Pesanan
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/order/${o.orderNumber}`} className="card flex flex-wrap items-center justify-between gap-3 p-5 transition hover:shadow-lift">
                  <div>
                    <p className="font-mono font-bold">{o.orderNumber}</p>
                    <p className="text-xs text-ink-soft">
                      {fmtDate(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge bg-brand-light text-brand-dark">{ORDER_STATUS_LABEL[o.status]}</span>
                    <span className="badge bg-ink/5 text-ink">{PAYMENT_STATUS_LABEL[o.paymentStatus]}</span>
                    <span className="ml-2 font-bold">{rupiah(o.total)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section className="card p-6">
          <h2 className="mb-5 text-lg font-bold">Profil</h2>
          <ProfileForm name={me.name} phone={me.phone ?? ""} email={me.email} />
        </section>
        <section className="card p-6">
          <h2 className="mb-5 text-lg font-bold">Keamanan</h2>
          <PasswordForm />
        </section>
      </div>
      <section className="card mt-8 p-6">
        <h2 className="mb-5 text-lg font-bold">Alamat tersimpan</h2>
        <AddressManager addresses={addresses} />
      </section>
    </div>
  );
}
