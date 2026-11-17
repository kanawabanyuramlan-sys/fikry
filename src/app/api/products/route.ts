import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cardSelect, PUBLISHED } from "@/lib/catalog";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (slug) {
    const p = await db.product.findFirst({
      where: { AND: [PUBLISHED, { slug }] },
      select: {
        ...cardSelect,
        description: true,
        category: { select: { name: true } },
        images: { select: { url: true, alt: true, isSample: true }, orderBy: { sortOrder: "asc" } },
      },
    });
    if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(p);
  }
  const ids = (url.searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 100);
  if (!ids.length) return NextResponse.json([]);
  const items = await db.product.findMany({ where: { AND: [PUBLISHED, { id: { in: ids } }] }, select: cardSelect });
  return NextResponse.json(items);
}
