// Shared enums, permission catalogue and default roles.

export const PRODUCT_STATUSES = ["DRAFT", "PENDING", "APPROVED", "PUBLISHED", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const PRODUCT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending Approval",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const ORDER_STATUSES = [
  "RECEIVED",
  "CONFIRMED",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export const ORDER_STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Order Received",
  CONFIRMED: "Order Confirmed",
  PROCESSING: "Processing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Belum dibayar",
  PAID: "Lunas",
  REFUNDED: "Refund",
};
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Transfer Bank (manual)",
  WHATSAPP: "Konfirmasi via WhatsApp",
};

export const CONDITIONS: Record<string, string> = {
  NEW: "Baru (BNIB)",
  LIKE_NEW: "Seperti baru",
  PRE_OWNED: "Pre-owned",
};
export const GENDERS: Record<string, string> = {
  UNISEX: "Unisex",
  MEN: "Men",
  WOMEN: "Women",
  KIDS: "Kids",
};

export const COMPLAINT_TYPES: Record<string, string> = {
  RETURN: "Pengembalian (Return)",
  EXCHANGE: "Penukaran (Exchange)",
  REFUND: "Refund",
  WARRANTY: "Klaim garansi toko",
  COMPLAINT: "Komplain lainnya",
};
export const COMPLAINT_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Diajukan",
  REVIEWING: "Ditinjau",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  RESOLVED: "Selesai",
};

export const PROMOTION_TYPES: Record<string, string> = {
  ANNOUNCEMENT: "Announcement Bar",
  HERO: "Homepage Hero Banner",
  BANNER: "Promotional Banner",
  FLASH_SALE: "Flash Sale",
  SEASONAL: "Seasonal Campaign",
  NEW_COLLECTION: "New Collection",
  POPUP: "Popup Promotion",
};

// Illustration keys rendered by <ProductIllustration/> when no photo exists.
export const ILLUSTRATIONS = [
  "sneaker",
  "running",
  "formal",
  "sandal",
  "slide",
  "tshirt",
  "polo",
  "shirt",
  "hoodie",
  "jacket",
  "pants",
  "shorts",
  "backpack",
  "bag",
  "tote",
  "wallet",
  "watch",
  "sunglasses",
  "cap",
  "hat",
  "belt",
  "socks",
  "bottle",
  "accessory",
] as const;
export type IllustrationKey = (typeof ILLUSTRATIONS)[number];

export const SIZE_ORDER = [
  "XS", "S", "M", "L", "XL", "XXL", "3XL",
  "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46",
  "One Size",
];

export const COLOR_SWATCHES: Record<string, string> = {
  Black: "#1d1f1d",
  White: "#f4f4f1",
  Grey: "#9aa09a",
  Navy: "#23314f",
  Blue: "#3b6fd8",
  Green: "#78B82A",
  Olive: "#6b7340",
  Lime: "#A8D957",
  Red: "#d24a3c",
  Orange: "#ef8a2f",
  Yellow: "#f2c94c",
  Pink: "#ef8fb3",
  Purple: "#8a6fd1",
  Brown: "#8a5a3c",
  Beige: "#d9c7a6",
  Cream: "#efe6d2",
  Silver: "#c4c8cc",
  Gold: "#c9a54a",
};

// ───────── Permissions ─────────
export const PERMISSIONS = [
  { key: "dashboard.view", label: "View dashboard", group: "Dashboard" },
  { key: "analytics.view", label: "Financial overview & analytics", group: "Dashboard" },
  { key: "products.view", label: "View products", group: "Products" },
  { key: "products.create", label: "Add products", group: "Products" },
  { key: "products.edit", label: "Edit products, images, variants, prices", group: "Products" },
  { key: "products.delete", label: "Delete products", group: "Products" },
  { key: "products.publish", label: "Approve, reject & publish products", group: "Products" },
  { key: "catalog.manage", label: "Manage categories & brands", group: "Products" },
  { key: "inventory.view", label: "View inventory", group: "Inventory" },
  { key: "inventory.update", label: "Update stock", group: "Inventory" },
  { key: "orders.view", label: "View orders", group: "Orders" },
  { key: "orders.manage", label: "Confirm orders, update status & shipping", group: "Orders" },
  { key: "customers.view", label: "View customers", group: "Customers" },
  { key: "reviews.manage", label: "Moderate reviews", group: "Customers" },
  { key: "complaints.manage", label: "Handle returns & complaints", group: "Customers" },
  { key: "promotions.manage", label: "Banners, campaigns, coupons, homepage content", group: "Marketing" },
  { key: "team.view", label: "View team members", group: "Team" },
  { key: "team.manage", label: "Invite, edit, suspend & remove members; manage roles", group: "Team" },
  { key: "activity.view", label: "View activity logs", group: "Team" },
  { key: "settings.manage", label: "Website settings & policies", group: "Settings" },
] as const;
export type PermissionKey = (typeof PERMISSIONS)[number]["key"];
export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as PermissionKey[];

export const DEFAULT_ROLES: {
  slug: string;
  name: string;
  description: string;
  isOwner?: boolean;
  permissions: PermissionKey[];
}[] = [
  {
    slug: "owner",
    name: "Owner",
    description: "Akses penuh. Satu-satunya role yang dapat mentransfer kepemilikan toko.",
    isOwner: true,
    permissions: ALL_PERMISSION_KEYS,
  },
  {
    slug: "manager",
    name: "Manager",
    description: "Mengelola seluruh operasional harian sesuai izin dari Owner.",
    permissions: [
      "dashboard.view", "analytics.view",
      "products.view", "products.create", "products.edit", "products.delete", "products.publish", "catalog.manage",
      "inventory.view", "inventory.update",
      "orders.view", "orders.manage",
      "customers.view", "reviews.manage", "complaints.manage",
      "promotions.manage",
      "team.view", "activity.view",
    ],
  },
  {
    slug: "product-staff",
    name: "Product Staff",
    description: "Menambah & mengedit produk, foto, varian, kategori dan brand. Mengajukan produk untuk approval.",
    permissions: ["dashboard.view", "products.view", "products.create", "products.edit", "catalog.manage", "inventory.view"],
  },
  {
    slug: "inventory-staff",
    name: "Inventory Staff",
    description: "Melihat inventori, memperbarui stok dan memantau stok menipis.",
    permissions: ["dashboard.view", "products.view", "inventory.view", "inventory.update"],
  },
  {
    slug: "order-staff",
    name: "Order & Shipping Staff",
    description: "Konfirmasi pesanan, update status, pengiriman dan nomor resi.",
    permissions: ["dashboard.view", "orders.view", "orders.manage", "customers.view", "complaints.manage"],
  },
  {
    slug: "marketing-staff",
    name: "Marketing Staff",
    description: "Banner, kampanye, diskon, kupon dan konten homepage.",
    permissions: ["dashboard.view", "products.view", "promotions.manage", "reviews.manage"],
  },
];

export const INVITE_TTL_HOURS = 72;

export const PROVINCES = [
  "Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Sumatera Selatan",
  "Kepulauan Bangka Belitung", "Bengkulu", "Lampung", "DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah",
  "DI Yogyakarta", "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Kalimantan Barat",
  "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara",
  "Gorontalo", "Sulawesi Tengah", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara", "Maluku",
  "Maluku Utara", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Tengah", "Papua Pegunungan", "Papua Selatan",
];
export const JAVA_BALI = ["DKI Jakarta", "Jawa Barat", "Banten", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Bali"];
