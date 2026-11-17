import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCategoryTree } from "@/lib/catalog";
import { getActivePromotions } from "@/lib/promotions";
import { getCustomer } from "@/lib/auth";
import { ShopProvider } from "@/components/providers/shop";
import { SiteHeader } from "@/components/store/header";
import { SiteFooter } from "@/components/store/footer";
import { AnnouncementBar, PromoPopup, WhatsAppFloat } from "@/components/store/chrome";
import { CartDrawer } from "@/components/store/cart-drawer";
import { QuickView } from "@/components/store/buy-box";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [s, tree, promos, customer, brands] = await Promise.all([
    getSettings(),
    getCategoryTree(),
    getActivePromotions(),
    getCustomer(),
    db.brand.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { name: true, slug: true } }),
  ]);
  const menuCats = tree.roots
    .filter((c) => c.showInMenu)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      illustration: c.illustration,
      image: c.image,
      children: c.children.filter((x) => x.showInMenu).map((x) => ({ name: x.name, slug: x.slug })),
    }));
  return (
    <ShopProvider>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-card focus:px-4 focus:py-2">
        Lewati ke konten
      </a>
      <AnnouncementBar items={promos.announcements.map((a) => ({ id: a.id, title: a.title, url: a.url }))} />
      <SiteHeader
        storeName={s["store.name"]}
        logo={s["store.logo"] || undefined}
        categories={menuCats}
        brands={brands}
        customerName={customer?.name ?? null}
      />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter s={s} categories={menuCats} />
      <WhatsAppFloat phone={s["contact.whatsapp"]} message={s["whatsapp.greeting"]} />
      <PromoPopup
        promo={
          promos.popup
            ? {
                id: promos.popup.id,
                title: promos.popup.title,
                description: promos.popup.description,
                ctaLabel: promos.popup.ctaLabel,
                url: promos.popup.url,
                illustration: promos.popup.illustration,
                image: promos.popup.image,
              }
            : null
        }
      />
      <CartDrawer />
      <QuickView />
    </ShopProvider>
  );
}
