import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { fmtDateTime, initials } from "@/lib/format";
import { Badge, Empty, PageHeader, Pager, Panel, qs } from "@/components/admin/ui";

export const metadata: Metadata = { title: "Activity Logs" };
const PER = 50;

const TYPES: [string, string][] = [
  ["product", "Produk & approval"],
  ["product.price", "Perubahan harga"],
  ["stock", "Perubahan stok"],
  ["order", "Pesanan & pengiriman"],
  ["team", "Tim & akses"],
  ["promotion", "Promosi"],
  ["settings", "Pengaturan"],
];

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaffPage("activity.view");
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const and: Prisma.ActivityLogWhereInput[] = [];
  if (sp.user) and.push({ userId: sp.user });
  if (sp.type) and.push({ action: { startsWith: sp.type } });
  const where = { AND: and };
  const [logs, total, users] = await Promise.all([
    db.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER, take: PER, include: { user: { select: { name: true } } } }),
    db.activityLog.count({ where }),
    db.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, status: true } }),
  ]);
  const href = (o: Record<string, string | undefined>) => qs("/admin/activity", { user: sp.user, type: sp.type, ...o });
  return (
    <>
      <PageHeader title="Activity Logs" description="Siapa menambah/mengedit produk, mengubah harga & stok, mengelola pesanan dan pengiriman — beserta waktunya." />
      <form action="/admin/activity" className="mb-4 flex flex-wrap gap-2">
        <select name="user" defaultValue={sp.user ?? ""} className="input w-auto" aria-label="Anggota">
          <option value="">Semua anggota</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.status === "REMOVED" ? " (dihapus)" : ""}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={sp.type ?? ""} className="input w-auto" aria-label="Jenis">
          <option value="">Semua aktivitas</option>
          {TYPES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button className="btn btn-dark btn-sm">Filter</button>
        {(sp.user || sp.type) && (
          <Link href="/admin/activity" className="btn btn-ghost btn-sm">
            Reset
          </Link>
        )}
      </form>
      <Panel pad={false}>
        {logs.length ? (
          <ul className="divide-y divide-ink/[.07]">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 px-5 py-3.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-light text-[11px] font-bold text-brand-dark">{initials(l.user?.name ?? "S")}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{l.summary}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <Badge>{l.action}</Badge> {fmtDateTime(l.createdAt)}
                    {l.entityType === "product" && l.entityId && (
                      <Link href={`/admin/products/${l.entityId}`} className="underline">
                        buka produk
                      </Link>
                    )}
                    {l.entityType === "order" && l.entityId && (
                      <Link href={`/admin/orders/${l.entityId}`} className="underline">
                        buka pesanan
                      </Link>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty title="Belum ada aktivitas" />
        )}
        <Pager page={page} pages={Math.ceil(total / PER)} href={(n) => href({ page: String(n) })} />
      </Panel>
    </>
  );
}
