import Link from "next/link";
import { Instagram, Mail, MessageCircle, Music2, MapPin, Clock } from "@/components/icons";
import { Logo } from "./header";
import { NewsletterForm } from "./newsletter";
import type { Settings } from "@/lib/settings";
import { waLink } from "@/lib/format";

export function SiteFooter({ s, categories }: { s: Settings; categories: { name: string; slug: string }[] }) {
  const cols = [
    {
      title: "Shop",
      links: [
        { label: "New Arrivals", href: "/new-arrivals" },
        ...categories.map((c) => ({ label: c.name, href: `/c/${c.slug}` })),
        { label: "Brands", href: "/brands" },
        { label: "Sale", href: "/sale" },
      ],
    },
    {
      title: "Customer Service",
      links: [
        { label: "Contact Us", href: "/contact" },
        { label: "Customer Service", href: "/pages/customer-service" },
        { label: "Lacak Pesanan", href: "/track" },
        { label: "Shipping Information", href: "/pages/shipping" },
        { label: "Return & Exchange", href: "/pages/returns" },
        { label: "Ajukan Retur / Komplain", href: "/complaint" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", href: "/pages/about" },
        { label: "Product Authenticity", href: "/pages/authenticity" },
        { label: "Quality Guarantee", href: "/pages/quality" },
        { label: "Warranty Policy", href: "/pages/warranty" },
        { label: "Privacy Policy", href: "/pages/privacy" },
        { label: "Terms & Conditions", href: "/pages/terms" },
      ],
    },
  ];
  return (
    <footer className="mt-24 bg-ink text-paper">
      <div className="container-x grid gap-12 py-16 lg:grid-cols-[1.2fr_2fr]">
        <div className="max-w-md">
          <Logo name={s["store.name"]} logo={s["store.logo"] || undefined} className="text-paper [&>span]:bg-brand-lime" />
          <p className="mt-5 text-sm leading-relaxed text-paper/65">{s["store.description"]}</p>
          <div className="mt-8">
            <p className="text-sm font-bold">Dapatkan info drop & promo terbaru</p>
            <NewsletterForm dark />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-paper/50">{c.title}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm text-paper/70 transition hover:text-paper">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="container-x flex flex-col gap-6 py-8 text-sm text-paper/65 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
            <span className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {s["contact.address"]}
            </span>
            <span className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" /> {s["contact.hours"]}
            </span>
          </div>
          <div className="flex gap-2">
            {s["social.instagram"] && (
              <a href={s["social.instagram"]} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full bg-card/10 hover:bg-card/20">
                <Instagram className="h-4 w-4" />
              </a>
            )}
            {s["social.tiktok"] && (
              <a href={s["social.tiktok"]} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="grid h-10 w-10 place-items-center rounded-full bg-card/10 hover:bg-card/20">
                <Music2 className="h-4 w-4" />
              </a>
            )}
            {s["contact.whatsapp"] && (
              <a href={waLink(s["contact.whatsapp"], s["whatsapp.greeting"])} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid h-10 w-10 place-items-center rounded-full bg-card/10 hover:bg-card/20">
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            {s["contact.email"] && (
              <a href={`mailto:${s["contact.email"]}`} aria-label="Email" className="grid h-10 w-10 place-items-center rounded-full bg-card/10 hover:bg-card/20">
                <Mail className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div aria-hidden className="pointer-events-none select-none overflow-hidden">
          <p className="-mb-[0.16em] whitespace-nowrap text-center font-serif text-[30vw] font-normal leading-none tracking-[-.04em] text-paper/[.07]">{s["store.name"]}</p>
        </div>
        <div className="container-x py-6 text-xs text-paper/40">
          © {new Date().getFullYear()} {s["store.name"]}. Reseller independen. Semua merek dagang milik pemiliknya masing-masing.
        </div>
      </div>
    </footer>
  );
}
