import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "@/components/icons";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { fmtDateTime } from "@/lib/format";
import { Badge, Empty, PageHeader, Panel } from "@/components/admin/ui";
import { ActionButton } from "@/components/forms";
import { setReviewStatus } from "@/app/admin/actions/ops";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaffPage("reviews.manage");
  const { status = "PENDING" } = await searchParams;
  const reviews = await db.review.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { product: { select: { id: true, name: true, slug: true } }, customer: { select: { name: true, email: true } } },
  });
  return (
    <>
      <PageHeader title="Customer Reviews" description="Ulasan tampil di halaman produk setelah disetujui." />
      <div className="mb-4 flex gap-2">
        {[
          ["PENDING", "Menunggu"],
          ["APPROVED", "Tampil"],
          ["HIDDEN", "Disembunyikan"],
          ["ALL", "Semua"],
        ].map(([v, l]) => (
          <Link key={v} href={`/admin/reviews?status=${v}`} className={`chip ${status === v ? "chip-active" : ""}`}>
            {l}
          </Link>
        ))}
      </div>
      <Panel pad={false}>
        {reviews.length ? (
          <ul className="divide-y divide-ink/[.07]">
            {reviews.map((r) => (
              <li key={r.id} className="flex flex-wrap gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={n <= r.rating ? "h-4 w-4 fill-warn text-warn" : "h-4 w-4 text-ink/15"} />
                      ))}
                    </span>
                    <Link href={`/admin/products/${r.product.id}`} className="text-sm font-semibold hover:underline">
                      {r.product.name}
                    </Link>
                    <Badge tone={r.status === "APPROVED" ? "solid" : r.status === "HIDDEN" ? "gray" : "amber"}>{r.status}</Badge>
                  </div>
                  {r.title && <p className="mt-2 font-semibold">{r.title}</p>}
                  <p className="mt-1 text-sm text-ink/80">{r.body}</p>
                  <p className="mt-2 text-xs text-ink-soft">
                    {r.customer.name} · {r.customer.email} · {fmtDateTime(r.createdAt)}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  {r.status !== "APPROVED" && (
                    <ActionButton action={setReviewStatus.bind(null, r.id, "APPROVED")} className="btn-primary btn-sm">
                      Approve
                    </ActionButton>
                  )}
                  {r.status !== "HIDDEN" && (
                    <ActionButton action={setReviewStatus.bind(null, r.id, "HIDDEN")} className="btn-outline btn-sm">
                      Hide
                    </ActionButton>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Tidak ada ulasan" />
        )}
      </Panel>
    </>
  );
}
