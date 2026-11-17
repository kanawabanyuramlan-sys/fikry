"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wand2, Upload, Star } from "@/components/icons";
import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { saveProduct } from "@/app/admin/actions/products";
import { ProductIllustration } from "@/components/illustration";
import { COLOR_SWATCHES, CONDITIONS, GENDERS, ILLUSTRATIONS, SIZE_ORDER } from "@/lib/constants";
import { discountPercent, rupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

type Variant = { id?: string | null; sku: string; color: string; colorHex: string; size: string; stock: number; isActive: boolean; key: string };
type Attr = { name: string; value: string; key: string };
type Cat = { id: string; label: string; template: string[]; illustration: string | null };

export type EditorProduct = {
  id: string;
  name: string;
  brandId: string;
  categoryId: string;
  description: string;
  originalPrice: number;
  sellingPrice: number;
  sku: string;
  gender: string;
  condition: string;
  material: string | null;
  illustration: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  status: string;
  attributes: { name: string; value: string }[];
  variants: { id: string; sku: string; color: string | null; colorHex: string | null; size: string | null; stock: number; isActive: boolean }[];
  images: { id: string; url: string }[];
};

let k = 0;
const key = () => `k${++k}`;

export function ProductEditor({
  product,
  brands,
  categories,
  canPublish,
  requireApproval,
}: {
  product: EditorProduct | null;
  brands: { id: string; name: string }[];
  categories: Cat[];
  canPublish: boolean;
  requireApproval: boolean;
}) {
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const cat = categories.find((c) => c.id === categoryId);
  const [illustration, setIllustration] = useState(product?.illustration ?? cat?.illustration ?? "sneaker");
  const [touchedIl, setTouchedIl] = useState(!!product);
  useEffect(() => {
    if (!touchedIl && cat?.illustration) setIllustration(cat.illustration);
  }, [cat, touchedIl]);
  const [original, setOriginal] = useState(String(product?.originalPrice ?? ""));
  const [selling, setSelling] = useState(String(product?.sellingPrice ?? ""));
  const [variants, setVariants] = useState<Variant[]>(
    product?.variants.length
      ? product.variants.map((v) => ({ id: v.id, sku: v.sku, color: v.color ?? "", colorHex: v.colorHex ?? "", size: v.size ?? "", stock: v.stock, isActive: v.isActive, key: key() }))
      : [],
  );
  const [attrs, setAttrs] = useState<Attr[]>((product?.attributes ?? []).map((a) => ({ ...a, key: key() })));
  const [genColors, setGenColors] = useState("");
  const [genSizes, setGenSizes] = useState("");
  const [genStock, setGenStock] = useState("0");
  const [previews, setPreviews] = useState<string[]>([]);
  const [primary, setPrimary] = useState(product?.images[0]?.id ?? "");
  const [removed, setRemoved] = useState<string[]>([]);

  const disc = discountPercent(parseInt(original || "0", 10), parseInt(selling || "0", 10));
  const totalStock = variants.filter((v) => v.isActive).reduce((s, v) => s + (Number(v.stock) || 0), 0);
  const previewColor = variants.find((v) => v.colorHex)?.colorHex || "#78B82A";
  const missingTemplate = useMemo(() => (cat?.template ?? []).filter((t) => !attrs.some((a) => a.name.toLowerCase() === t.toLowerCase())), [cat, attrs]);

  const upd = (i: number, patch: Partial<Variant>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const generate = () => {
    const colors = genColors.split(",").map((s) => s.trim()).filter(Boolean);
    const sizes = genSizes.split(",").map((s) => s.trim()).filter(Boolean);
    const cs = colors.length ? colors : [""];
    const ss = sizes.length ? sizes : [""];
    const next = [...variants];
    for (const c of cs)
      for (const s of ss) {
        if (next.some((v) => v.color.toLowerCase() === c.toLowerCase() && v.size.toLowerCase() === s.toLowerCase())) continue;
        next.push({ sku: "", color: c, colorHex: COLOR_SWATCHES[c] ?? (c ? "#9aa09a" : ""), size: s, stock: parseInt(genStock || "0", 10) || 0, isActive: true, key: key() });
      }
    setVariants(next);
  };

  const isNew = !product;
  const status = product?.status ?? "DRAFT";

  return (
    <ActionForm action={saveProduct} className="grid gap-6 xl:grid-cols-[1fr_360px]">
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={JSON.stringify(variants.map(({ key: _k, ...v }) => v))} />
      <input type="hidden" name="attributes" value={JSON.stringify(attrs.map(({ key: _k, ...a }) => a))} />
      <input type="hidden" name="primaryImage" value={primary} />
      {removed.map((id) => (
        <input key={id} type="hidden" name="removeImage" value={id} />
      ))}

      <div className="min-w-0 space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="font-bold">Informasi produk</h2>
          <label className="block">
            <span className="label">Nama produk *</span>
            <input name="name" defaultValue={product?.name} required minLength={3} className="input" placeholder="Contoh: Court Classic Low" />
            <FieldError name="name" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Brand *</span>
              <select name="brandId" defaultValue={product?.brandId ?? ""} required className="input">
                <option value="">Pilih brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <FieldError name="brandId" />
            </label>
            <label className="block">
              <span className="label">Kategori / subkategori *</span>
              <select name="categoryId" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required className="input">
                <option value="">Pilih kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <FieldError name="categoryId" />
            </label>
          </div>
          <label className="block">
            <span className="label">Deskripsi *</span>
            <textarea name="description" defaultValue={product?.description} required minLength={20} rows={6} className="input" placeholder="Material, fitur, cara pakai, ukuran/fit…" />
            <FieldError name="description" />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="label">Gender</span>
              <select name="gender" defaultValue={product?.gender ?? "UNISEX"} className="input">
                {Object.entries(GENDERS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Kondisi</span>
              <select name="condition" defaultValue={product?.condition ?? "NEW"} className="input">
                {Object.entries(CONDITIONS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="label">Material</span>
              <input name="material" defaultValue={product?.material ?? ""} className="input" />
            </label>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-bold">Harga</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="label">Harga asli (Rp)</span>
              <input name="originalPrice" inputMode="numeric" value={original} onChange={(e) => setOriginal(e.target.value.replace(/\D/g, ""))} className="input" placeholder="Kosongkan bila tidak diskon" />
              <FieldError name="originalPrice" />
            </label>
            <label className="block">
              <span className="label">Harga jual (Rp) *</span>
              <input name="sellingPrice" inputMode="numeric" required value={selling} onChange={(e) => setSelling(e.target.value.replace(/\D/g, ""))} className="input" />
              <FieldError name="sellingPrice" />
            </label>
            <div className="rounded-xl bg-brand-off p-3 text-sm">
              <p className="label">Tampil di toko</p>
              <p className="font-bold">{rupiah(parseInt(selling || "0", 10))}</p>
              <p className="text-xs text-ink-soft">{disc > 0 ? `Diskon ${disc}% dari ${rupiah(parseInt(original, 10))}` : "Tanpa diskon"}</p>
            </div>
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold">Varian, ukuran, warna & stok *</h2>
              <p className="text-xs text-ink-soft">Pelanggan wajib memilih warna/ukuran yang diisi di sini. Total stok aktif: {totalStock}</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setVariants((v) => [...v, { sku: "", color: "", colorHex: "", size: "", stock: 0, isActive: true, key: key() }])}>
              <Plus className="h-4 w-4" /> Tambah baris
            </button>
          </div>
          <div className="grid gap-2 rounded-xl bg-brand-off p-3 sm:grid-cols-[1fr_1fr_90px_auto]">
            <input value={genColors} onChange={(e) => setGenColors(e.target.value)} className="input py-2 text-xs" placeholder="Warna: Black, White, Green" list="color-names" aria-label="Warna untuk generator" />
            <input value={genSizes} onChange={(e) => setGenSizes(e.target.value)} className="input py-2 text-xs" placeholder="Ukuran: 39, 40, 41 atau S, M, L" aria-label="Ukuran untuk generator" />
            <input value={genStock} onChange={(e) => setGenStock(e.target.value.replace(/\D/g, ""))} className="input py-2 text-xs" placeholder="Stok" aria-label="Stok awal" />
            <button type="button" onClick={generate} className="btn btn-dark btn-sm">
              <Wand2 className="h-4 w-4" /> Generate
            </button>
          </div>
          <datalist id="color-names">
            {Object.keys(COLOR_SWATCHES).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <datalist id="size-names">
            {SIZE_ORDER.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          {variants.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink-soft">Belum ada varian. Gunakan generator atau tambah baris.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-ink-soft">
                    <th className="pb-2 font-semibold">Warna</th>
                    <th className="pb-2 font-semibold">Hex</th>
                    <th className="pb-2 font-semibold">Ukuran</th>
                    <th className="pb-2 font-semibold">SKU (opsional)</th>
                    <th className="pb-2 font-semibold">Stok</th>
                    <th className="pb-2 font-semibold">Aktif</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.key} className={cn(!v.isActive && "opacity-50")}>
                      <td className="py-1 pr-2">
                        <input
                          value={v.color}
                          list="color-names"
                          onChange={(e) => upd(i, { color: e.target.value, colorHex: COLOR_SWATCHES[e.target.value] ?? v.colorHex })}
                          className="input py-2"
                          aria-label="Warna"
                        />
                      </td>
                      <td className="py-1 pr-2">
                        <input type="color" value={v.colorHex || "#cccccc"} onChange={(e) => upd(i, { colorHex: e.target.value })} className="h-9 w-12 cursor-pointer rounded-lg border border-ink/15" aria-label="Kode warna" />
                      </td>
                      <td className="py-1 pr-2">
                        <input value={v.size} list="size-names" onChange={(e) => upd(i, { size: e.target.value })} className="input w-24 py-2" aria-label="Ukuran" />
                      </td>
                      <td className="py-1 pr-2">
                        <input value={v.sku} onChange={(e) => upd(i, { sku: e.target.value.toUpperCase() })} className="input py-2 font-mono text-xs" placeholder="auto" aria-label="SKU varian" />
                      </td>
                      <td className="py-1 pr-2">
                        <input type="number" min={0} value={v.stock} onChange={(e) => upd(i, { stock: Math.max(0, parseInt(e.target.value || "0", 10)) })} className="input w-24 py-2" aria-label="Stok" />
                      </td>
                      <td className="py-1 pr-2 text-center">
                        <input type="checkbox" checked={v.isActive} onChange={(e) => upd(i, { isActive: e.target.checked })} className="h-4 w-4 accent-brand-dark" aria-label="Aktif" />
                      </td>
                      <td className="py-1">
                        <button type="button" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} aria-label="Hapus varian" className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-sale/10 hover:text-sale">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <FieldError name="variants" />
        </section>

        <section className="card space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold">Spesifikasi & atribut kustom</h2>
              <p className="text-xs text-ink-soft">Atribut fleksibel per jenis produk (mis. Dimensions, Fit Type, Capacity).</p>
            </div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAttrs((a) => [...a, { name: "", value: "", key: key() }])}>
              <Plus className="h-4 w-4" /> Atribut
            </button>
          </div>
          {missingTemplate.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-ink-soft">Saran untuk kategori ini:</span>
              {missingTemplate.map((t) => (
                <button key={t} type="button" className="chip" onClick={() => setAttrs((a) => [...a, { name: t, value: "", key: key() }])}>
                  + {t}
                </button>
              ))}
            </div>
          )}
          {attrs.map((a, i) => (
            <div key={a.key} className="grid grid-cols-[1fr_1.5fr_auto] gap-2">
              <input value={a.name} onChange={(e) => setAttrs((x) => x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)))} className="input py-2" placeholder="Nama atribut" aria-label="Nama atribut" />
              <input value={a.value} onChange={(e) => setAttrs((x) => x.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)))} className="input py-2" placeholder="Nilai" aria-label="Nilai atribut" />
              <button type="button" onClick={() => setAttrs((x) => x.filter((_, j) => j !== i))} aria-label="Hapus atribut" className="grid h-10 w-10 place-items-center rounded-full text-ink-soft hover:bg-ink/5">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </section>

        <section className="card space-y-4 p-5">
          <h2 className="font-bold">SEO</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Meta title</span>
              <input name="seoTitle" maxLength={70} defaultValue={product?.seoTitle ?? ""} className="input" placeholder="Otomatis: Brand + Nama" />
            </label>
            <label className="block">
              <span className="label">SKU produk</span>
              <input name="sku" defaultValue={product?.sku ?? ""} className="input font-mono" placeholder="Otomatis" />
              <FieldError name="sku" />
            </label>
          </div>
          <label className="block">
            <span className="label">Meta description</span>
            <textarea name="seoDescription" maxLength={170} rows={2} defaultValue={product?.seoDescription ?? ""} className="input" placeholder="Otomatis dari deskripsi" />
          </label>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card space-y-3 p-5 xl:sticky xl:top-20">
          <h2 className="font-bold">Simpan</h2>
          {isNew ? (
            <div className="grid gap-2">
              {canPublish ? (
                <SubmitButton name="intent" value="publish" className="btn-primary w-full">
                  Simpan & Publish
                </SubmitButton>
              ) : requireApproval ? (
                <SubmitButton name="intent" value="submit" className="btn-primary w-full">
                  Simpan & Ajukan Approval
                </SubmitButton>
              ) : (
                <SubmitButton name="intent" value="submit" className="btn-primary w-full">
                  Simpan & Publish
                </SubmitButton>
              )}
              <SubmitButton name="intent" value="draft" className="btn-outline w-full">
                Simpan sebagai Draft
              </SubmitButton>
            </div>
          ) : (
            <div className="grid gap-2">
              <SubmitButton name="intent" value="save" className="btn-primary w-full">
                Simpan perubahan
              </SubmitButton>
              {status === "DRAFT" && !canPublish && (
                <SubmitButton name="intent" value="submit" className="btn-outline w-full">
                  {requireApproval ? "Simpan & Ajukan Approval" : "Simpan & Publish"}
                </SubmitButton>
              )}
              {status !== "PUBLISHED" && canPublish && (
                <SubmitButton name="intent" value="publish" className="btn-outline w-full">
                  Simpan & Publish
                </SubmitButton>
              )}
            </div>
          )}
          <p className="text-xs text-ink-soft">
            {canPublish
              ? "Anda dapat mempublikasikan produk langsung."
              : requireApproval
                ? "Produk baru Anda akan menunggu persetujuan Owner sebelum tampil."
                : "Owner mengizinkan staff mempublikasikan langsung."}
          </p>
          <div className="space-y-2 border-t border-ink/10 pt-3">
            {[
              ["isNewArrival", "New Arrival", product?.isNewArrival ?? true],
              ["isFeatured", "Featured / Trending", product?.isFeatured ?? false],
              ["isBestSeller", "Best Seller (manual pick)", product?.isBestSeller ?? false],
            ].map(([n, l, d]) => (
              <label key={n as string} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={n as string} defaultChecked={d as boolean} className="h-4 w-4 accent-brand-dark" /> {l as string}
              </label>
            ))}
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-bold">Foto produk</h2>
          <p className="text-xs text-ink-soft">Gunakan foto asli atau foto supplier yang memiliki izin penggunaan. JPG/PNG/WEBP, maks 8 MB per file.</p>
          {product && product.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {product.images.map((img) => {
                const gone = removed.includes(img.id);
                return (
                  <div key={img.id} className={cn("relative overflow-hidden rounded-xl border-2", primary === img.id && !gone ? "border-brand" : "border-transparent", gone && "opacity-30")}>
                    <div className="relative aspect-square bg-brand-off">
                      <Image src={img.url} alt="" fill sizes="120px" className="object-contain" />
                    </div>
                    <div className="absolute inset-x-1 bottom-1 flex justify-between">
                      <button type="button" onClick={() => setPrimary(img.id)} title="Jadikan foto utama" className="grid h-7 w-7 place-items-center rounded-full bg-card/90">
                        <Star className={cn("h-3.5 w-3.5", primary === img.id && "fill-brand text-brand")} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemoved((r) => (gone ? r.filter((x) => x !== img.id) : [...r, img.id]))}
                        title={gone ? "Batal hapus" : "Hapus foto"}
                        className="grid h-7 w-7 place-items-center rounded-full bg-card/90 text-sale"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink/15 p-5 text-center text-sm hover:border-brand">
            <Upload className="h-5 w-5 text-ink-soft" />
            <span className="font-semibold">Upload beberapa foto</span>
            <input
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="sr-only"
              onChange={(e) => setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))}
            />
          </label>
          {previews.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {previews.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="Pratinjau" className="aspect-square rounded-lg bg-brand-off object-contain" />
              ))}
            </div>
          )}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-bold">Ikon placeholder</h2>
          <p className="text-xs text-ink-soft">Ditampilkan sebagai “Foto segera hadir” bila produk belum punya foto. Unggah foto asli agar produk tampil maksimal.</p>
          <div className="mx-auto w-40 overflow-hidden rounded-2xl">
            <ProductIllustration type={illustration} color={previewColor} />
          </div>
          <select
            name="illustration"
            value={illustration}
            onChange={(e) => {
              setIllustration(e.target.value);
              setTouchedIl(true);
            }}
            className="input"
            aria-label="Jenis ilustrasi"
          >
            {ILLUSTRATIONS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </section>
      </aside>
    </ActionForm>
  );
}
