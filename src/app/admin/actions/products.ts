"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { bool, logActivity, staffAction, str, UserError, type ActionResult } from "@/lib/action";
import { can, type Staff } from "@/lib/auth";
import { CONDITIONS, GENDERS, ILLUSTRATIONS, PRODUCT_STATUS_LABEL } from "@/lib/constants";
import { discountPercent, parseJson, rupiah, slugify } from "@/lib/format";
import { filesFrom, saveImage } from "@/lib/storage";
import { getSettings } from "@/lib/settings";
import { randomToken } from "@/lib/auth";

const VariantRow = z.object({
  id: z.string().max(40).optional().nullable(),
  sku: z.string().trim().max(60).optional().nullable(),
  color: z.string().trim().max(40).optional().nullable(),
  colorHex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable()
    .or(z.literal("")),
  size: z.string().trim().max(20).optional().nullable(),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif").max(100000),
  isActive: z.boolean().default(true),
});

const ProductInput = z
  .object({
    name: z.string().trim().min(3, "Nama produk minimal 3 karakter").max(140),
    brandId: z.string().min(1, "Pilih brand"),
    categoryId: z.string().min(1, "Pilih kategori"),
    description: z.string().trim().min(20, "Deskripsi minimal 20 karakter").max(8000),
    originalPrice: z.coerce.number().int().min(0).max(1_000_000_000),
    sellingPrice: z.coerce.number().int().min(1000, "Harga jual minimal Rp1.000").max(1_000_000_000),
    sku: z.string().trim().max(60).optional(),
    gender: z.enum(Object.keys(GENDERS) as [string, ...string[]]),
    condition: z.enum(Object.keys(CONDITIONS) as [string, ...string[]]),
    material: z.string().trim().max(120).optional(),
    illustration: z.enum(ILLUSTRATIONS),
    seoTitle: z.string().trim().max(70).optional(),
    seoDescription: z.string().trim().max(170).optional(),
    attributes: z.array(z.object({ name: z.string().trim().max(60), value: z.string().trim().max(300) })).max(40),
    variants: z.array(VariantRow).min(1, "Minimal satu varian (warna/ukuran/stok)").max(300),
  })
  .refine((d) => d.originalPrice === 0 || d.originalPrice >= d.sellingPrice, {
    message: "Harga asli harus ≥ harga jual (kosongkan/0 jika tidak diskon)",
    path: ["originalPrice"],
  });

function parseForm(fd: FormData) {
  return ProductInput.parse({
    name: str(fd, "name"),
    brandId: str(fd, "brandId"),
    categoryId: str(fd, "categoryId"),
    description: str(fd, "description"),
    originalPrice: str(fd, "originalPrice").replace(/\D/g, "") || 0,
    sellingPrice: str(fd, "sellingPrice").replace(/\D/g, "") || 0,
    sku: str(fd, "sku") || undefined,
    gender: str(fd, "gender") || "UNISEX",
    condition: str(fd, "condition") || "NEW",
    material: str(fd, "material") || undefined,
    illustration: str(fd, "illustration") || "accessory",
    seoTitle: str(fd, "seoTitle") || undefined,
    seoDescription: str(fd, "seoDescription") || undefined,
    attributes: parseJson(str(fd, "attributes"), []).filter((a: { name?: string; value?: string }) => a?.name && a?.value),
    variants: parseJson(str(fd, "variants"), []),
  });
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = slugify(base) || "produk";
  for (let i = 0; i < 20; i++) {
    const hit = await db.product.findUnique({ where: { slug } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${slugify(base)}-${i + 2}`;
  }
  return `${slugify(base)}-${randomToken(3).toLowerCase()}`;
}

/** Decide the status a save should produce, following the Owner's approval setting. */
async function resolveStatus(me: Staff, intent: string, current: string | null) {
  const canPublish = can(me, "products.publish");
  const s = await getSettings();
  const requireApproval = s["products.requireApproval"] === "true";
  if (intent === "publish") {
    if (!canPublish) throw new UserError("Anda tidak memiliki izin untuk mempublikasikan produk.");
    return "PUBLISHED";
  }
  if (intent === "submit") return requireApproval && !canPublish ? "PENDING" : "PUBLISHED";
  if (intent === "draft") return "DRAFT";
  return current ?? "DRAFT"; // "save" keeps current status
}

export async function saveProduct(fd: FormData): Promise<ActionResult<{ id: string }>> {
  const id = str(fd, "id");
  return staffAction(id ? "products.edit" : "products.create", async (me) => {
    const input = parseForm(fd);
    const intent = str(fd, "intent") || "save";
    const existing = id
      ? await db.product.findUnique({ where: { id }, include: { variants: { include: { _count: { select: { orderItems: true } } } } } })
      : null;
    if (id && !existing) throw new UserError("Produk tidak ditemukan.");
    const [brand, category] = await Promise.all([
      db.brand.findUnique({ where: { id: input.brandId } }),
      db.category.findUnique({ where: { id: input.categoryId } }),
    ]);
    if (!brand) throw new UserError("Brand tidak ditemukan.");
    if (!category) throw new UserError("Kategori tidak ditemukan.");

    const status = await resolveStatus(me, intent, existing?.status ?? null);
    const original = input.originalPrice || input.sellingPrice;
    const sku = (input.sku || existing?.sku || `VRD-${slugify(brand.name).slice(0, 3).toUpperCase()}-${randomToken(4).replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}`).toUpperCase();
    const skuClash = await db.product.findFirst({ where: { sku, NOT: id ? { id } : undefined } });
    if (skuClash) return { ok: false, error: `SKU ${sku} sudah dipakai produk lain.`, fieldErrors: { sku: "Sudah dipakai" } };

    // variant SKUs: generate when blank, must be unique
    const seen = new Set<string>();
    const variants = input.variants.map((v, i) => {
      const vs = (v.sku || `${sku}-${(v.color || "STD").replace(/\s+/g, "").toUpperCase()}-${(v.size || "OS").replace(/\s+/g, "").toUpperCase()}`).toUpperCase();
      const unique = seen.has(vs) ? `${vs}-${i + 1}` : vs;
      seen.add(unique);
      return { ...v, sku: unique, colorHex: v.colorHex || null, color: v.color || null, size: v.size || null };
    });
    const clash = await db.productVariant.findFirst({ where: { sku: { in: [...seen] }, NOT: id ? { productId: id } : undefined } });
    if (clash) return { ok: false, error: `SKU varian ${clash.sku} sudah dipakai produk lain.` };

    const baseData = {
      name: input.name,
      brandId: brand.id,
      categoryId: category.id,
      description: input.description,
      originalPrice: original,
      sellingPrice: input.sellingPrice,
      discountPct: discountPercent(original, input.sellingPrice),
      sku,
      gender: input.gender,
      condition: input.condition,
      material: input.material ?? null,
      illustration: input.illustration,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      attributes: JSON.stringify(input.attributes),
      isFeatured: bool(fd, "isFeatured"),
      isNewArrival: bool(fd, "isNewArrival"),
      isBestSeller: bool(fd, "isBestSeller"),
      status,
      updatedById: me.id,
      ...(status === "PUBLISHED" && existing?.status !== "PUBLISHED" ? { publishedAt: new Date() } : {}),
      ...(status !== existing?.status && ["PENDING", "PUBLISHED"].includes(status) ? { reviewOutcome: null, reviewNote: null } : {}),
    };

    const newFiles = filesFrom(fd, "images").slice(0, 12);
    const uploaded: string[] = [];
    for (const f of newFiles) uploaded.push(await saveImage(f, "product"));

    const stockLogs: string[] = [];
    const productId = await db.$transaction(async (tx) => {
      const p = existing
        ? await tx.product.update({ where: { id: existing.id }, data: baseData })
        : await tx.product.create({ data: { ...baseData, slug: await uniqueSlug(`${brand.name} ${input.name}`), createdById: me.id } });

      // variants: update / create / delete-or-deactivate
      const keepIds = new Set(variants.filter((v) => v.id).map((v) => v.id!));
      for (const old of existing?.variants ?? []) {
        if (keepIds.has(old.id)) continue;
        if (old._count.orderItems > 0) await tx.productVariant.update({ where: { id: old.id }, data: { isActive: false } });
        else await tx.productVariant.delete({ where: { id: old.id } });
      }
      for (const v of variants) {
        const old = v.id ? existing?.variants.find((x) => x.id === v.id) : undefined;
        if (old) {
          await tx.productVariant.update({
            where: { id: old.id },
            data: { sku: v.sku, color: v.color, colorHex: v.colorHex, size: v.size, stock: v.stock, isActive: v.isActive },
          });
          if (old.stock !== v.stock) {
            await tx.stockMovement.create({ data: { variantId: old.id, delta: v.stock - old.stock, stockAfter: v.stock, reason: "EDIT", userId: me.id } });
            stockLogs.push(`${[v.color, v.size].filter(Boolean).join("/") || v.sku}: ${old.stock} → ${v.stock}`);
          }
        } else {
          const nv = await tx.productVariant.create({
            data: { productId: p.id, sku: v.sku, color: v.color, colorHex: v.colorHex, size: v.size, stock: v.stock, isActive: v.isActive },
          });
          await tx.stockMovement.create({ data: { variantId: nv.id, delta: v.stock, stockAfter: v.stock, reason: "INITIAL", userId: me.id } });
        }
      }

      // images
      const remove = fd.getAll("removeImage").map(String);
      if (remove.length) await tx.productImage.deleteMany({ where: { productId: p.id, id: { in: remove } } });
      const count = await tx.productImage.count({ where: { productId: p.id } });
      for (const [i, url] of uploaded.entries())
        await tx.productImage.create({ data: { productId: p.id, url, alt: input.name, sortOrder: count + i + 1 } });
      const primary = str(fd, "primaryImage");
      if (primary) {
        const imgs = await tx.productImage.findMany({ where: { productId: p.id }, orderBy: { sortOrder: "asc" } });
        const ordered = [...imgs.filter((x) => x.id === primary), ...imgs.filter((x) => x.id !== primary)];
        for (const [i, img] of ordered.entries()) await tx.productImage.update({ where: { id: img.id }, data: { sortOrder: i } });
      }
      return p.id;
    });

    // Activity trail
    if (!existing) {
      await logActivity(me.id, "product.create", "product", productId, `${me.name} menambahkan produk ${input.name} (${PRODUCT_STATUS_LABEL[status]})`, {
        price: input.sellingPrice,
        variants: variants.length,
      });
    } else {
      const changed: string[] = [];
      if (existing.name !== input.name) changed.push("nama");
      if (existing.description !== input.description) changed.push("deskripsi");
      if (existing.categoryId !== input.categoryId) changed.push("kategori");
      if (existing.brandId !== input.brandId) changed.push("brand");
      if (uploaded.length || fd.getAll("removeImage").length) changed.push("foto");
      await logActivity(me.id, "product.update", "product", productId, `${me.name} mengedit ${input.name}${changed.length ? ` (${changed.join(", ")})` : ""}`);
      if (existing.sellingPrice !== input.sellingPrice || existing.originalPrice !== original)
        await logActivity(me.id, "product.price", "product", productId, `${me.name} mengubah harga ${input.name}: ${rupiah(existing.sellingPrice)} → ${rupiah(input.sellingPrice)}`, {
          from: { selling: existing.sellingPrice, original: existing.originalPrice },
          to: { selling: input.sellingPrice, original },
        });
      if (stockLogs.length)
        await logActivity(me.id, "stock.update", "product", productId, `${me.name} mengubah stok ${input.name}: ${stockLogs.slice(0, 4).join("; ")}${stockLogs.length > 4 ? "…" : ""}`);
      if (existing.status !== status)
        await logActivity(me.id, "product.status", "product", productId, `${me.name} mengubah status ${input.name}: ${PRODUCT_STATUS_LABEL[existing.status]} → ${PRODUCT_STATUS_LABEL[status]}`);
    }

    const msg =
      status === "PENDING"
        ? "Produk disimpan & diajukan untuk approval Owner."
        : status === "PUBLISHED"
          ? "Produk dipublikasikan dan tampil di toko."
          : "Produk disimpan.";
    return { ok: true, message: msg, data: { id: productId }, redirect: existing ? undefined : `/admin/products/${productId}` };
  });
}

/** Approval workflow transitions. */
export async function reviewProduct(fd: FormData): Promise<ActionResult> {
  const action = str(fd, "action") as "submit" | "approve" | "publish" | "reject" | "revision" | "archive" | "unarchive";
  const perm = action === "submit" ? "products.edit" : "products.publish";
  return staffAction(perm, async (me) => {
    const p = await db.product.findUnique({ where: { id: str(fd, "id") } });
    if (!p) throw new UserError("Produk tidak ditemukan.");
    const note = str(fd, "note").slice(0, 1000) || null;
    let data: { status: string; reviewOutcome?: string | null; reviewNote?: string | null; publishedAt?: Date };
    switch (action) {
      case "submit": {
        const s = await getSettings();
        const direct = s["products.requireApproval"] !== "true" || can(me, "products.publish");
        data = direct ? { status: "PUBLISHED", publishedAt: p.publishedAt ?? new Date(), reviewOutcome: null, reviewNote: null } : { status: "PENDING", reviewOutcome: null };
        break;
      }
      case "approve":
        data = { status: "APPROVED", reviewOutcome: null, reviewNote: note };
        break;
      case "publish":
        data = { status: "PUBLISHED", publishedAt: p.publishedAt ?? new Date(), reviewOutcome: null, reviewNote: note };
        break;
      case "reject":
        if (!note) return { ok: false, error: "Tulis alasan penolakan.", fieldErrors: { note: "Wajib diisi" } };
        data = { status: "DRAFT", reviewOutcome: "REJECTED", reviewNote: note };
        break;
      case "revision":
        if (!note) return { ok: false, error: "Tulis catatan revisi untuk staff.", fieldErrors: { note: "Wajib diisi" } };
        data = { status: "DRAFT", reviewOutcome: "REVISION", reviewNote: note };
        break;
      case "archive":
        data = { status: "ARCHIVED" };
        break;
      case "unarchive":
        data = { status: "DRAFT" };
        break;
      default:
        throw new UserError("Aksi tidak dikenal.");
    }
    await db.product.update({ where: { id: p.id }, data: { ...data, updatedById: me.id } });
    const labels: Record<string, string> = {
      submit: "mengajukan",
      approve: "menyetujui",
      publish: "mempublikasikan",
      reject: "menolak",
      revision: "meminta revisi",
      archive: "mengarsipkan",
      unarchive: "mengembalikan dari arsip",
    };
    await logActivity(me.id, `product.${action}`, "product", p.id, `${me.name} ${labels[action]} produk ${p.name}${note ? ` — “${note}”` : ""}`);
    return { ok: true, message: `Status produk: ${PRODUCT_STATUS_LABEL[data.status]}.` };
  });
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  return staffAction("products.delete", async (me) => {
    const p = await db.product.findUnique({ where: { id }, include: { _count: { select: { orderItems: true } } } });
    if (!p) throw new UserError("Produk tidak ditemukan.");
    if (p._count.orderItems > 0) {
      // keep order history consistent — archive instead of deleting
      await db.product.update({ where: { id }, data: { status: "ARCHIVED", updatedById: me.id } });
      await logActivity(me.id, "product.archive", "product", id, `${me.name} mengarsipkan ${p.name} (memiliki riwayat pesanan)`);
      return { ok: true, message: "Produk memiliki riwayat pesanan sehingga diarsipkan, bukan dihapus.", redirect: "/admin/products" };
    }
    await db.product.delete({ where: { id } });
    await logActivity(me.id, "product.delete", "product", id, `${me.name} menghapus produk ${p.name}`);
    return { ok: true, message: "Produk dihapus.", redirect: "/admin/products" };
  });
}

export async function bulkProductStatus(fd: FormData): Promise<ActionResult> {
  return staffAction("products.publish", async (me) => {
    const ids = fd.getAll("ids").map(String).slice(0, 200);
    const status = str(fd, "status");
    if (!["PUBLISHED", "ARCHIVED", "DRAFT"].includes(status)) throw new UserError("Status tidak valid.");
    if (!ids.length) throw new UserError("Pilih minimal satu produk.");
    await db.product.updateMany({ where: { id: { in: ids } }, data: { status, updatedById: me.id } });
    await logActivity(me.id, "product.bulk", "product", null, `${me.name} mengubah status ${ids.length} produk → ${PRODUCT_STATUS_LABEL[status]}`);
    return { ok: true, message: `${ids.length} produk diperbarui.` };
  });
}
