/* Attach the licensed sample photos to the demo catalogue (idempotent).
 * Run: npx tsx prisma/apply-sample-photos.ts
 * Products that already have a real (non-sample) photo are left untouched. */
import { PrismaClient } from "@prisma/client";
import { CATEGORY_PHOTOS, PRODUCT_PHOTOS, PROMO_UPDATES } from "./sample-photos";

try {
  process.loadEnvFile(".env");
} catch {}

export async function applySamplePhotos(db: PrismaClient) {
  let products = 0;
  for (const [name, url] of Object.entries(PRODUCT_PHOTOS)) {
    const p = await db.product.findFirst({ where: { name }, include: { images: true } });
    if (!p) continue;
    if (p.images.some((i) => !i.isSample)) continue; // the store already has its own photo
    await db.productImage.deleteMany({ where: { productId: p.id, isSample: true } });
    await db.productImage.create({ data: { productId: p.id, url, alt: `${p.name} — foto contoh`, sortOrder: 0, isSample: true } });
    products++;
  }
  for (const [slug, image] of Object.entries(CATEGORY_PHOTOS)) {
    await db.category.updateMany({ where: { slug, OR: [{ image: null }, { image: { startsWith: "/samples/" } }] }, data: { image } });
  }
  for (const u of PROMO_UPDATES) {
    await db.promotion.updateMany({
      where: { OR: [{ title: u.match }, ...(u.title ? [{ title: u.title }] : [])] },
      data: { image: u.image, ...(u.title ? { title: u.title } : {}) },
    });
  }
  return products;
}

if (require.main === module) {
  const db = new PrismaClient();
  applySamplePhotos(db)
    .then((n) => console.log(`Sample photos attached to ${n} products.`))
    .finally(() => db.$disconnect());
}
