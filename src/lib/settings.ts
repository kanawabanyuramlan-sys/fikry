import { cache } from "react";
import { db } from "./db";

// Every editable piece of store configuration. Owner edits these in /admin/settings.
export const SETTING_DEFAULTS = {
  "store.name": "VERDA",
  "store.tagline": "Premium Multi-Brand Lifestyle Store",
  "store.description":
    "VERDA mengkurasi sneakers, apparel, tas, aksesori dan produk lifestyle dari berbagai brand dalam satu tempat — dipilih, dicek dan dikirim langsung oleh tim kami.",
  "store.logo": "",
  "contact.whatsapp": "6281234567890",
  "contact.email": "hello@verda.example",
  "contact.address": "Jl. Contoh Raya No. 12, Jakarta Selatan, DKI Jakarta 12345",
  "contact.hours": "Senin–Sabtu 09.00–18.00 WIB · Minggu & libur nasional: respon terbatas",
  "social.instagram": "https://instagram.com/",
  "social.tiktok": "https://tiktok.com/",
  "whatsapp.greeting": "Halo, saya ingin bertanya mengenai produk yang tersedia.",
  "payment.bankInfo": "Bank BCA · 0000000000 · a.n. VERDA (ubah di Settings)",
  "payment.instructions":
    "Transfer sesuai total pesanan, lalu kirim bukti transfer beserta Order ID melalui WhatsApp. Pesanan diproses setelah pembayaran diverifikasi oleh tim kami.",
  "shipping.flatJavaBali": "20000",
  "shipping.flatOther": "45000",
  "shipping.freeThreshold": "1500000",
  "shipping.estimate": "Jawa–Bali 2–4 hari kerja · Luar Jawa 4–8 hari kerja",
  "products.requireApproval": "true",
  "inventory.lowStock": "5",
  "page.about":
    "VERDA adalah toko lifestyle multi-brand yang dikelola oleh tim kecil yang mencintai sneakers, apparel dan produk harian berkualitas.\n\nKami mengkurasi setiap produk, memeriksa kondisinya sebelum dikirim, dan mengelola pengiriman sendiri agar setiap pesanan sampai dengan baik.",
  "page.customer-service":
    "Tim customer service kami siap membantu melalui WhatsApp dan email pada jam operasional. Siapkan Order ID agar kami dapat membantu lebih cepat.",
  "page.shipping":
    "Pesanan diproses 1×24 jam kerja setelah pembayaran terverifikasi.\n\nPengiriman dilakukan langsung oleh tim toko menggunakan ekspedisi rekanan. Nomor resi dapat dilihat di halaman Lacak Pesanan setelah paket dikirim.\n\nOngkos kirim flat: Jawa–Bali dan luar Jawa sesuai tarif yang tertera di checkout. Gratis ongkir untuk belanja di atas batas yang berlaku.",
  "page.warranty":
    "Garansi yang berlaku adalah GARANSI TOKO, bukan garansi resmi dari brand atau distributor, kecuali dinyatakan lain secara tertulis pada halaman produk.\n\nGaransi toko mencakup cacat produksi yang ditemukan dalam 7 hari sejak barang diterima. Kerusakan akibat pemakaian tidak termasuk.",
  "page.returns":
    "Pengembalian dapat diajukan maksimal 3 hari setelah barang diterima apabila barang yang diterima tidak sesuai pesanan atau cacat. Barang harus belum dipakai, lengkap dengan label dan kemasan asli.\n\nAjukan melalui halaman Retur & Komplain dengan menyertakan Order ID dan foto pendukung.",
  "page.exchange":
    "Penukaran ukuran dapat dilakukan satu kali selama stok tersedia. Ongkos kirim penukaran ditanggung pelanggan kecuali kesalahan berasal dari pihak toko.",
  "page.refund":
    "Refund diproses setelah barang retur diterima dan diperiksa. Dana dikembalikan ke rekening pelanggan dalam 3–7 hari kerja.",
  "page.authenticity":
    "Kami mengkurasi produk dari sumber yang kami pilih dan memeriksa setiap barang sebelum dikirim. Detail sumber dan kondisi barang dicantumkan pada setiap halaman produk.\n\nVERDA adalah reseller independen. Kami tidak mengklaim sebagai distributor atau reseller resmi suatu brand kecuali dinyatakan secara tertulis beserta buktinya.",
  "page.quality":
    "Setiap produk melewati pemeriksaan kualitas: kondisi fisik, kelengkapan, ukuran dan kesesuaian dengan foto/deskripsi sebelum dikemas.",
  "page.privacy":
    "Kami hanya menggunakan data pribadi (nama, kontak, alamat) untuk memproses pesanan, pengiriman dan layanan pelanggan. Data tidak dijual kepada pihak ketiga. Anda dapat meminta penghapusan data melalui email customer service.",
  "page.terms":
    "Dengan berbelanja di toko ini Anda menyetujui syarat & ketentuan yang berlaku, termasuk kebijakan pengiriman, garansi toko, retur dan refund. Harga dan ketersediaan dapat berubah sewaktu-waktu.",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export const POLICY_PAGES: { slug: string; key: SettingKey; title: string }[] = [
  { slug: "about", key: "page.about", title: "About Us" },
  { slug: "customer-service", key: "page.customer-service", title: "Customer Service" },
  { slug: "shipping", key: "page.shipping", title: "Shipping Policy" },
  { slug: "warranty", key: "page.warranty", title: "Warranty Policy" },
  { slug: "returns", key: "page.returns", title: "Return Policy" },
  { slug: "exchange", key: "page.exchange", title: "Exchange Policy" },
  { slug: "refund", key: "page.refund", title: "Refund Policy" },
  { slug: "authenticity", key: "page.authenticity", title: "Product Authenticity" },
  { slug: "quality", key: "page.quality", title: "Product Quality Guarantee" },
  { slug: "privacy", key: "page.privacy", title: "Privacy Policy" },
  { slug: "terms", key: "page.terms", title: "Terms & Conditions" },
];

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await db.setting.findMany();
  const out = { ...SETTING_DEFAULTS } as Record<string, string>;
  for (const r of rows) if (r.key in out) out[r.key] = r.value;
  return out as Settings;
});

export const settingInt = (s: Settings, key: SettingKey) => parseInt(s[key] || "0", 10) || 0;
