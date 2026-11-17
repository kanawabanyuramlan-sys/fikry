import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { categoryOptions } from "@/lib/admin-data";
import { ILLUSTRATIONS } from "@/lib/constants";
import { parseJson } from "@/lib/format";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { ActionButton, ActionForm, Checkbox, Field, Select, SubmitButton, TextArea } from "@/components/forms";
import { deleteCategory, saveCategory } from "@/app/admin/actions/ops";
import { ProductIllustration } from "@/components/illustration";

export const metadata: Metadata = { title: "Categories" };

type Cat = Awaited<ReturnType<typeof load>>[number];
const load = () =>
  db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } });

function CategoryForm({ c, parents }: { c?: Cat; parents: { value: string; label: string }[] }) {
  return (
    <ActionForm action={saveCategory} reset={!c} className="grid gap-3 sm:grid-cols-2">
      {c && <input type="hidden" name="id" value={c.id} />}
      <Field label="Nama" name="name" defaultValue={c?.name} required />
      <Select label="Induk (kosong = kategori utama)" name="parentId" defaultValue={c?.parentId ?? ""} placeholder="— Kategori utama —" options={parents.filter((p) => p.value !== c?.id)} />
      <Field label="Slug URL" name="slug" defaultValue={c?.slug} placeholder="otomatis" />
      <Field label="Urutan" name="sortOrder" type="number" defaultValue={String(c?.sortOrder ?? 0)} />
      <Select label="Ilustrasi" name="illustration" defaultValue={c?.illustration ?? ""} placeholder="—" options={ILLUSTRATIONS.map((i) => ({ value: i, label: i }))} />
      <Field label="Template atribut (pisahkan koma)" name="attributeTemplate" defaultValue={parseJson<string[]>(c?.attributeTemplate, []).join(", ")} placeholder="Size, Color, Material" />
      <TextArea label="Deskripsi" name="description" defaultValue={c?.description ?? ""} className="sm:col-span-2" />
      <label className="block sm:col-span-2">
        <span className="label">Gambar kategori (opsional)</span>
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="input" />
      </label>
      <div className="grid gap-2 sm:col-span-2 sm:grid-cols-3">
        <Checkbox label="Aktif" name="isActive" defaultChecked={c?.isActive ?? true} />
        <Checkbox label="Tampil di menu" name="showInMenu" defaultChecked={c?.showInMenu ?? true} />
        <Checkbox label="Featured di homepage" name="isFeatured" defaultChecked={c?.isFeatured ?? false} />
      </div>
      {c?.image && <Checkbox label="Hapus gambar saat ini" name="removeImage" />}
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton>{c ? "Simpan" : "Tambah kategori"}</SubmitButton>
      </div>
    </ActionForm>
  );
}

export default async function CategoriesPage() {
  await requireStaffPage("catalog.manage");
  const [rows, opts] = await Promise.all([load(), categoryOptions()]);
  const parents = opts.map((o) => ({ value: o.id, label: o.label }));
  const children = (pid: string | null) => rows.filter((r) => r.parentId === pid);
  const Node = ({ c, depth }: { c: Cat; depth: number }) => (
    <li>
      <details className="group rounded-xl border border-ink/[.07] bg-card">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-3" style={{ paddingLeft: 12 + depth * 20 }}>
          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-brand-off">
            <ProductIllustration type={c.illustration} color="#78B82A" plain className="h-full w-full" />
          </span>
          <span className="font-semibold">{c.name}</span>
          <span className="font-mono text-xs text-ink-soft">/c/{c.slug}</span>
          <span className="text-xs text-ink-soft">{c._count.products} produk</span>
          {!c.isActive && <Badge tone="red">Nonaktif</Badge>}
          {c.isFeatured && <Badge tone="green">Featured</Badge>}
          {!c.showInMenu && <Badge>Tersembunyi di menu</Badge>}
          <span className="ml-auto text-xs font-semibold text-brand-dark">Edit</span>
        </summary>
        <div className="space-y-3 border-t border-ink/[.07] p-4">
          <CategoryForm c={c} parents={parents} />
          <ActionButton action={deleteCategory.bind(null, c.id)} confirm={`Hapus kategori ${c.name}?`} className="btn-ghost btn-sm text-sale">
            Hapus kategori
          </ActionButton>
        </div>
      </details>
      {children(c.id).length > 0 && (
        <ul className="mt-2 space-y-2" style={{ marginLeft: 20 }}>
          {children(c.id).map((k) => (
            <Node key={k.id} c={k} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
  return (
    <>
      <PageHeader title="Categories" description="Kategori & subkategori dinamis — tambah sebanyak yang diperlukan tanpa mengubah kode. Navbar & mega menu mengikuti otomatis." />
      <Panel title="Tambah kategori" className="mb-6">
        <CategoryForm parents={parents} />
      </Panel>
      <ul className="space-y-2">
        {children(null).map((c) => (
          <Node key={c.id} c={c} depth={0} />
        ))}
      </ul>
    </>
  );
}
