import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MessageSquareWarning } from "@/components/icons";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { categoryOptions } from "@/lib/admin-data";
import { fmtDateTime, parseJson, timeAgo } from "@/lib/format";
import { PageHeader, Panel, ProductStatusBadge } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor";
import { ActionButton, ActionForm, SubmitButton } from "@/components/forms";
import { deleteProduct, reviewProduct } from "@/app/admin/actions/products";

export const metadata: Metadata = { title: "Edit Product" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaffPage("products.view");
  const { id } = await params;
  const p = await db.product.findUnique({
    where: { id },
    include: {
      variants: { orderBy: { createdAt: "asc" } },
      images: { orderBy: { sortOrder: "asc" } },
      createdBy: { select: { name: true } },
      updatedBy: { select: { name: true } },
    },
  });
  if (!p) notFound();
  const [brands, cats, s, history] = await Promise.all([
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    categoryOptions(),
    getSettings(),
    db.activityLog.findMany({ where: { entityType: "product", entityId: p.id }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  const canEdit = can(me, "products.edit");
  const canPublish = can(me, "products.publish");

  return (
    <>
      <PageHeader
        title={p.name}
        back={{ href: "/admin/products", label: "Products" }}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ProductStatusBadge status={p.status} outcome={p.reviewOutcome} /> Dibuat oleh {p.createdBy?.name ?? "—"} · terakhir diubah {p.updatedBy?.name ?? "—"} {timeAgo(p.updatedAt)}
          </span>
        }
        actions={
          <>
            <Link href={`/p/${p.slug}`} target="_blank" className="btn btn-outline btn-sm">
              <ExternalLink className="h-4 w-4" /> {p.status === "PUBLISHED" ? "Lihat di toko" : "Pratinjau"}
            </Link>
            {can(me, "products.delete") && (
              <ActionButton action={deleteProduct.bind(null, p.id)} confirm={`Hapus ${p.name}? Produk dengan riwayat pesanan akan diarsipkan.`} className="btn-danger btn-sm">
                Hapus
              </ActionButton>
            )}
          </>
        }
      />

      {p.reviewNote && p.reviewOutcome && (
        <div className="mb-5 flex gap-3 rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm">
          <MessageSquareWarning className="h-5 w-5 shrink-0 text-warn" />
          <div>
            <p className="font-bold">{p.reviewOutcome === "REJECTED" ? "Produk ditolak" : "Revisi diminta"}</p>
            <p className="mt-0.5">{p.reviewNote}</p>
            <p className="mt-1 text-xs text-ink-soft">Perbaiki lalu ajukan kembali.</p>
          </div>
        </div>
      )}

      {(canPublish || (canEdit && p.status === "DRAFT")) && (
        <Panel className="mb-6" title="Approval & status" description="Draft → Pending Approval → Approved → Published → Archived">
          <ActionForm action={reviewProduct} reset className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <input type="hidden" name="id" value={p.id} />
            {canPublish && (
              <label className="block flex-1">
                <span className="label">Catatan untuk staff (wajib untuk Reject / Request Revision)</span>
                <input name="note" className="input" placeholder="Contoh: foto kurang jelas, tambah ukuran 44" />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              {!canPublish && p.status === "DRAFT" && (
                <SubmitButton name="action" value="submit" className="btn-primary btn-sm">
                  Submit for Approval
                </SubmitButton>
              )}
              {canPublish && p.status === "PENDING" && (
                <SubmitButton name="action" value="approve" className="btn-outline btn-sm">
                  Approve
                </SubmitButton>
              )}
              {canPublish && p.status !== "PUBLISHED" && (
                <SubmitButton name="action" value="publish" className="btn-primary btn-sm">
                  Publish
                </SubmitButton>
              )}
              {canPublish && ["PENDING", "APPROVED"].includes(p.status) && (
                <>
                  <SubmitButton name="action" value="revision" className="btn-outline btn-sm">
                    Request Revision
                  </SubmitButton>
                  <SubmitButton name="action" value="reject" className="btn-danger btn-sm">
                    Reject
                  </SubmitButton>
                </>
              )}
              {canPublish && p.status !== "ARCHIVED" && (
                <SubmitButton name="action" value="archive" className="btn-ghost btn-sm">
                  Archive
                </SubmitButton>
              )}
              {canPublish && p.status === "ARCHIVED" && (
                <SubmitButton name="action" value="unarchive" className="btn-outline btn-sm">
                  Kembalikan ke Draft
                </SubmitButton>
              )}
            </div>
          </ActionForm>
        </Panel>
      )}

      {canEdit ? (
        <ProductEditor
          key={p.updatedAt.toISOString()}
          product={{
            id: p.id,
            name: p.name,
            brandId: p.brandId,
            categoryId: p.categoryId,
            description: p.description,
            originalPrice: p.originalPrice,
            sellingPrice: p.sellingPrice,
            sku: p.sku,
            gender: p.gender,
            condition: p.condition,
            material: p.material,
            illustration: p.illustration,
            seoTitle: p.seoTitle,
            seoDescription: p.seoDescription,
            isFeatured: p.isFeatured,
            isNewArrival: p.isNewArrival,
            isBestSeller: p.isBestSeller,
            status: p.status,
            attributes: parseJson(p.attributes, []),
            variants: p.variants,
            images: p.images.map((i) => ({ id: i.id, url: i.url })),
          }}
          brands={brands}
          categories={cats}
          canPublish={canPublish}
          requireApproval={s["products.requireApproval"] === "true"}
        />
      ) : (
        <p className="rounded-2xl bg-card p-6 text-sm text-ink-soft">Anda hanya memiliki akses lihat untuk produk ini.</p>
      )}

      <Panel className="mt-6" title="Riwayat perubahan produk">
        {history.length ? (
          <ul className="space-y-2 text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 border-b border-ink/[.06] pb-2">
                <span>{h.summary}</span>
                <span className="text-xs text-ink-soft">{fmtDateTime(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-soft">Belum ada riwayat.</p>
        )}
      </Panel>
    </>
  );
}
