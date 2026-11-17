/* Seed: permissions, system roles, the Owner account, starter categories, DEMO brands/products
 * (fictional brand names + illustrations, clearly not real product photos) and starter promotions.
 * No orders are seeded — every order in the dashboard is a real one. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLES, PERMISSIONS, COLOR_SWATCHES } from "../src/lib/constants";
import { applySamplePhotos } from "./apply-sample-photos";

try {
  process.loadEnvFile(".env");
} catch {}

const db = new PrismaClient();

const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const CATEGORIES: { name: string; desc: string; il: string; template: string[]; children: [string, string][] }[] = [
  {
    name: "Shoes",
    desc: "Footwear — sneakers, running, casual, formal, sandals & slides.",
    il: "sneaker",
    template: ["Shoe Model", "Upper Material", "Outsole", "Closure"],
    children: [
      ["Sneakers", "sneaker"], ["Running Shoes", "running"], ["Casual Shoes", "sneaker"],
      ["Formal Shoes", "formal"], ["Sandals", "sandal"], ["Slides", "slide"],
    ],
  },
  {
    name: "Clothing",
    desc: "Clothing & apparel for everyday, sport and outerwear.",
    il: "hoodie",
    template: ["Fit Type", "Fabric", "Care"],
    children: [
      ["T-Shirts", "tshirt"], ["Polos", "polo"], ["Shirts", "shirt"], ["Hoodies", "hoodie"],
      ["Sweatshirts", "hoodie"], ["Jackets", "jacket"], ["Outerwear", "jacket"], ["Pants", "pants"],
      ["Jeans", "pants"], ["Shorts", "shorts"], ["Sportswear", "tshirt"], ["Activewear", "shorts"],
    ],
  },
  {
    name: "Bags",
    desc: "Bags & luggage — backpacks, slings, totes, travel bags and wallets.",
    il: "backpack",
    template: ["Dimensions", "Capacity", "Bag Type", "Compartments"],
    children: [
      ["Backpacks", "backpack"], ["Sling Bags", "bag"], ["Shoulder Bags", "bag"],
      ["Tote Bags", "tote"], ["Travel Bags", "backpack"], ["Wallets", "wallet"],
    ],
  },
  {
    name: "Accessories",
    desc: "Watches, eyewear, headwear, belts, socks and more.",
    il: "watch",
    template: ["Type", "Specifications"],
    children: [
      ["Watches", "watch"], ["Sunglasses", "sunglasses"], ["Caps", "cap"], ["Hats", "hat"],
      ["Belts", "belt"], ["Socks", "socks"], ["Fashion Accessories", "accessory"],
    ],
  },
  {
    name: "Lifestyle",
    desc: "Travel and daily essentials for life on the move.",
    il: "bottle",
    template: ["Type", "Capacity", "Specifications"],
    children: [["Travel Essentials", "bottle"], ["Daily Essentials", "bottle"], ["Other Lifestyle Products", "accessory"]],
  },
];

const BRANDS = [
  ["Northpeak", "Outdoor-ready gear and apparel built for city and trail."],
  ["Kinetik", "Performance running and training essentials."],
  ["Urban Kite", "Relaxed streetwear staples with clean silhouettes."],
  ["Solace", "Comfort-first sandals and slides."],
  ["Tidewalk", "Easy casual footwear for everyday."],
  ["Arcadia Time", "Minimal analog watches."],
  ["Morrow & Co", "Bags and leather goods for daily carry."],
  ["Lumen Optics", "Lightweight sunglasses with UV400 lenses."],
  ["Basecamp Supply", "Lifestyle and travel essentials."],
];

type P = {
  name: string;
  brand: string;
  cat: string;
  gender?: string;
  price: [number, number];
  colors: string[];
  sizes: string[];
  material: string;
  attrs: [string, string][];
  il?: string;
  flags?: ("new" | "best" | "featured")[];
  desc: string;
};

const SHOE = ["39", "40", "41", "42", "43", "44"];
const SHOE_W = ["36", "37", "38", "39", "40"];
const APP = ["S", "M", "L", "XL", "XXL"];
const OS = ["One Size"];

const PRODUCTS: P[] = [
  { name: "Court Classic Low", brand: "Tidewalk", cat: "sneakers", price: [1199000, 999000], colors: ["White", "Green"], sizes: SHOE, material: "Synthetic leather", attrs: [["Shoe Model", "Low-top court"], ["Outsole", "Rubber cupsole"], ["Closure", "Laces"]], flags: ["new", "featured"], desc: "Siluet court klasik dengan upper kulit sintetis yang mudah dibersihkan dan cupsole karet yang empuk untuk dipakai seharian." },
  { name: "Metro Runner 2", brand: "Kinetik", cat: "running-shoes", price: [1499000, 1299000], colors: ["Black", "Lime"], sizes: SHOE, material: "Engineered mesh", attrs: [["Shoe Model", "Daily trainer"], ["Upper Material", "Engineered mesh"], ["Outsole", "Carbon rubber"], ["Closure", "Laces"]], flags: ["best", "featured"], desc: "Sepatu lari harian dengan midsole foam responsif dan upper mesh yang bernapas. Cocok untuk 5K hingga long run santai." },
  { name: "Stride Lite", brand: "Kinetik", cat: "running-shoes", gender: "WOMEN", price: [1299000, 1299000], colors: ["Pink", "White"], sizes: SHOE_W, material: "Knit mesh", attrs: [["Shoe Model", "Lightweight runner"], ["Outsole", "Blown rubber"], ["Closure", "Laces"]], flags: ["new"], desc: "Runner ringan dengan upper knit stretch dan bantalan lembut untuk lari pagi maupun aktivitas harian." },
  { name: "Trail Edge GTX", brand: "Northpeak", cat: "sneakers", gender: "MEN", price: [1899000, 1599000], colors: ["Olive", "Black"], sizes: SHOE, material: "Ripstop & suede", attrs: [["Shoe Model", "Trail sneaker"], ["Outsole", "Lugged rubber"], ["Closure", "Speed laces"]], desc: "Sneaker trail dengan outsole bergerigi untuk grip di permukaan basah dan upper ripstop yang tahan gesekan." },
  { name: "Canvas Everyday Slip-On", brand: "Tidewalk", cat: "casual-shoes", price: [599000, 449000], colors: ["Navy", "Cream", "Black"], sizes: SHOE, material: "Cotton canvas", attrs: [["Shoe Model", "Slip-on"], ["Outsole", "Vulcanized rubber"], ["Closure", "Elastic gore"]], flags: ["best"], desc: "Slip-on kanvas yang praktis — tinggal pakai. Insole empuk dan sol vulkanisir yang fleksibel." },
  { name: "Heritage Derby", brand: "Tidewalk", cat: "formal-shoes", gender: "MEN", price: [1699000, 1499000], colors: ["Brown", "Black"], sizes: SHOE, material: "Full-grain leather", il: "formal", attrs: [["Shoe Model", "Derby"], ["Outsole", "Rubber"], ["Closure", "Laces"]], desc: "Derby kulit full-grain dengan jahitan rapi, cocok untuk kerja maupun acara semi-formal." },
  { name: "Cloud Strap Sandal", brand: "Solace", cat: "sandals", price: [549000, 459000], colors: ["Beige", "Black"], sizes: SHOE_W.concat(["41", "42"]), material: "EVA & webbing", attrs: [["Shoe Model", "Strap sandal"], ["Outsole", "EVA"], ["Closure", "Hook & loop"]], flags: ["new"], desc: "Sandal tali dengan footbed EVA kontur yang menopang lengkung kaki. Ringan dan cepat kering." },
  { name: "Pool Slide Pro", brand: "Solace", cat: "slides", price: [399000, 299000], colors: ["Green", "Black", "White"], sizes: SHOE, material: "Molded EVA", attrs: [["Shoe Model", "Slide"], ["Outsole", "Textured EVA"]], flags: ["best", "featured"], desc: "Slide one-piece yang empuk dengan tekstur anti-selip. Andalan untuk santai, gym, dan traveling." },
  { name: "Essential Heavyweight Tee", brand: "Urban Kite", cat: "t-shirts", price: [299000, 249000], colors: ["White", "Black", "Olive", "Cream"], sizes: APP, material: "100% cotton 240gsm", attrs: [["Fit Type", "Boxy"], ["Fabric", "Combed cotton 24s"], ["Care", "Cuci terbalik, air dingin"]], flags: ["best"], desc: "Kaos heavyweight 240gsm dengan potongan boxy dan kerah rib tebal yang tetap rapi setelah dicuci berkali-kali." },
  { name: "Graphic Pocket Tee", brand: "Urban Kite", cat: "t-shirts", price: [279000, 199000], colors: ["Lime", "Navy"], sizes: APP, material: "Cotton jersey", attrs: [["Fit Type", "Regular"], ["Fabric", "Cotton jersey 30s"]], flags: ["new"], desc: "Kaos regular fit dengan saku dada dan grafis kecil di punggung." },
  { name: "Piqué Club Polo", brand: "Northpeak", cat: "polos", gender: "MEN", price: [459000, 459000], colors: ["Navy", "White", "Green"], sizes: APP, material: "Cotton piqué", attrs: [["Fit Type", "Slim"], ["Fabric", "Cotton piqué"]], desc: "Polo piqué klasik dengan kerah rib dan placket dua kancing." },
  { name: "Oxford Button-Down", brand: "Urban Kite", cat: "shirts", price: [529000, 449000], colors: ["Blue", "White"], sizes: APP, material: "Cotton oxford", attrs: [["Fit Type", "Regular"], ["Fabric", "Oxford cloth"]], desc: "Kemeja oxford button-down yang serbaguna — rapi untuk kantor, santai untuk akhir pekan." },
  { name: "Cloudfleece Hoodie", brand: "Urban Kite", cat: "hoodies", price: [699000, 599000], colors: ["Grey", "Green", "Black"], sizes: APP, material: "Cotton fleece 330gsm", attrs: [["Fit Type", "Relaxed"], ["Fabric", "Brushed fleece"], ["Care", "Jangan dikeringkan dengan mesin"]], flags: ["featured", "best"], desc: "Hoodie fleece tebal dengan bagian dalam brushed yang lembut, kantong kanguru, dan hood berlapis ganda." },
  { name: "Crewneck Sweatshirt", brand: "Basecamp Supply", cat: "sweatshirts", price: [549000, 549000], colors: ["Cream", "Navy"], sizes: APP, material: "French terry", il: "hoodie", attrs: [["Fit Type", "Regular"], ["Fabric", "French terry"]], flags: ["new"], desc: "Sweatshirt french terry dengan rib di manset dan hem." },
  { name: "Windshell Track Jacket", brand: "Kinetik", cat: "jackets", price: [899000, 749000], colors: ["Black", "Green"], sizes: APP, material: "Recycled nylon", attrs: [["Fit Type", "Regular"], ["Fabric", "Nylon ripstop, DWR"]], flags: ["featured"], desc: "Jaket ringan tahan angin dengan lapisan DWR untuk gerimis, bisa dilipat ke dalam saku." },
  { name: "Utility Overshirt", brand: "Northpeak", cat: "outerwear", gender: "MEN", price: [999000, 849000], colors: ["Olive", "Brown"], sizes: APP, material: "Cotton twill", il: "jacket", attrs: [["Fit Type", "Boxy"], ["Fabric", "Heavy twill"]], desc: "Overshirt twill tebal dengan dua saku dada — dipakai sebagai kemeja atau jaket ringan." },
  { name: "Tapered Chino", brand: "Urban Kite", cat: "pants", price: [499000, 429000], colors: ["Beige", "Black", "Navy"], sizes: ["28", "30", "32", "34", "36"], material: "Stretch cotton twill", attrs: [["Fit Type", "Tapered"], ["Fabric", "Cotton 98% / Elastane 2%"]], desc: "Chino tapered dengan sedikit stretch untuk kenyamanan bergerak." },
  { name: "Straight Selvedge Jeans", brand: "Northpeak", cat: "jeans", price: [899000, 899000], colors: ["Blue"], sizes: ["28", "30", "32", "34", "36"], material: "13.5oz selvedge denim", attrs: [["Fit Type", "Straight"], ["Fabric", "Raw selvedge denim"]], desc: "Jeans straight dari denim selvedge 13.5oz yang akan membentuk fading unik seiring pemakaian." },
  { name: "Court Shorts 7\"", brand: "Kinetik", cat: "shorts", price: [349000, 279000], colors: ["Black", "Grey", "Green"], sizes: APP, material: "Quick-dry polyester", attrs: [["Fit Type", "Regular"], ["Fabric", "Quick-dry"]], flags: ["new"], desc: "Celana pendek 7 inci yang cepat kering, dengan saku ritsleting untuk kunci." },
  { name: "Dri Motion Training Tee", brand: "Kinetik", cat: "sportswear", price: [329000, 329000], colors: ["Lime", "Black"], sizes: APP, material: "Polyester mesh", attrs: [["Fit Type", "Athletic"], ["Fabric", "Moisture-wicking"]], desc: "Kaos training yang menyerap keringat dengan panel mesh di punggung." },
  { name: "Flex Studio Leggings", brand: "Kinetik", cat: "activewear", gender: "WOMEN", price: [499000, 399000], colors: ["Black", "Purple"], sizes: ["XS", "S", "M", "L"], material: "Nylon spandex", il: "pants", attrs: [["Fit Type", "Compression"], ["Fabric", "4-way stretch"]], flags: ["best"], desc: "Leggings high-waist dengan kain 4-way stretch yang tidak menerawang." },
  { name: "Commuter Backpack 22L", brand: "Morrow & Co", cat: "backpacks", price: [1099000, 899000], colors: ["Black", "Grey", "Olive"], sizes: OS, material: "Water-resistant polyester", attrs: [["Dimensions", "46 × 30 × 14 cm"], ["Capacity", "22 L"], ["Bag Type", "Backpack"], ["Compartments", "Slot laptop 15.6\""]], flags: ["featured", "best"], desc: "Ransel harian 22L dengan slot laptop berbantalan, saku botol, dan bahan tahan cipratan air." },
  { name: "Trail Daypack 18L", brand: "Northpeak", cat: "backpacks", price: [799000, 799000], colors: ["Orange", "Navy"], sizes: OS, material: "Ripstop nylon", attrs: [["Dimensions", "44 × 28 × 12 cm"], ["Capacity", "18 L"], ["Bag Type", "Daypack"]], flags: ["new"], desc: "Daypack ringan untuk hiking singkat atau jalan-jalan kota." },
  { name: "Crossbody Sling", brand: "Morrow & Co", cat: "sling-bags", price: [449000, 379000], colors: ["Black", "Green", "Beige"], sizes: OS, material: "Nylon twill", il: "bag", attrs: [["Dimensions", "24 × 14 × 6 cm"], ["Capacity", "1.5 L"], ["Bag Type", "Sling"]], flags: ["best"], desc: "Sling bag ringkas untuk ponsel, dompet dan powerbank, dengan tali yang bisa diatur." },
  { name: "Everyday Shoulder Bag", brand: "Morrow & Co", cat: "shoulder-bags", gender: "WOMEN", price: [899000, 749000], colors: ["Cream", "Black", "Brown"], sizes: OS, material: "Vegan leather", attrs: [["Dimensions", "28 × 20 × 9 cm"], ["Bag Type", "Shoulder bag"]], flags: ["featured"], desc: "Shoulder bag kulit vegan dengan flap magnetik dan kompartemen dalam yang rapi." },
  { name: "Market Canvas Tote", brand: "Basecamp Supply", cat: "tote-bags", price: [249000, 199000], colors: ["Cream", "Green"], sizes: OS, material: "12oz canvas", attrs: [["Dimensions", "40 × 38 × 12 cm"], ["Bag Type", "Tote"]], desc: "Tote kanvas tebal untuk belanja, kerja, atau ke pantai." },
  { name: "Weekender Duffel 40L", brand: "Northpeak", cat: "travel-bags", price: [1299000, 1099000], colors: ["Black", "Olive"], sizes: OS, material: "Coated canvas", il: "bag", attrs: [["Dimensions", "55 × 30 × 28 cm"], ["Capacity", "40 L"], ["Bag Type", "Duffel"]], desc: "Duffel 40L dengan kompartemen sepatu terpisah — pas untuk kabin pesawat." },
  { name: "Slim Bifold Wallet", brand: "Morrow & Co", cat: "wallets", gender: "MEN", price: [349000, 299000], colors: ["Brown", "Black"], sizes: OS, material: "Genuine leather", attrs: [["Dimensions", "11 × 9 cm"], ["Specifications", "6 slot kartu"]], desc: "Dompet bifold tipis dari kulit asli dengan 6 slot kartu." },
  { name: "Field Automatic 38mm", brand: "Arcadia Time", cat: "watches", price: [2899000, 2499000], colors: ["Green", "Black"], sizes: OS, material: "Stainless steel / leather strap", attrs: [["Type", "Automatic"], ["Specifications", "38mm · 100m WR · Sapphire crystal"]], flags: ["featured"], desc: "Jam tangan automatic 38mm dengan dial field yang mudah dibaca dan kaca sapphire." },
  { name: "Minimal Quartz 40mm", brand: "Arcadia Time", cat: "watches", price: [1299000, 1299000], colors: ["Navy", "Brown"], sizes: OS, material: "Stainless steel", attrs: [["Type", "Quartz"], ["Specifications", "40mm · 50m WR"]], flags: ["new"], desc: "Jam tangan quartz minimalis dengan strap yang mudah diganti." },
  { name: "Wayfarer Polarized", brand: "Lumen Optics", cat: "sunglasses", price: [699000, 549000], colors: ["Black", "Brown"], sizes: OS, material: "Acetate frame", attrs: [["Type", "Square"], ["Specifications", "Polarized · UV400"]], flags: ["best"], desc: "Kacamata square dengan lensa polarized UV400 yang mengurangi silau." },
  { name: "Six-Panel Cap", brand: "Urban Kite", cat: "caps", price: [229000, 189000], colors: ["Green", "Black", "Beige"], sizes: OS, material: "Cotton twill", attrs: [["Type", "Strapback"], ["Specifications", "Adjustable"]], flags: ["best", "new"], desc: "Topi six-panel dari cotton twill dengan strap belakang yang bisa diatur." },
  { name: "Reversible Bucket Hat", brand: "Basecamp Supply", cat: "hats", price: [259000, 259000], colors: ["Olive", "Cream"], sizes: ["M", "L"], material: "Cotton canvas", attrs: [["Type", "Bucket"], ["Specifications", "Reversible"]], desc: "Bucket hat dua sisi — dua warna dalam satu topi." },
  { name: "Leather Dress Belt", brand: "Morrow & Co", cat: "belts", gender: "MEN", price: [399000, 349000], colors: ["Brown", "Black"], sizes: ["90", "100", "110"], material: "Genuine leather", attrs: [["Type", "Pin buckle"], ["Specifications", "Lebar 3.5 cm"]], desc: "Ikat pinggang kulit asli dengan gesper pin brushed steel." },
  { name: "Crew Sport Socks 3-Pack", brand: "Kinetik", cat: "socks", price: [149000, 129000], colors: ["White", "Black"], sizes: ["M", "L"], material: "Cotton blend", attrs: [["Type", "Crew"], ["Specifications", "Isi 3 pasang"]], flags: ["best"], desc: "Kaus kaki crew dengan bantalan di telapak — isi 3 pasang." },
  { name: "Beaded Charm Bracelet", brand: "Basecamp Supply", cat: "fashion-accessories", price: [129000, 99000], colors: ["Green", "Navy"], sizes: OS, material: "Glass beads", attrs: [["Type", "Bracelet"], ["Specifications", "Elastic"]], desc: "Gelang manik kaca dengan tali elastis." },
  { name: "Insulated Bottle 750ml", brand: "Basecamp Supply", cat: "travel-essentials", price: [349000, 279000], colors: ["Green", "Black", "Cream"], sizes: OS, material: "18/8 stainless steel", attrs: [["Type", "Botol vakum"], ["Capacity", "750 ml"], ["Specifications", "Dingin 24 jam / panas 12 jam"]], flags: ["featured", "new"], desc: "Botol vakum dinding ganda yang menjaga minuman dingin 24 jam." },
  { name: "Daily Tech Pouch", brand: "Morrow & Co", cat: "daily-essentials", price: [199000, 199000], colors: ["Grey", "Black"], sizes: OS, material: "Nylon", il: "wallet", attrs: [["Type", "Organizer pouch"], ["Specifications", "Elastic loops"]], desc: "Pouch organizer untuk kabel, charger dan aksesori kecil." },
];

let seedN = 7;
const rand = () => {
  seedN = (seedN * 9301 + 49297) % 233280;
  return seedN / 233280;
};

async function main() {
  // permissions
  for (const p of PERMISSIONS) {
    await db.permission.upsert({ where: { key: p.key }, update: { label: p.label, group: p.group }, create: p });
  }
  const perms = await db.permission.findMany();
  const permId = new Map(perms.map((p) => [p.key, p.id]));

  // roles (system roles keep their permission sets only on first create)
  for (const r of DEFAULT_ROLES) {
    const existing = await db.role.findUnique({ where: { slug: r.slug } });
    if (existing) continue;
    await db.role.create({
      data: {
        slug: r.slug,
        name: r.name,
        description: r.description,
        isSystem: true,
        isOwner: !!r.isOwner,
        permissions: { create: r.permissions.map((k) => ({ permissionId: permId.get(k)! })) },
      },
    });
  }
  const ownerRole = await db.role.findUniqueOrThrow({ where: { slug: "owner" } });

  const email = (process.env.SEED_OWNER_EMAIL || "owner@verda.test").toLowerCase();
  if (!(await db.user.findFirst({ where: { role: { isOwner: true } } }))) {
    const password = process.env.SEED_OWNER_PASSWORD;
    if (!password || password.length < 10)
      throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD (min. 10 characters) in the environment to create the first Owner account.");
    await db.user.create({
      data: {
        email,
        name: process.env.SEED_OWNER_NAME || "Store Owner",
        passwordHash: await bcrypt.hash(password, 12),
        roleId: ownerRole.id,
      },
    });
    console.log(`Owner account created: ${email} (password from SEED_OWNER_PASSWORD)`);
  }
  const owner = await db.user.findFirstOrThrow({ where: { role: { isOwner: true } } });

  if ((await db.product.count()) > 0) {
    console.log("Catalog already seeded — skipping demo catalog.");
    return;
  }

  // categories
  const catId = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const parent = await db.category.create({
      data: {
        name: c.name, slug: slug(c.name), description: c.desc, illustration: c.il, sortOrder: i,
        isFeatured: true, attributeTemplate: JSON.stringify(c.template),
      },
    });
    catId.set(parent.slug, parent.id);
    for (const [j, [name, il]] of c.children.entries()) {
      const child = await db.category.create({
        data: { name, slug: slug(name), illustration: il, parentId: parent.id, sortOrder: j, attributeTemplate: JSON.stringify(c.template) },
      });
      catId.set(child.slug, child.id);
    }
  }
  const catIl = new Map((await db.category.findMany()).map((c) => [c.id, c.illustration]));

  // brands
  const brandId = new Map<string, string>();
  for (const [i, [name, description]] of BRANDS.entries()) {
    const b = await db.brand.create({ data: { name: name!, slug: slug(name!), description, isFeatured: true, sortOrder: i } });
    brandId.set(name!, b.id);
  }

  // products
  const now = Date.now();
  for (const [i, p] of PRODUCTS.entries()) {
    const categoryId = catId.get(p.cat);
    if (!categoryId) throw new Error(`Unknown category ${p.cat}`);
    const [original, selling] = p.price;
    const base = `VRD-${slug(p.brand).slice(0, 3).toUpperCase()}-${String(1001 + i)}`;
    const variants = p.colors.flatMap((color) =>
      p.sizes.map((size) => ({
        sku: `${base}-${color.toUpperCase()}-${size.replace(/\s+/g, "").toUpperCase()}`,
        color,
        colorHex: COLOR_SWATCHES[color] ?? null,
        size,
        stock: Math.floor(rand() * 14),
      })),
    );
    const created = new Date(now - (PRODUCTS.length - i) * 36e5 * 20);
    await db.product.create({
      data: {
        name: p.name,
        slug: slug(`${p.brand} ${p.name}`),
        sku: base,
        brandId: brandId.get(p.brand)!,
        categoryId,
        description: p.desc,
        originalPrice: original,
        sellingPrice: selling,
        discountPct: original > selling ? Math.round(((original - selling) / original) * 100) : 0,
        gender: p.gender ?? "UNISEX",
        material: p.material,
        condition: "NEW",
        status: "PUBLISHED",
        isNewArrival: !!p.flags?.includes("new"),
        isBestSeller: !!p.flags?.includes("best"),
        isFeatured: !!p.flags?.includes("featured"),
        illustration: p.il ?? catIl.get(categoryId) ?? "accessory",
        attributes: JSON.stringify(p.attrs.map(([name, value]) => ({ name, value }))),
        createdById: owner.id,
        updatedById: owner.id,
        publishedAt: created,
        createdAt: created,
        variants: { create: variants },
      },
    });
  }

  // promotions
  await db.promotion.createMany({
    data: [
      { type: "ANNOUNCEMENT", title: "Gratis ongkir Jawa–Bali untuk belanja min. Rp1.500.000", url: "/pages/shipping", sortOrder: 0 },
      { type: "ANNOUNCEMENT", title: "New Collection: Fresh Season Drop sudah tersedia", url: "/new-arrivals", sortOrder: 1 },
      { type: "ANNOUNCEMENT", title: "Voucher WELCOME10 — diskon 10% untuk pesanan pertama", url: "/shop", sortOrder: 2 },
      { type: "HERO", title: "FIND YOUR STYLE. DEFINE YOURSELF.", subtitle: "Fresh Season Drop", description: "Sneakers, apparel dan essentials dari brand pilihan — dikurasi dan dikirim langsung oleh tim kami.", ctaLabel: "Shop Now", url: "/new-arrivals", illustration: "sneaker", theme: "green", sortOrder: 0 },
      { type: "HERO", title: "STYLE THAT MOVES WITH YOU.", subtitle: "Performance & Activewear", description: "Running shoes, training tee dan jaket ringan untuk setiap gerak.", ctaLabel: "Shop Activewear", url: "/c/clothing", illustration: "hoodie", theme: "dark", sortOrder: 1 },
      { type: "HERO", title: "DISCOVER YOUR EVERYDAY ESSENTIALS.", subtitle: "Bags & Daily Carry", description: "Ransel, sling bag, dan perlengkapan harian yang dirancang untuk dipakai setiap hari.", ctaLabel: "Shop Bags", url: "/c/bags", illustration: "backpack", theme: "lime", sortOrder: 2 },
      { type: "FLASH_SALE", title: "Weekend Sale", subtitle: "Up to 30% off", description: "Potongan harga pilihan setiap akhir pekan.", ctaLabel: "Shop Sale", url: "/sale", illustration: "slide", theme: "dark", sortOrder: 0 },
      { type: "SEASONAL", title: "Seasonal Collection", subtitle: "Layer up", description: "Hoodie, overshirt dan jaket ringan untuk musim hujan.", ctaLabel: "Explore", url: "/c/outerwear", illustration: "jacket", theme: "light", sortOrder: 1 },
      { type: "NEW_COLLECTION", title: "New Collection", subtitle: "Just landed", description: "Produk terbaru minggu ini.", ctaLabel: "See what's new", url: "/new-arrivals", illustration: "cap", theme: "lime", sortOrder: 2 },
      { type: "BANNER", title: "Limited Deals", subtitle: "Special Offers", description: "Stok terbatas — selagi ada.", ctaLabel: "Shop Deals", url: "/sale", illustration: "watch", theme: "green", sortOrder: 3 },
      { type: "POPUP", title: "Diskon 10% pesanan pertama", description: "Gunakan kode WELCOME10 saat checkout. Berlaku untuk minimal belanja Rp300.000.", ctaLabel: "Belanja sekarang", url: "/new-arrivals", illustration: "sneaker", theme: "green" },
    ],
  });
  await db.coupon.create({
    data: { code: "WELCOME10", description: "Diskon 10% pesanan pertama (maks. Rp100.000)", type: "PERCENT", value: 10, minSpend: 300000, maxDiscount: 100000 },
  });

  await db.activityLog.create({
    data: { userId: owner.id, action: "store.seed", entityType: "store", summary: "Katalog awal (demo) dibuat oleh seed" },
  });
  await applySamplePhotos(db);
  console.log(`Seeded ${PRODUCTS.length} demo products, ${BRANDS.length} demo brands, ${CATEGORIES.length} root categories.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
