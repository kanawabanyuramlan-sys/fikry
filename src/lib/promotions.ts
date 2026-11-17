import { cache } from "react";
import { db } from "./db";

/** Promotions are scheduled: only active ones inside their start/end window are returned. */
export const getActivePromotions = cache(async () => {
  const now = new Date();
  const rows = await db.promotion.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const byType = (t: string) => rows.filter((r) => r.type === t);
  return {
    announcements: byType("ANNOUNCEMENT"),
    heroes: byType("HERO"),
    banners: rows.filter((r) => ["BANNER", "FLASH_SALE", "SEASONAL", "NEW_COLLECTION"].includes(r.type)),
    popup: byType("POPUP")[0] ?? null,
  };
});

export type PromotionRow = Awaited<ReturnType<typeof getActivePromotions>>["heroes"][number];
