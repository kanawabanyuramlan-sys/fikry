import type { Metadata } from "next";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { getSettings, settingInt } from "@/lib/settings";
import { AdminShell, type NavItem } from "@/components/admin/shell";
import type { PermissionKey } from "@/lib/constants";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaffPage();
  const s = await getSettings();
  const [pendingProducts, newOrders, lowStock, openComplaints, pendingReviews] = await Promise.all([
    can(me, "products.publish") ? db.product.count({ where: { status: "PENDING" } }) : 0,
    can(me, "orders.view") ? db.order.count({ where: { status: "RECEIVED" } }) : 0,
    can(me, "inventory.view") ? db.productVariant.count({ where: { isActive: true, stock: { lte: settingInt(s, "inventory.lowStock") }, product: { status: "PUBLISHED" } } }) : 0,
    can(me, "complaints.manage") ? db.complaint.count({ where: { status: { in: ["SUBMITTED", "REVIEWING"] } } }) : 0,
    can(me, "reviews.manage") ? db.review.count({ where: { status: "PENDING" } }) : 0,
  ]);
  // Menus are filtered by permission here; every page/action re-checks on the server as well.
  const all: (NavItem & { perm: PermissionKey | null })[] = [
    { key: "overview", label: "Overview", href: "/admin", group: "Store", perm: null },
    { key: "orders", label: "Orders & Shipping", href: "/admin/orders", group: "Store", perm: "orders.view", badge: newOrders },
    { key: "customers", label: "Customers", href: "/admin/customers", group: "Store", perm: "customers.view" },
    { key: "complaints", label: "Returns & Complaints", href: "/admin/complaints", group: "Store", perm: "complaints.manage", badge: openComplaints },
    { key: "products", label: "Products", href: "/admin/products", group: "Catalog", perm: "products.view", badge: pendingProducts },
    { key: "inventory", label: "Inventory", href: "/admin/inventory", group: "Catalog", perm: "inventory.view", badge: lowStock },
    { key: "categories", label: "Categories", href: "/admin/categories", group: "Catalog", perm: "catalog.manage" },
    { key: "brands", label: "Brands", href: "/admin/brands", group: "Catalog", perm: "catalog.manage" },
    { key: "reviews", label: "Reviews", href: "/admin/reviews", group: "Catalog", perm: "reviews.manage", badge: pendingReviews },
    { key: "promotions", label: "Promotions & Ads", href: "/admin/promotions", group: "Marketing", perm: "promotions.manage" },
    { key: "coupons", label: "Vouchers", href: "/admin/coupons", group: "Marketing", perm: "promotions.manage" },
    { key: "team", label: "Team Management", href: "/admin/team", group: "Team", perm: "team.view" },
    { key: "roles", label: "Roles & Permissions", href: "/admin/roles", group: "Team", perm: "team.view" },
    { key: "activity", label: "Activity Logs", href: "/admin/activity", group: "Team", perm: "activity.view" },
    { key: "settings", label: "Website Settings", href: "/admin/settings", group: "Settings", perm: "settings.manage" },
    { key: "account", label: "My Account", href: "/admin/account", group: "Settings", perm: null },
  ];
  const nav = all.filter((n) => !n.perm || can(me, n.perm)).map(({ perm: _p, ...n }) => n);
  return (
    <AdminShell nav={nav} user={{ name: me.name, role: me.role.name, email: me.email }} storeName={s["store.name"]}>
      {children}
    </AdminShell>
  );
}
