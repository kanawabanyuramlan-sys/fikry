"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { bool, int, logActivity, optDate, staffAction, str, UserError, type ActionResult } from "@/lib/action";
import { ORDER_STATUSES, ORDER_STATUS_LABEL, PAYMENT_STATUS_LABEL, ILLUSTRATIONS, PROMOTION_TYPES, COMPLAINT_STATUS_LABEL } from "@/lib/constants";
import { SETTING_DEFAULTS, type SettingKey } from "@/lib/settings";
import { slugify, rupiah } from "@/lib/format";
import { filesFrom, saveImage } from "@/lib/storage";

// ───────── categories & brands ─────────
export async function saveCategory(fd: FormData): Promise<ActionResult> {
  return staffAction("catalog.manage", async (me) => {
    const id = str(fd, "id");
    const name = z.string().trim().min(2, "Nama minimal 2 karakter").max(60).parse(str(fd, "name"));
    const parentId = str(fd, "parentId") || null;
    if (parentId && parentId === id) throw new UserError("Kategori tidak bisa menjadi induk dirinya sendiri.");
    if (parentId && id) {
      // prevent cycles
      let cur = await db.category.findUnique({ where: { id: parentId } });
      while (cur?.parentId) {
        if (cur.parentId === id) throw new UserError("Struktur kategori tidak boleh melingkar.");
        cur = await db.category.findUnique({ where: { id: cur.parentId } });
      }
    }
    let slug = slugify(str(fd, "slug") || name);
    const clash = await db.category.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
    if (clash) slug = `${slug}-${Date.now().toString(36).slice(-3)}`;
    const files = filesFrom(fd, "image");
    const image = files[0] ? await saveImage(files[0], "category") : undefined;
    const template = str(fd, "attributeTemplate")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20);
    const illustration = str(fd, "illustration");
    const data = {
      name,
      slug,
      parentId,
      description: str(fd, "description") || null,
      illustration: (ILLUSTRATIONS as readonly string[]).includes(illustration) ? illustration : null,
      sortOrder: int(fd, "sortOrder"),
      isActive: bool(fd, "isActive"),
      showInMenu: bool(fd, "showInMenu"),
      isFeatured: bool(fd, "isFeatured"),
      attributeTemplate: JSON.stringify(template),
      ...(image ? { image } : {}),
      ...(bool(fd, "removeImage") ? { image: null } : {}),
    };
    const c = id ? await db.category.update({ where: { id }, data }) : await db.category.create({ data });
    await logActivity(me.id, id ? "category.update" : "category.create", "category", c.id, `${me.name} ${id ? "mengubah" : "menambah"} kategori ${name}`);
    return { ok: true, message: "Kategori disimpan." };
  });
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  return staffAction("catalog.manage", async (me) => {
    const c = await db.category.findUnique({ where: { id }, include: { _count: { select: { products: true, children: true } } } });
    if (!c) throw new UserError("Kategori tidak ditemukan.");
    if (c._count.products > 0) throw new UserError(`Masih ada ${c._count.products} produk di kategori ini. Pindahkan dulu produknya.`);
    if (c._count.children > 0) throw new UserError("Hapus atau pindahkan subkategori terlebih dahulu.");
    await db.category.delete({ where: { id } });
    await logActivity(me.id, "category.delete", "category", id, `${me.name} menghapus kategori ${c.name}`);
    return { ok: true, message: "Kategori dihapus." };
  });
}

export async function saveBrand(fd: FormData): Promise<ActionResult> {
  return staffAction("catalog.manage", async (me) => {
    const id = str(fd, "id");
    const name = z.string().trim().min(1).max(60).parse(str(fd, "name"));
    const dup = await db.brand.findFirst({ where: { name, NOT: id ? { id } : undefined } });
    if (dup) return { ok: false, error: "Nama brand sudah ada.", fieldErrors: { name: "Sudah ada" } };
    let slug = slugify(name);
    if (await db.brand.findFirst({ where: { slug, NOT: id ? { id } : undefined } })) slug = `${slug}-${Date.now().toString(36).slice(-3)}`;
    const files = filesFrom(fd, "logo");
    const logo = files[0] ? await saveImage(files[0], "brand") : undefined;
    const data = {
      name,
      slug,
      description: str(fd, "description") || null,
      isActive: bool(fd, "isActive"),
      isFeatured: bool(fd, "isFeatured"),
      sortOrder: int(fd, "sortOrder"),
      ...(logo ? { logo } : {}),
      ...(bool(fd, "removeLogo") ? { logo: null } : {}),
    };
    const b = id ? await db.brand.update({ where: { id }, data }) : await db.brand.create({ data });
    await logActivity(me.id, id ? "brand.update" : "brand.create", "brand", b.id, `${me.name} ${id ? "mengubah" : "menambah"} brand ${name}`);
    return { ok: true, message: "Brand disimpan." };
  });
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  return staffAction("catalog.manage", async (me) => {
    const b = await db.brand.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!b) throw new UserError("Brand tidak ditemukan.");
    if (b._count.products > 0) throw new UserError(`Brand masih memiliki ${b._count.products} produk. Nonaktifkan brand atau pindahkan produknya.`);
    await db.brand.delete({ where: { id } });
    await logActivity(me.id, "brand.delete", "brand", id, `${me.name} menghapus brand ${b.name}`);
    return { ok: true, message: "Brand dihapus." };
  });
}

// ───────── inventory ─────────
export async function updateStock(fd: FormData): Promise<ActionResult> {
  return staffAction("inventory.update", async (me) => {
    const variantId = str(fd, "variantId");
    const mode = str(fd, "mode") === "delta" ? "delta" : "set";
    const value = int(fd, "value", NaN);
    if (!Number.isFinite(value)) throw new UserError("Masukkan angka stok.");
    const note = str(fd, "note").slice(0, 200) || null;
    const v = await db.productVariant.findUnique({ where: { id: variantId }, include: { product: { select: { id: true, name: true } } } });
    if (!v) throw new UserError("Varian tidak ditemukan.");
    const next = mode === "set" ? value : v.stock + value;
    if (next < 0) throw new UserError("Stok tidak boleh negatif.");
    if (next === v.stock) return { ok: true, message: "Tidak ada perubahan stok." };
    await db.$transaction([
      db.productVariant.update({ where: { id: v.id }, data: { stock: next } }),
      db.stockMovement.create({ data: { variantId: v.id, delta: next - v.stock, stockAfter: next, reason: "MANUAL", reference: note, userId: me.id } }),
    ]);
    const label = [v.color, v.size].filter(Boolean).join("/") || v.sku;
    await logActivity(me.id, "stock.update", "product", v.product.id, `${me.name} mengubah stok ${v.product.name} (${label}): ${v.stock} → ${next}${note ? ` — ${note}` : ""}`);
    return { ok: true, message: `Stok ${label} kini ${next}.` };
  });
}

// ───────── orders ─────────
export async function updateOrderStatus(fd: FormData): Promise<ActionResult> {
  return staffAction("orders.manage", async (me) => {
    const status = z.enum(ORDER_STATUSES).parse(str(fd, "status"));
    const note = str(fd, "note").slice(0, 500) || null;
    const o = await db.order.findUnique({ where: { id: str(fd, "id") }, include: { items: true } });
    if (!o) throw new UserError("Pesanan tidak ditemukan.");
    if (o.status === status) return { ok: true, message: "Status tidak berubah." };
    if (o.status === "CANCELLED") throw new UserError("Pesanan yang dibatalkan tidak dapat diubah lagi.");
    if (status === "SHIPPED" && !o.trackingNumber && !str(fd, "trackingNumber"))
      return { ok: false, error: "Isi kurir & nomor resi sebelum menandai Shipped.", fieldErrors: { trackingNumber: "Wajib" } };
    await db.$transaction(async (tx) => {
      if (status === "CANCELLED") {
        // return reserved stock
        for (const it of o.items) {
          if (!it.variantId) continue;
          const v = await tx.productVariant.update({ where: { id: it.variantId }, data: { stock: { increment: it.quantity } } }).catch(() => null);
          if (v) await tx.stockMovement.create({ data: { variantId: v.id, delta: it.quantity, stockAfter: v.stock, reason: "ORDER_CANCEL", reference: o.orderNumber, userId: me.id } });
        }
        if (o.couponCode) await tx.coupon.updateMany({ where: { code: o.couponCode, usedCount: { gt: 0 } }, data: { usedCount: { decrement: 1 } } });
      }
      await tx.order.update({ where: { id: o.id }, data: { status } });
      await tx.orderStatusHistory.create({ data: { orderId: o.id, status, note, userId: me.id } });
    });
    await logActivity(me.id, "order.status", "order", o.id, `${me.name} mengubah status ${o.orderNumber}: ${ORDER_STATUS_LABEL[o.status]} → ${ORDER_STATUS_LABEL[status]}`);
    return { ok: true, message: `Status pesanan: ${ORDER_STATUS_LABEL[status]}.` };
  });
}

export async function updateShipping(fd: FormData): Promise<ActionResult> {
  return staffAction("orders.manage", async (me) => {
    const o = await db.order.findUnique({ where: { id: str(fd, "id") } });
    if (!o) throw new UserError("Pesanan tidak ditemukan.");
    const shippingCost = int(fd, "shippingCost", o.shippingCost);
    if (shippingCost < 0) throw new UserError("Ongkir tidak valid.");
    const data = {
      shippingProvider: str(fd, "shippingProvider").slice(0, 60) || null,
      trackingNumber: str(fd, "trackingNumber").slice(0, 80) || null,
      estimatedDelivery: optDate(fd, "estimatedDelivery"),
      shippingNotes: str(fd, "shippingNotes").slice(0, 500) || null,
      shippingCost,
      total: o.subtotal - o.discount + shippingCost,
    };
    await db.order.update({ where: { id: o.id }, data });
    const parts = [
      data.shippingProvider !== o.shippingProvider && `kurir ${data.shippingProvider ?? "-"}`,
      data.trackingNumber !== o.trackingNumber && `resi ${data.trackingNumber ?? "-"}`,
      shippingCost !== o.shippingCost && `ongkir ${rupiah(o.shippingCost)} → ${rupiah(shippingCost)}`,
    ].filter(Boolean);
    await logActivity(me.id, "order.shipping", "order", o.id, `${me.name} memperbarui pengiriman ${o.orderNumber}${parts.length ? `: ${parts.join(", ")}` : ""}`);
    return { ok: true, message: "Info pengiriman disimpan." };
  });
}

export async function updatePayment(fd: FormData): Promise<ActionResult> {
  return staffAction("orders.manage", async (me) => {
    const status = z.enum(["UNPAID", "PAID", "REFUNDED"]).parse(str(fd, "paymentStatus"));
    const o = await db.order.findUnique({ where: { id: str(fd, "id") } });
    if (!o) throw new UserError("Pesanan tidak ditemukan.");
    await db.order.update({ where: { id: o.id }, data: { paymentStatus: status } });
    await logActivity(me.id, "order.payment", "order", o.id, `${me.name} menandai pembayaran ${o.orderNumber}: ${PAYMENT_STATUS_LABEL[o.paymentStatus]} → ${PAYMENT_STATUS_LABEL[status]}`);
    return { ok: true, message: `Pembayaran: ${PAYMENT_STATUS_LABEL[status]}.` };
  });
}

// ───────── promotions & coupons ─────────
export async function savePromotion(fd: FormData): Promise<ActionResult> {
  return staffAction("promotions.manage", async (me) => {
    const id = str(fd, "id");
    const type = z.enum(Object.keys(PROMOTION_TYPES) as [string, ...string[]]).parse(str(fd, "type"));
    const title = z.string().trim().min(2, "Judul wajib diisi").max(140).parse(str(fd, "title"));
    const url = str(fd, "url");
    if (url && !/^(\/|https?:\/\/)/.test(url)) return { ok: false, error: "URL tujuan harus diawali / atau https://", fieldErrors: { url: "Format salah" } };
    const startsAt = optDate(fd, "startsAt");
    const endsAt = optDate(fd, "endsAt");
    if (startsAt && endsAt && endsAt < startsAt) return { ok: false, error: "Tanggal berakhir harus setelah tanggal mulai.", fieldErrors: { endsAt: "Salah" } };
    const files = filesFrom(fd, "image");
    const image = files[0] ? await saveImage(files[0], "banner") : undefined;
    const illustration = str(fd, "illustration");
    const data = {
      type,
      title,
      subtitle: str(fd, "subtitle") || null,
      description: str(fd, "description") || null,
      ctaLabel: str(fd, "ctaLabel") || null,
      url: url || null,
      theme: ["light", "dark", "green", "lime"].includes(str(fd, "theme")) ? str(fd, "theme") : "light",
      illustration: (ILLUSTRATIONS as readonly string[]).includes(illustration) ? illustration : null,
      startsAt,
      endsAt,
      isActive: bool(fd, "isActive"),
      sortOrder: int(fd, "sortOrder"),
      ...(image ? { image } : {}),
      ...(bool(fd, "removeImage") ? { image: null } : {}),
    };
    const p = id ? await db.promotion.update({ where: { id }, data }) : await db.promotion.create({ data });
    await logActivity(me.id, id ? "promotion.update" : "promotion.create", "promotion", p.id, `${me.name} ${id ? "mengubah" : "membuat"} promosi “${title}” (${PROMOTION_TYPES[type]})`);
    return { ok: true, message: "Promosi disimpan.", redirect: "/admin/promotions" };
  });
}

export async function togglePromotion(id: string): Promise<ActionResult> {
  return staffAction("promotions.manage", async (me) => {
    const p = await db.promotion.findUnique({ where: { id } });
    if (!p) throw new UserError("Promosi tidak ditemukan.");
    await db.promotion.update({ where: { id }, data: { isActive: !p.isActive } });
    await logActivity(me.id, "promotion.toggle", "promotion", id, `${me.name} ${p.isActive ? "menonaktifkan" : "mengaktifkan"} promosi “${p.title}”`);
    return { ok: true, message: p.isActive ? "Promosi dinonaktifkan." : "Promosi diaktifkan." };
  });
}

export async function deletePromotion(id: string): Promise<ActionResult> {
  return staffAction("promotions.manage", async (me) => {
    const p = await db.promotion.delete({ where: { id } });
    await logActivity(me.id, "promotion.delete", "promotion", id, `${me.name} menghapus promosi “${p.title}”`);
    return { ok: true, message: "Promosi dihapus.", redirect: "/admin/promotions" };
  });
}

export async function saveCoupon(fd: FormData): Promise<ActionResult> {
  return staffAction("promotions.manage", async (me) => {
    const id = str(fd, "id");
    const data = z
      .object({
        code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/, "3–30 karakter huruf/angka"),
        type: z.enum(["PERCENT", "FIXED"]),
        value: z.coerce.number().int().min(1),
        minSpend: z.coerce.number().int().min(0),
        maxDiscount: z.coerce.number().int().min(0).optional(),
        maxUses: z.coerce.number().int().min(1).optional(),
        description: z.string().trim().max(140).optional(),
      })
      .parse({
        code: str(fd, "code"),
        type: str(fd, "type"),
        value: str(fd, "value") || 0,
        minSpend: str(fd, "minSpend") || 0,
        maxDiscount: str(fd, "maxDiscount") || undefined,
        maxUses: str(fd, "maxUses") || undefined,
        description: str(fd, "description") || undefined,
      });
    if (data.type === "PERCENT" && data.value > 90) return { ok: false, error: "Diskon persen maksimal 90%.", fieldErrors: { value: "Maks 90" } };
    const dup = await db.coupon.findFirst({ where: { code: data.code, NOT: id ? { id } : undefined } });
    if (dup) return { ok: false, error: "Kode voucher sudah ada.", fieldErrors: { code: "Sudah ada" } };
    const payload = {
      ...data,
      maxDiscount: data.maxDiscount || null,
      maxUses: data.maxUses ?? null,
      description: data.description ?? null,
      startsAt: optDate(fd, "startsAt"),
      // date-only input → valid until the end of that day
      endsAt: (() => {
        const e = optDate(fd, "endsAt");
        if (e) e.setHours(23, 59, 59, 999);
        return e;
      })(),
      isActive: bool(fd, "isActive"),
    };
    const c = id ? await db.coupon.update({ where: { id }, data: payload }) : await db.coupon.create({ data: payload });
    await logActivity(me.id, id ? "coupon.update" : "coupon.create", "coupon", c.id, `${me.name} ${id ? "mengubah" : "membuat"} voucher ${c.code}`);
    return { ok: true, message: "Voucher disimpan." };
  });
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  return staffAction("promotions.manage", async (me) => {
    const c = await db.coupon.delete({ where: { id } });
    await logActivity(me.id, "coupon.delete", "coupon", id, `${me.name} menghapus voucher ${c.code}`);
    return { ok: true, message: "Voucher dihapus." };
  });
}

// ───────── reviews & complaints ─────────
export async function setReviewStatus(id: string, status: "APPROVED" | "HIDDEN" | "PENDING"): Promise<ActionResult> {
  return staffAction("reviews.manage", async (me) => {
    const r = await db.review.update({ where: { id }, data: { status }, include: { product: { select: { name: true } } } });
    await logActivity(me.id, "review.moderate", "review", id, `${me.name} menandai ulasan ${r.product.name} sebagai ${status}`);
    return { ok: true, message: "Ulasan diperbarui." };
  });
}

export async function updateComplaint(fd: FormData): Promise<ActionResult> {
  return staffAction("complaints.manage", async (me) => {
    const status = z.enum(Object.keys(COMPLAINT_STATUS_LABEL) as [string, ...string[]]).parse(str(fd, "status"));
    const c = await db.complaint.update({
      where: { id: str(fd, "id") },
      data: { status, adminNote: str(fd, "adminNote").slice(0, 1000) || null },
    });
    await logActivity(me.id, "complaint.update", "complaint", c.id, `${me.name} memperbarui tiket ${c.ticketNumber} → ${COMPLAINT_STATUS_LABEL[status]}`);
    return { ok: true, message: "Tiket diperbarui." };
  });
}

// ───────── settings ─────────
export async function saveSettings(fd: FormData): Promise<ActionResult> {
  return staffAction("settings.manage", async (me) => {
    const keys = Object.keys(SETTING_DEFAULTS) as SettingKey[];
    const changed: string[] = [];
    const ops = [];
    for (const k of keys) {
      if (!fd.has(k)) continue;
      let v = str(fd, k);
      if (k === "products.requireApproval") v = v === "true" ? "true" : "false";
      if (k.startsWith("shipping.flat") || k === "shipping.freeThreshold" || k === "inventory.lowStock") v = String(Math.max(0, parseInt(v.replace(/\D/g, "") || "0", 10)));
      if (k === "contact.whatsapp") v = v.replace(/[^0-9]/g, "");
      if ((k === "social.instagram" || k === "social.tiktok") && v && !/^https?:\/\//.test(v)) v = `https://${v}`;
      ops.push(db.setting.upsert({ where: { key: k }, update: { value: v }, create: { key: k, value: v } }));
      changed.push(k);
    }
    // approval toggle arrives as checkbox; absence means "false" when its section was submitted
    if (fd.has("__approvalSection") && !fd.has("products.requireApproval")) {
      ops.push(db.setting.upsert({ where: { key: "products.requireApproval" }, update: { value: "false" }, create: { key: "products.requireApproval", value: "false" } }));
      changed.push("products.requireApproval");
    }
    const logo = filesFrom(fd, "logoFile")[0];
    if (logo) {
      const url = await saveImage(logo, "logo");
      ops.push(db.setting.upsert({ where: { key: "store.logo" }, update: { value: url }, create: { key: "store.logo", value: url } }));
      changed.push("store.logo");
    }
    if (bool(fd, "removeLogo")) ops.push(db.setting.upsert({ where: { key: "store.logo" }, update: { value: "" }, create: { key: "store.logo", value: "" } }));
    await db.$transaction(ops);
    await logActivity(me.id, "settings.update", "settings", null, `${me.name} memperbarui pengaturan (${changed.length} kolom)`, { keys: changed });
    return { ok: true, message: "Pengaturan disimpan." };
  });
}
