import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { CheckoutForm } from "@/components/store/checkout-form";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ via?: string }> }) {
  const [{ via }, customer, s] = await Promise.all([searchParams, getCustomer(), getSettings()]);
  const addresses = customer
    ? await db.address.findMany({ where: { customerId: customer.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] })
    : [];
  return (
    <CheckoutForm
      initialMethod={via === "wa" ? "WHATSAPP" : "BANK_TRANSFER"}
      customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone ?? "" } : null}
      addresses={addresses.map((a) => ({
        id: a.id, label: a.label, recipient: a.recipient, phone: a.phone, address: a.address,
        province: a.province, city: a.city, postalCode: a.postalCode,
      }))}
      bankInfo={s["payment.bankInfo"]}
    />
  );
}
