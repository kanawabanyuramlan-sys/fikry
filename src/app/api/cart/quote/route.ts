import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteCart } from "@/lib/pricing";

const Body = z.object({
  lines: z.array(z.object({ variantId: z.string().max(40), quantity: z.number().int().min(1).max(99) })).max(50),
  coupon: z.string().max(40).optional().nullable(),
  province: z.string().max(60).optional().nullable(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  const q = await quoteCart(parsed.data.lines, parsed.data.coupon, parsed.data.province);
  return NextResponse.json(q);
}
