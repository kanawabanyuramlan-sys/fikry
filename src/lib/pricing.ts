import { db } from "./db";
import { JAVA_BALI } from "./constants";
import { getSettings, settingInt } from "./settings";

export type CartLineInput = { variantId: string; quantity: number };

export type QuoteLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  illustration: string | null;
  image: string | null;
  price: number;
  originalPrice: number;
  quantity: number;
  requested: number;
  stock: number;
  lineTotal: number;
  issue: string | null;
};

export type Quote = {
  lines: QuoteLine[];
  missing: string[];
  subtotal: number;
  discount: number;
  coupon: { code: string; description: string | null } | null;
  couponError: string | null;
  shippingCost: number | null;
  freeShippingThreshold: number;
  total: number;
  itemCount: number;
};

/**
 * Server-side source of truth for prices, stock, coupons and shipping.
 * The browser cart only stores variant ids + quantities; everything else is recomputed here.
 */
export async function quoteCart(input: CartLineInput[], couponCode?: string | null, province?: string | null): Promise<Quote> {
  const clean = new Map<string, number>();
  for (const l of input.slice(0, 50)) {
    if (typeof l?.variantId !== "string") continue;
    const q = Math.max(1, Math.min(99, Math.floor(Number(l.quantity) || 1)));
    clean.set(l.variantId, (clean.get(l.variantId) ?? 0) + q);
  }
  const variants = await db.productVariant.findMany({
    where: { id: { in: [...clean.keys()] } },
    include: {
      product: {
        select: {
          id: true, slug: true, name: true, status: true, sellingPrice: true, originalPrice: true, illustration: true,
          brand: { select: { name: true, isActive: true } },
          images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const lines: QuoteLine[] = [];
  const missing: string[] = [];
  for (const [variantId, requested] of clean) {
    const v = byId.get(variantId);
    if (!v || v.product.status !== "PUBLISHED" || !v.isActive || !v.product.brand.isActive) {
      missing.push(variantId);
      continue;
    }
    const quantity = Math.min(requested, Math.max(0, v.stock));
    const issue =
      v.stock <= 0 ? "Stok habis" : quantity < requested ? `Stok tersisa ${v.stock}, jumlah disesuaikan` : null;
    lines.push({
      variantId,
      productId: v.product.id,
      slug: v.product.slug,
      name: v.product.name,
      brand: v.product.brand.name,
      sku: v.sku,
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      illustration: v.product.illustration,
      image: v.product.images[0]?.url ?? null,
      price: v.product.sellingPrice,
      originalPrice: v.product.originalPrice,
      quantity,
      requested,
      stock: v.stock,
      lineTotal: quantity * v.product.sellingPrice,
      issue,
    });
  }
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);

  let discount = 0;
  let coupon: Quote["coupon"] = null;
  let couponError: string | null = null;
  if (couponCode) {
    const c = await db.coupon.findUnique({ where: { code: couponCode.trim().toUpperCase() } });
    const now = new Date();
    if (!c || !c.isActive) couponError = "Kode voucher tidak ditemukan.";
    else if (c.startsAt && c.startsAt > now) couponError = "Voucher belum berlaku.";
    else if (c.endsAt && c.endsAt < now) couponError = "Voucher sudah berakhir.";
    else if (c.maxUses !== null && c.usedCount >= c.maxUses) couponError = "Kuota voucher sudah habis.";
    else if (subtotal < c.minSpend) couponError = `Minimal belanja Rp${c.minSpend.toLocaleString("id-ID")} untuk voucher ini.`;
    else {
      discount = c.type === "PERCENT" ? Math.floor((subtotal * c.value) / 100) : c.value;
      if (c.maxDiscount) discount = Math.min(discount, c.maxDiscount);
      discount = Math.min(discount, subtotal);
      coupon = { code: c.code, description: c.description };
    }
  }

  const s = await getSettings();
  const freeShippingThreshold = settingInt(s, "shipping.freeThreshold");
  let shippingCost: number | null = null;
  if (province) {
    const after = subtotal - discount;
    if (freeShippingThreshold > 0 && after >= freeShippingThreshold) shippingCost = 0;
    else shippingCost = JAVA_BALI.includes(province) ? settingInt(s, "shipping.flatJavaBali") : settingInt(s, "shipping.flatOther");
  }
  return {
    lines,
    missing,
    subtotal,
    discount,
    coupon,
    couponError,
    shippingCost,
    freeShippingThreshold,
    total: subtotal - discount + (shippingCost ?? 0),
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
  };
}
