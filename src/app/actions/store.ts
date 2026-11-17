"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { safe, str, UserError, type ActionResult } from "@/lib/action";
import {
  createSession,
  destroySession,
  getCustomer,
  hashPassword,
  passwordOk,
  PASSWORD_RULE,
  randomToken,
  rateLimit,
  clearRateLimit,
  verifyPassword,
} from "@/lib/auth";
import { quoteCart } from "@/lib/pricing";
import { PROVINCES, ORDER_STATUS_LABEL } from "@/lib/constants";
import { isSafePath, normalizePhone } from "@/lib/format";
import { filesFrom, saveImage } from "@/lib/storage";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

const phone = z
  .string()
  .trim()
  .min(8, "Nomor WhatsApp tidak valid")
  .max(20)
  .regex(/^[+0-9\s-]+$/, "Nomor WhatsApp tidak valid");
const email = z.string().trim().toLowerCase().email("Email tidak valid").max(120);

// ───────── newsletter ─────────
export async function subscribeNewsletter(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const e = email.parse(str(fd, "email"));
    if (!rateLimit(`nl:${await ip()}`, 10)) throw new UserError("Terlalu banyak percobaan. Coba lagi nanti.");
    await db.newsletterSubscriber.upsert({ where: { email: e }, update: {}, create: { email: e } });
    return { ok: true, message: "Terima kasih! Kamu akan menerima info produk & promo terbaru." };
  });
}

// ───────── checkout ─────────
const OrderInput = z.object({
  name: z.string().trim().min(2, "Nama wajib diisi").max(100),
  phone,
  email,
  address: z.string().trim().min(10, "Alamat terlalu pendek").max(500),
  province: z.enum(PROVINCES as [string, ...string[]], { errorMap: () => ({ message: "Pilih provinsi" }) }),
  city: z.string().trim().min(2, "Kota wajib diisi").max(80),
  postalCode: z.string().trim().regex(/^[0-9]{5}$/, "Kode pos 5 digit"),
  notes: z.string().trim().max(500).optional(),
  paymentMethod: z.enum(["BANK_TRANSFER", "WHATSAPP"]),
  coupon: z.string().trim().max(40).optional(),
  lines: z.array(z.object({ variantId: z.string().max(40), quantity: z.number().int().min(1).max(99) })).min(1, "Keranjang kosong").max(50),
  saveAddress: z.boolean(),
});

function orderNumber() {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = randomToken(6).replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();
  return `VRD-${ymd}-${rnd}`;
}

export async function placeOrder(fd: FormData): Promise<ActionResult<{ orderNumber: string; token: string }>> {
  return safe(async () => {
    if (!rateLimit(`order:${await ip()}`, 20, 60 * 60 * 1000)) throw new UserError("Terlalu banyak pesanan dari perangkat ini. Hubungi CS kami.");
    let lines: unknown = [];
    try {
      lines = JSON.parse(str(fd, "lines") || "[]");
    } catch {}
    const input = OrderInput.parse({
      name: str(fd, "name"),
      phone: str(fd, "phone"),
      email: str(fd, "email"),
      address: str(fd, "address"),
      province: str(fd, "province"),
      city: str(fd, "city"),
      postalCode: str(fd, "postalCode"),
      notes: str(fd, "notes") || undefined,
      paymentMethod: str(fd, "paymentMethod") || "BANK_TRANSFER",
      coupon: str(fd, "coupon") || undefined,
      lines,
      saveAddress: fd.get("saveAddress") === "on",
    });

    const quote = await quoteCart(input.lines, input.coupon, input.province);
    if (!quote.lines.length) throw new UserError("Produk di keranjang sudah tidak tersedia.");
    const changed = quote.lines.find((l) => l.quantity !== l.requested || l.quantity <= 0);
    if (changed || quote.missing.length)
      throw new UserError(`Stok berubah untuk ${changed?.name ?? "beberapa produk"}. Periksa kembali keranjang Anda.`);
    if (input.coupon && quote.couponError) throw new UserError(quote.couponError);

    const me = await getCustomer();
    const number = orderNumber();
    const token = randomToken(24);

    await db.$transaction(async (tx) => {
      // Reserve stock atomically: the conditional update fails if someone else bought the last unit.
      for (const l of quote.lines) {
        const res = await tx.productVariant.updateMany({
          where: { id: l.variantId, stock: { gte: l.quantity } },
          data: { stock: { decrement: l.quantity } },
        });
        if (res.count === 0) throw new UserError(`Stok ${l.name} (${[l.color, l.size].filter(Boolean).join(" / ")}) baru saja habis.`);
        const v = await tx.productVariant.findUniqueOrThrow({ where: { id: l.variantId }, select: { stock: true } });
        await tx.stockMovement.create({
          data: { variantId: l.variantId, delta: -l.quantity, stockAfter: v.stock, reason: "ORDER", reference: number },
        });
      }
      if (quote.coupon) {
        const c = await tx.coupon.findUniqueOrThrow({ where: { code: quote.coupon.code } });
        const upd = await tx.coupon.updateMany({
          where: { id: c.id, ...(c.maxUses !== null ? { usedCount: { lt: c.maxUses } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (upd.count === 0) throw new UserError("Kuota voucher baru saja habis.");
      }
      let customerId = me?.id ?? null;
      if (!customerId) {
        const existing = await tx.customer.findUnique({ where: { email: input.email } });
        customerId = existing
          ? existing.id
          : (await tx.customer.create({ data: { email: input.email, name: input.name, phone: input.phone } })).id;
      } else if (input.saveAddress) {
        const count = await tx.address.count({ where: { customerId } });
        const dup = await tx.address.findFirst({ where: { customerId, address: input.address, postalCode: input.postalCode } });
        if (!dup)
          await tx.address.create({
            data: {
              customerId, label: count ? "Alamat" : "Rumah", recipient: input.name, phone: input.phone, address: input.address,
              province: input.province, city: input.city, postalCode: input.postalCode, isDefault: count === 0,
            },
          });
      }
      await tx.order.create({
        data: {
          orderNumber: number,
          accessToken: token,
          customerId,
          viaAccount: !!me,
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: input.address,
          province: input.province,
          city: input.city,
          postalCode: input.postalCode,
          notes: input.notes,
          subtotal: quote.subtotal,
          discount: quote.discount,
          shippingCost: quote.shippingCost ?? 0,
          total: quote.total,
          couponCode: quote.coupon?.code,
          paymentMethod: input.paymentMethod,
          channel: input.paymentMethod === "WHATSAPP" ? "WHATSAPP" : "WEB",
          items: {
            create: quote.lines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              productName: l.name,
              brandName: l.brand,
              sku: l.sku,
              size: l.size,
              color: l.color,
              price: l.price,
              quantity: l.quantity,
            })),
          },
          history: { create: { status: "RECEIVED", note: "Pesanan dibuat oleh pelanggan" } },
        },
      });
    });
    return { ok: true, data: { orderNumber: number, token }, redirect: `/order/${number}?t=${token}` };
  });
}

// ───────── order tracking ─────────
export type TrackResult = {
  orderNumber: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  total: number;
  paymentStatus: string;
  shippingProvider: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  city: string;
  items: { name: string; qty: number; variant: string }[];
  history: { status: string; label: string; note: string | null; at: string }[];
  link: string;
};

export async function trackOrder(fd: FormData): Promise<ActionResult<TrackResult>> {
  return safe(async () => {
    const number = str(fd, "orderNumber").toUpperCase();
    const contact = str(fd, "contact").toLowerCase();
    if (!number || !contact) throw new UserError("Isi Order ID dan email / nomor WhatsApp.");
    if (!rateLimit(`track:${await ip()}`, 15)) throw new UserError("Terlalu banyak percobaan. Coba lagi dalam 10 menit.");
    const o = await db.order.findUnique({
      where: { orderNumber: number },
      include: { items: true, history: { orderBy: { createdAt: "asc" } } },
    });
    const match = o && (o.email.toLowerCase() === contact || normalizePhone(o.phone) === normalizePhone(contact));
    if (!o || !match) throw new UserError("Pesanan tidak ditemukan. Periksa Order ID dan data verifikasi.");
    return {
      ok: true,
      data: {
        orderNumber: o.orderNumber,
        status: o.status,
        statusLabel: ORDER_STATUS_LABEL[o.status] ?? o.status,
        createdAt: o.createdAt.toISOString(),
        total: o.total,
        paymentStatus: o.paymentStatus,
        shippingProvider: o.shippingProvider,
        trackingNumber: o.trackingNumber,
        estimatedDelivery: o.estimatedDelivery?.toISOString() ?? null,
        city: o.city,
        items: o.items.map((i) => ({ name: i.productName, qty: i.quantity, variant: [i.color, i.size].filter(Boolean).join(" / ") })),
        history: o.history.map((h) => ({ status: h.status, label: ORDER_STATUS_LABEL[h.status] ?? h.status, note: h.note, at: h.createdAt.toISOString() })),
        link: `/order/${o.orderNumber}?t=${o.accessToken}`,
      },
    };
  });
}

// ───────── customer accounts ─────────
export async function registerCustomer(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const data = z
      .object({
        name: z.string().trim().min(2, "Nama wajib diisi").max(100),
        email,
        phone: phone.optional(),
        password: z.string().refine(passwordOk, PASSWORD_RULE),
      })
      .parse({ name: str(fd, "name"), email: str(fd, "email"), phone: str(fd, "phone") || undefined, password: str(fd, "password") });
    if (!rateLimit(`reg:${await ip()}`, 10)) throw new UserError("Terlalu banyak percobaan. Coba lagi nanti.");
    const existing = await db.customer.findUnique({ where: { email: data.email } });
    if (existing?.passwordHash) return { ok: false, error: "Email sudah terdaftar. Silakan login.", fieldErrors: { email: "Email sudah terdaftar" } };
    const passwordHash = await hashPassword(data.password);
    // A guest record may exist from an earlier checkout. Its guest orders stay private (viaAccount=false)
    // and remain reachable only through Order Tracking — registering an email never exposes them.
    const c = existing
      ? await db.customer.update({ where: { id: existing.id }, data: { name: data.name, phone: data.phone, passwordHash, sessionVersion: { increment: 1 } } })
      : await db.customer.create({ data: { name: data.name, email: data.email, phone: data.phone, passwordHash } });
    await createSession("customer", c.id, c.sessionVersion);
    const next = str(fd, "next");
    return { ok: true, message: `Selamat datang, ${c.name.split(" ")[0]}!`, redirect: isSafePath(next) ? next : "/account" };
  });
}

export async function loginCustomer(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const e = str(fd, "email").toLowerCase();
    const key = `cl:${await ip()}:${e}`;
    if (!rateLimit(key, 8)) throw new UserError("Terlalu banyak percobaan login. Coba lagi dalam 10 menit.");
    const c = await db.customer.findUnique({ where: { email: e } });
    if (!c?.passwordHash || !(await verifyPassword(str(fd, "password"), c.passwordHash)))
      throw new UserError("Email atau password salah.");
    clearRateLimit(key);
    await createSession("customer", c.id, c.sessionVersion);
    const next = str(fd, "next");
    return { ok: true, message: `Halo, ${c.name.split(" ")[0]}!`, redirect: isSafePath(next) ? next : "/account" };
  });
}

export async function logoutCustomer(): Promise<ActionResult> {
  await destroySession("customer");
  return { ok: true, message: "Anda telah keluar.", redirect: "/" };
}

async function me() {
  const c = await getCustomer();
  if (!c) throw new UserError("Silakan login terlebih dahulu.");
  return c;
}

export async function updateProfile(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    const data = z
      .object({ name: z.string().trim().min(2).max(100), phone: phone.optional() })
      .parse({ name: str(fd, "name"), phone: str(fd, "phone") || undefined });
    await db.customer.update({ where: { id: c.id }, data });
    return { ok: true, message: "Profil diperbarui." };
  });
}

export async function changeCustomerPassword(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    const row = await db.customer.findUniqueOrThrow({ where: { id: c.id } });
    if (!row.passwordHash || !(await verifyPassword(str(fd, "current"), row.passwordHash)))
      return { ok: false, error: "Password saat ini salah.", fieldErrors: { current: "Password salah" } };
    const next = str(fd, "password");
    if (!passwordOk(next)) return { ok: false, error: PASSWORD_RULE, fieldErrors: { password: PASSWORD_RULE } };
    const u = await db.customer.update({ where: { id: c.id }, data: { passwordHash: await hashPassword(next), sessionVersion: { increment: 1 } } });
    await createSession("customer", u.id, u.sessionVersion);
    return { ok: true, message: "Password diganti. Sesi di perangkat lain telah dikeluarkan." };
  });
}

const AddressInput = z.object({
  label: z.string().trim().min(1).max(30),
  recipient: z.string().trim().min(2).max(100),
  phone,
  address: z.string().trim().min(10).max(500),
  province: z.enum(PROVINCES as [string, ...string[]]),
  city: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().regex(/^[0-9]{5}$/, "Kode pos 5 digit"),
});

export async function saveAddress(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    const data = AddressInput.parse(Object.fromEntries(["label", "recipient", "phone", "address", "province", "city", "postalCode"].map((k) => [k, str(fd, k)])));
    const id = str(fd, "id");
    const isDefault = fd.get("isDefault") === "on";
    if (isDefault) await db.address.updateMany({ where: { customerId: c.id }, data: { isDefault: false } });
    if (id) {
      const own = await db.address.findFirst({ where: { id, customerId: c.id } });
      if (!own) throw new UserError("Alamat tidak ditemukan.");
      await db.address.update({ where: { id }, data: { ...data, isDefault: isDefault || own.isDefault } });
    } else {
      const count = await db.address.count({ where: { customerId: c.id } });
      await db.address.create({ data: { ...data, customerId: c.id, isDefault: isDefault || count === 0 } });
    }
    return { ok: true, message: "Alamat disimpan." };
  });
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    await db.address.deleteMany({ where: { id, customerId: c.id } });
    return { ok: true, message: "Alamat dihapus." };
  });
}

// ───────── reviews ─────────
export async function submitReview(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const c = await me();
    const data = z
      .object({
        productId: z.string().min(1).max(40),
        rating: z.coerce.number().int().min(1, "Pilih rating").max(5),
        title: z.string().trim().max(80).optional(),
        body: z.string().trim().min(10, "Ulasan minimal 10 karakter").max(1500),
      })
      .parse({ productId: str(fd, "productId"), rating: str(fd, "rating"), title: str(fd, "title") || undefined, body: str(fd, "body") });
    const product = await db.product.findFirst({ where: { id: data.productId, status: "PUBLISHED" } });
    if (!product) throw new UserError("Produk tidak ditemukan.");
    await db.review.upsert({
      where: { productId_customerId: { productId: data.productId, customerId: c.id } },
      update: { rating: data.rating, title: data.title, body: data.body, status: "PENDING" },
      create: { ...data, customerId: c.id },
    });
    return { ok: true, message: "Terima kasih! Ulasan akan tampil setelah dimoderasi tim kami." };
  });
}

// ───────── returns / complaints ─────────
export async function submitComplaint(fd: FormData): Promise<ActionResult<{ ticket: string }>> {
  return safe(async () => {
    if (!rateLimit(`cmp:${await ip()}`, 10)) throw new UserError("Terlalu banyak pengajuan. Coba lagi nanti.");
    const data = z
      .object({
        orderNumber: z.string().trim().toUpperCase().min(5, "Order ID wajib diisi"),
        email,
        name: z.string().trim().min(2).max(100),
        phone,
        productName: z.string().trim().min(2, "Pilih / tulis produk").max(200),
        type: z.enum(["RETURN", "EXCHANGE", "REFUND", "WARRANTY", "COMPLAINT"]),
        reason: z.string().trim().min(15, "Jelaskan alasan minimal 15 karakter").max(2000),
      })
      .parse(Object.fromEntries(["orderNumber", "email", "name", "phone", "productName", "type", "reason"].map((k) => [k, str(fd, k)])));
    const order = await db.order.findUnique({ where: { orderNumber: data.orderNumber } });
    if (!order || order.email.toLowerCase() !== data.email)
      return { ok: false, error: "Order ID dan email tidak cocok.", fieldErrors: { orderNumber: "Tidak cocok dengan email" } };
    const files = filesFrom(fd, "photos").slice(0, 4);
    const photos: string[] = [];
    for (const f of files) photos.push(await saveImage(f, "complaint"));
    const ticket = `CMP-${randomToken(6).replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()}`;
    await db.complaint.create({
      data: {
        ticketNumber: ticket, orderId: order.id, name: data.name, email: data.email, phone: data.phone,
        productName: data.productName, type: data.type, reason: data.reason, photos: JSON.stringify(photos),
      },
    });
    return { ok: true, message: `Pengajuan diterima. Nomor tiket: ${ticket}`, data: { ticket } };
  });
}
