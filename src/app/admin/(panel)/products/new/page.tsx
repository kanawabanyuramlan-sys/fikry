import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { categoryOptions } from "@/lib/admin-data";
import { PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor";

export const metadata: Metadata = { title: "Add Product" };

export default async function NewProductPage() {
  const me = await requireStaffPage("products.create");
  const [brands, cats, s] = await Promise.all([
    db.brand.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    categoryOptions(),
    getSettings(),
  ]);
  return (
    <>
      <PageHeader title="Add Product" back={{ href: "/admin/products", label: "Products" }} description="Produk langsung masuk ke database utama toko." />
      {(!brands.length || !cats.length) && (
        <p className="mb-5 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Tambahkan minimal satu{" "}
          <Link href="/admin/brands" className="underline">
            brand
          </Link>{" "}
          dan{" "}
          <Link href="/admin/categories" className="underline">
            kategori
          </Link>{" "}
          terlebih dahulu.
        </p>
      )}
      <ProductEditor
        product={null}
        brands={brands}
        categories={cats.filter((c) => c.isActive)}
        canPublish={can(me, "products.publish")}
        requireApproval={s["products.requireApproval"] === "true"}
      />
    </>
  );
}
