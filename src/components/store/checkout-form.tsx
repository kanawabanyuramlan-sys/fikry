"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, MessageCircle, Landmark, ArrowLeft, Pencil } from "@/components/icons";
import { useShop } from "@/components/providers/shop";
import { useToast } from "@/components/providers/toast";
import { useQuote } from "./cart-drawer";
import { ProductMedia } from "./product-media";
import { COUPON_KEY } from "./cart-view";
import { placeOrder } from "@/app/actions/store";
import { PROVINCES } from "@/lib/constants";
import { rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type Addr = { id: string; label: string; recipient: string; phone: string; address: string; province: string; city: string; postalCode: string };
type Form = { name: string; phone: string; email: string; address: string; province: string; city: string; postalCode: string; notes: string };

export function CheckoutForm({
  initialMethod,
  customer,
  addresses,
  bankInfo,
}: {
  initialMethod: "BANK_TRANSFER" | "WHATSAPP";
  customer: { name: string; email: string; phone: string } | null;
  addresses: Addr[];
  bankInfo: string;
}) {
  const shop = useShop();
  const toast = useToast();
  const router = useRouter();
  const def = addresses[0];
  const [f, setF] = useState<Form>({
    name: def?.recipient ?? customer?.name ?? "",
    phone: def?.phone ?? customer?.phone ?? "",
    email: customer?.email ?? "",
    address: def?.address ?? "",
    province: def?.province ?? "",
    city: def?.city ?? "",
    postalCode: def?.postalCode ?? "",
    notes: "",
  });
  const [method, setMethod] = useState(initialMethod);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [saveAddr, setSaveAddr] = useState(addresses.length === 0);
  const [step, setStep] = useState<"form" | "review">("form");
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [pending, start] = useTransition();
  const done = useRef(false);
  useEffect(() => {
    try {
      setCoupon(sessionStorage.getItem(COUPON_KEY));
    } catch {}
  }, []);
  const { quote, loading } = useQuote(coupon, f.province || null);

  useEffect(() => {
    if (shop.ready && !shop.lines.length && !done.current) router.replace("/cart");
  }, [shop.ready, shop.lines.length, router]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = "Nama wajib diisi";
    if (!/^[+0-9\s-]{8,20}$/.test(f.phone.trim())) e.phone = "Nomor WhatsApp tidak valid";
    if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = "Email tidak valid";
    if (f.address.trim().length < 10) e.address = "Alamat lengkap minimal 10 karakter";
    if (!f.province) e.province = "Pilih provinsi";
    if (f.city.trim().length < 2) e.city = "Kota wajib diisi";
    if (!/^[0-9]{5}$/.test(f.postalCode.trim())) e.postalCode = "Kode pos 5 digit";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const hasIssue = !quote || quote.lines.some((l) => l.quantity <= 0 || l.quantity !== l.requested) || (coupon && quote.couponError);

  const submit = () => {
    const fd = new FormData();
    Object.entries(f).forEach(([k, v]) => fd.set(k, v));
    fd.set("paymentMethod", method);
    if (quote?.coupon) fd.set("coupon", quote.coupon.code);
    fd.set("lines", JSON.stringify(shop.lines));
    if (saveAddr) fd.set("saveAddress", "on");
    start(async () => {
      const r = await placeOrder(fd);
      if (r.ok) {
        done.current = true;
        shop.clear();
        try {
          sessionStorage.removeItem(COUPON_KEY);
        } catch {}
        toast("success", "Pesanan berhasil dibuat!");
        router.push(r.redirect!);
      } else {
        setErrors(r.fieldErrors ?? {});
        toast("error", r.error);
        if (r.fieldErrors && Object.keys(r.fieldErrors).some((k) => k in f)) setStep("form");
      }
    });
  };

  const input = (k: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="label">{label}</span>
      <input value={f[k]} onChange={set(k)} name={k} aria-invalid={!!errors[k]} className={cn("input", errors[k] && "border-sale")} {...props} />
      {errors[k] && <span className="mt-1 block text-xs font-medium text-sale">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="container-x py-8 sm:py-12">
      <div className="mb-8 flex items-center gap-3 text-sm">
        <Link href="/cart" className="flex items-center gap-1 text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Keranjang
        </Link>
        <span className="text-ink/20">/</span>
        <span className={cn(step === "form" ? "font-bold" : "text-ink-soft")}>1. Data pengiriman</span>
        <span className="text-ink/20">/</span>
        <span className={cn(step === "review" ? "font-bold" : "text-ink-soft")}>2. Ringkasan & konfirmasi</span>
      </div>
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        <div>
          {step === "form" ? (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                if (validate()) {
                  setStep("review");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else toast("error", "Lengkapi data yang ditandai.");
              }}
              className="space-y-8"
            >
              <section>
                <h1 className="font-serif text-[32px] leading-[1.05]">Data pemesan</h1>
                {!customer && (
                  <p className="mt-1 text-sm text-ink-soft">
                    Sudah punya akun?{" "}
                    <Link href="/account/login?next=/checkout" className="link">
                      Login
                    </Link>{" "}
                    untuk mengisi otomatis & menyimpan riwayat pesanan.
                  </p>
                )}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {input("name", "Nama lengkap", { autoComplete: "name" })}
                  {input("phone", "Nomor WhatsApp", { autoComplete: "tel", inputMode: "tel", placeholder: "08xxxxxxxxxx" })}
                  <div className="sm:col-span-2">{input("email", "Email", { type: "email", autoComplete: "email" })}</div>
                </div>
              </section>
              <section>
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-[26px] leading-tight">Alamat pengiriman</h2>
                  {addresses.length > 0 && (
                    <select
                      aria-label="Pilih alamat tersimpan"
                      className="input w-auto py-2 text-xs"
                      onChange={(e) => {
                        const a = addresses.find((x) => x.id === e.target.value);
                        if (a) setF((x) => ({ ...x, name: a.recipient, phone: a.phone, address: a.address, province: a.province, city: a.city, postalCode: a.postalCode }));
                      }}
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label} — {a.city}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="label">Alamat lengkap</span>
                    <textarea value={f.address} onChange={set("address")} rows={3} autoComplete="street-address" placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, kecamatan" className={cn("input", errors.address && "border-sale")} />
                    {errors.address && <span className="mt-1 block text-xs font-medium text-sale">{errors.address}</span>}
                  </label>
                  <label className="block">
                    <span className="label">Provinsi</span>
                    <select value={f.province} onChange={set("province")} className={cn("input", errors.province && "border-sale")}>
                      <option value="">Pilih provinsi</option>
                      {PROVINCES.map((p) => (
                        <option key={p}>{p}</option>
                      ))}
                    </select>
                    {errors.province && <span className="mt-1 block text-xs font-medium text-sale">{errors.province}</span>}
                  </label>
                  {input("city", "Kota / Kabupaten", { autoComplete: "address-level2" })}
                  {input("postalCode", "Kode pos", { inputMode: "numeric", maxLength: 5, autoComplete: "postal-code" })}
                  <label className="block sm:col-span-2">
                    <span className="label">Catatan pesanan (opsional)</span>
                    <textarea value={f.notes} onChange={set("notes")} rows={2} maxLength={500} placeholder="Contoh: titip ke satpam, kirim sore hari" className="input" />
                  </label>
                </div>
                {customer && (
                  <label className="mt-4 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={saveAddr} onChange={(e) => setSaveAddr(e.target.checked)} className="h-4 w-4 accent-brand-dark" />
                    Simpan alamat ini ke akun saya
                  </label>
                )}
              </section>
              <section>
                <h2 className="font-serif text-[26px] leading-tight">Metode pemesanan & pembayaran</h2>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    { v: "BANK_TRANSFER" as const, icon: Landmark, t: "Transfer bank (manual)", d: "Transfer ke rekening toko, lalu kirim bukti via WhatsApp." },
                    { v: "WHATSAPP" as const, icon: MessageCircle, t: "Checkout via WhatsApp", d: "Pesanan tercatat, lalu konfirmasi & pembayaran dibantu admin di WhatsApp." },
                  ].map((m) => (
                    <label key={m.v} className={cn("flex cursor-pointer gap-3 rounded-2xl border-2 p-4 transition", method === m.v ? "border-brand-dark bg-brand-off" : "border-ink/10 hover:border-ink/30")}>
                      <input type="radio" name="method" className="sr-only" checked={method === m.v} onChange={() => setMethod(m.v)} />
                      <m.icon className="h-5 w-5 shrink-0 text-brand-dark" />
                      <span>
                        <span className="block text-sm font-bold">{m.t}</span>
                        <span className="text-xs text-ink-soft">{m.d}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-soft">
                  Pembayaran online (payment gateway) belum tersedia. Tidak ada pembayaran yang diproses otomatis di situs ini.
                </p>
              </section>
              <button className="btn btn-primary h-12 w-full sm:w-auto sm:px-10">Lanjut ke ringkasan</button>
            </form>
          ) : (
            <div className="space-y-6">
              <h1 className="font-serif text-[32px] leading-[1.05]">Periksa pesanan kamu</h1>
              <div className="card divide-y divide-ink/10">
                <div className="flex items-start justify-between gap-4 p-5">
                  <div className="text-sm">
                    <p className="label">Dikirim ke</p>
                    <p className="font-semibold">
                      {f.name} · {f.phone}
                    </p>
                    <p className="text-ink-soft">{f.email}</p>
                    <p className="mt-2">{f.address}</p>
                    <p>
                      {f.city}, {f.province} {f.postalCode}
                    </p>
                    {f.notes && <p className="mt-2 italic text-ink-soft">Catatan: {f.notes}</p>}
                  </div>
                  <button onClick={() => setStep("form")} className="btn btn-ghost btn-sm">
                    <Pencil className="h-3.5 w-3.5" /> Ubah
                  </button>
                </div>
                <div className="flex items-start justify-between gap-4 p-5 text-sm">
                  <div>
                    <p className="label">Metode</p>
                    <p className="font-semibold">{method === "WHATSAPP" ? "Checkout via WhatsApp" : "Transfer bank (manual)"}</p>
                    {method === "BANK_TRANSFER" && <p className="mt-1 whitespace-pre-line text-ink-soft">{bankInfo}</p>}
                  </div>
                  <button onClick={() => setStep("form")} className="btn btn-ghost btn-sm">
                    <Pencil className="h-3.5 w-3.5" /> Ubah
                  </button>
                </div>
              </div>
              <button onClick={submit} disabled={pending || loading || !!hasIssue} className="btn btn-primary h-14 w-full text-base">
                {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
                Konfirmasi Pesanan · {quote ? rupiah(quote.total) : "…"}
              </button>
              {hasIssue && quote && <p className="text-sm font-medium text-sale">Ada perubahan stok/voucher. Kembali ke keranjang untuk menyesuaikan.</p>}
              <p className="text-xs text-ink-soft">
                Dengan mengonfirmasi, kamu menyetujui{" "}
                <Link href="/pages/terms" className="underline">
                  Syarat & Ketentuan
                </Link>{" "}
                serta{" "}
                <Link href="/pages/returns" className="underline">
                  Kebijakan Retur
                </Link>
                .
              </p>
            </div>
          )}
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold">Ringkasan pesanan</h2>
          {!quote ? (
            <div className="grid h-32 place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-ink-soft" />
            </div>
          ) : (
            <>
              <ul className="mt-4 max-h-80 space-y-4 overflow-y-auto pr-1">
                {quote.lines.map((l) => (
                  <li key={l.variantId} className="flex gap-3">
                    <div className="relative w-16 shrink-0 overflow-hidden rounded-xl">
                      <ProductMedia image={l.image} illustration={l.illustration} color={l.colorHex} alt={l.name} label={false} sizes="64px" />
                      <span className="absolute right-1 top-1 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-paper">{l.quantity}</span>
                    </div>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="line-clamp-1 font-semibold">{l.name}</p>
                      <p className="text-xs text-ink-soft">{[l.color, l.size].filter(Boolean).join(" / ")}</p>
                      {l.issue && <p className="text-xs text-sale">{l.issue}</p>}
                    </div>
                    <p className="text-sm font-semibold">{rupiah(l.lineTotal)}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-5 space-y-2 border-t border-ink/10 pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Subtotal</dt>
                  <dd>{rupiah(quote.subtotal)}</dd>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-brand-dark">
                    <dt>Voucher {quote.coupon?.code}</dt>
                    <dd>−{rupiah(quote.discount)}</dd>
                  </div>
                )}
                {coupon && quote.couponError && <p className="text-xs text-sale">Voucher {coupon}: {quote.couponError}</p>}
                <div className="flex justify-between">
                  <dt className="text-ink-soft">Ongkos kirim</dt>
                  <dd>{quote.shippingCost === null ? <span className="text-ink-soft">Pilih provinsi</span> : quote.shippingCost === 0 ? "Gratis" : rupiah(quote.shippingCost)}</dd>
                </div>
                <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-extrabold">
                  <dt>Total</dt>
                  <dd>{rupiah(quote.total)}</dd>
                </div>
              </dl>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
