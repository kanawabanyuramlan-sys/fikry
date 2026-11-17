import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "@/components/icons";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { PROMOTION_TYPES } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { Badge, Empty, PageHeader, Panel } from "@/components/admin/ui";
import { ActionButton } from "@/components/forms";
import { togglePromotion } from "@/app/admin/actions/ops";
import { ProductIllustration } from "@/components/illustration";

export const metadata: Metadata = { title: "Promotions" };

export default async function PromotionsPage() {
  await requireStaffPage("promotions.manage");
  const promos = await db.promotion.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }] });
  const now = new Date();
  const state = (p: (typeof promos)[number]) =>
    !p.isActive ? ["Nonaktif", "gray"] : p.startsAt && p.startsAt > now ? ["Terjadwal", "blue"] : p.endsAt && p.endsAt < now ? ["Berakhir", "red"] : ["Tayang", "solid"];
  const groups = Object.keys(PROMOTION_TYPES).filter((t) => promos.some((p) => p.type === t));
  return (
    <>
      <PageHeader
        title="Promotions & Advertisement"
        description="Announcement bar, hero banner, banner promo, flash sale, kampanye musiman dan popup. Tayang otomatis sesuai tanggal mulai & berakhir."
        actions={
          <Link href="/admin/promotions/new" className="btn btn-primary">
            <Plus className="h-4 w-4" /> Add Advertisement
          </Link>
        }
      />
      {!promos.length && (
        <Panel>
          <Empty title="Belum ada promosi" action={<Link href="/admin/promotions/new" className="btn btn-primary btn-sm">Buat promosi</Link>} />
        </Panel>
      )}
      <div className="space-y-6">
        {groups.map((g) => (
          <Panel key={g} title={PROMOTION_TYPES[g]} pad={false}>
            <ul className="divide-y divide-ink/[.07]">
              {promos
                .filter((p) => p.type === g)
                .map((p) => {
                  const [label, tone] = state(p);
                  return (
                    <li key={p.id} className="flex flex-wrap items-center gap-4 p-4">
                      <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-brand-light">
                        {p.image ? (
                          <Image src={p.image} alt="" fill sizes="80px" className="object-cover" />
                        ) : p.illustration ? (
                          <ProductIllustration type={p.illustration} plain className="h-full w-full" />
                        ) : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{p.title}</p>
                        <p className="text-xs text-ink-soft">
                          {p.url ?? "tanpa tautan"} · {p.startsAt ? fmtDateTime(p.startsAt) : "segera"} → {p.endsAt ? fmtDateTime(p.endsAt) : "tanpa batas"}
                        </p>
                      </div>
                      <Badge tone={tone as "gray"}>{label}</Badge>
                      <ActionButton action={togglePromotion.bind(null, p.id)} className="btn-outline btn-sm">
                        {p.isActive ? "Deactivate" : "Activate"}
                      </ActionButton>
                      <Link href={`/admin/promotions/${p.id}`} className="btn btn-ghost btn-sm">
                        Edit
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}
