import type { Metadata } from "next";
import Image from "next/image";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { ActionButton, ActionForm, Checkbox, Field, SubmitButton, TextArea } from "@/components/forms";
import { deleteBrand, saveBrand } from "@/app/admin/actions/ops";

export const metadata: Metadata = { title: "Brands" };

type B = { id: string; name: string; description: string | null; logo: string | null; isActive: boolean; isFeatured: boolean; sortOrder: number };

function BrandForm({ b }: { b?: B }) {
  return (
    <ActionForm action={saveBrand} reset={!b} className="grid gap-3 sm:grid-cols-2">
      {b && <input type="hidden" name="id" value={b.id} />}
      <Field label="Nama brand" name="name" defaultValue={b?.name} required />
      <Field label="Urutan" name="sortOrder" type="number" defaultValue={String(b?.sortOrder ?? 0)} />
      <TextArea label="Deskripsi" name="description" defaultValue={b?.description ?? ""} className="sm:col-span-2" />
      <label className="block sm:col-span-2">
        <span className="label">Logo (gunakan logo resmi hanya jika diizinkan)</span>
        <input type="file" name="logo" accept="image/png,image/jpeg,image/webp" className="input" />
      </label>
      <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
        <Checkbox label="Aktif" name="isActive" defaultChecked={b?.isActive ?? true} />
        <Checkbox label="Featured" name="isFeatured" defaultChecked={b?.isFeatured ?? false} />
        {b?.logo && <Checkbox label="Hapus logo" name="removeLogo" />}
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>{b ? "Simpan" : "Tambah brand"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function BrandsAdmin() {
  await requireStaffPage("catalog.manage");
  const brands = await db.brand.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageHeader title="Brands" description="Kelola brand yang dijual. Setiap brand memiliki halaman koleksi sendiri." />
      <Panel title="Tambah brand" className="mb-6">
        <BrandForm />
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
        {brands.map((b) => (
          <details key={b.id} className="card group">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <span className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-light text-sm font-extrabold text-brand-dark">
                {b.logo ? <Image src={b.logo} alt="" fill sizes="44px" className="object-contain" /> : b.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{b.name}</span>
                <span className="text-xs text-ink-soft">
                  {b._count.products} produk · /brands/{b.slug}
                </span>
              </span>
              {!b.isActive && <Badge tone="red">Nonaktif</Badge>}
              {b.isFeatured && <Badge tone="green">Featured</Badge>}
            </summary>
            <div className="space-y-3 border-t border-ink/[.07] p-4">
              <BrandForm b={b} />
              <ActionButton action={deleteBrand.bind(null, b.id)} confirm={`Hapus brand ${b.name}?`} className="btn-ghost btn-sm text-sale">
                Hapus brand
              </ActionButton>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
