import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";

export async function GET() {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ loggedIn: false, ids: [] });
  const rows = await db.wishlistItem.findMany({ where: { customerId: c.id }, select: { productId: true } });
  return NextResponse.json({ loggedIn: true, ids: rows.map((r) => r.productId) });
}

const Body = z.union([
  z.object({ productId: z.string().min(1).max(40), on: z.boolean() }),
  z.object({ merge: z.array(z.string().min(1).max(40)).max(200) }),
]);

export async function POST(req: Request) {
  const c = await getCustomer();
  if (!c) return NextResponse.json({ error: "Login diperlukan" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const body = parsed.data;
  const ids = "merge" in body ? body.merge : body.on ? [body.productId] : [];
  if ("productId" in body && !body.on) {
    await db.wishlistItem.deleteMany({ where: { customerId: c.id, productId: body.productId } });
  }
  if (ids.length) {
    const existing = await db.product.findMany({ where: { id: { in: ids } }, select: { id: true } });
    for (const p of existing) {
      await db.wishlistItem.upsert({
        where: { customerId_productId: { customerId: c.id, productId: p.id } },
        update: {},
        create: { customerId: c.id, productId: p.id },
      });
    }
  }
  const rows = await db.wishlistItem.findMany({ where: { customerId: c.id }, select: { productId: true } });
  return NextResponse.json({ ids: rows.map((r) => r.productId) });
}
