import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Mail, Instagram, Music2, MapPin, Clock } from "@/components/icons";
import { getSettings } from "@/lib/settings";
import { waLink } from "@/lib/format";

export const metadata: Metadata = { title: "Contact Us", description: "Hubungi customer service kami via WhatsApp, email atau media sosial." };

export default async function ContactPage() {
  const s = await getSettings();
  const channels = [
    s["contact.whatsapp"] && {
      icon: MessageCircle,
      title: "WhatsApp Customer Service",
      value: `+${s["contact.whatsapp"].replace(/^0/, "62")}`,
      href: waLink(s["contact.whatsapp"], s["whatsapp.greeting"]),
      cta: "Chat sekarang",
    },
    s["contact.email"] && { icon: Mail, title: "Email", value: s["contact.email"], href: `mailto:${s["contact.email"]}`, cta: "Kirim email" },
    s["social.instagram"] && { icon: Instagram, title: "Instagram", value: s["social.instagram"].replace(/^https?:\/\/(www\.)?/, ""), href: s["social.instagram"], cta: "Kunjungi" },
    s["social.tiktok"] && { icon: Music2, title: "TikTok", value: s["social.tiktok"].replace(/^https?:\/\/(www\.)?/, ""), href: s["social.tiktok"], cta: "Kunjungi" },
  ].filter(Boolean) as { icon: typeof Mail; title: string; value: string; href: string; cta: string }[];
  return (
    <div className="container-x py-12 sm:py-16">
      <p className="eyebrow">Customer Support</p>
      <h1 className="h-display mt-2 text-4xl sm:text-6xl">Contact Us</h1>
      <p className="mt-4 max-w-xl text-ink-soft">Ada pertanyaan soal stok, ukuran, atau pesanan? Tim kami siap membantu.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {channels.map((c) => (
          <a key={c.title} href={c.href} target="_blank" rel="noopener noreferrer" className="card group flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-lift">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-light text-brand-dark">
              <c.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 font-bold">{c.title}</p>
            <p className="mt-1 break-all text-sm text-ink-soft">{c.value}</p>
            <span className="mt-4 text-sm font-semibold text-brand-dark group-hover:underline">{c.cta} →</span>
          </a>
        ))}
      </div>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="card flex gap-4 p-6">
          <MapPin className="h-6 w-6 shrink-0 text-brand-dark" />
          <div>
            <p className="font-bold">Alamat toko</p>
            <p className="mt-1 text-sm text-ink-soft">{s["contact.address"]}</p>
          </div>
        </div>
        <div className="card flex gap-4 p-6">
          <Clock className="h-6 w-6 shrink-0 text-brand-dark" />
          <div>
            <p className="font-bold">Jam operasional</p>
            <p className="mt-1 text-sm text-ink-soft">{s["contact.hours"]}</p>
          </div>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/track" className="btn btn-outline">
          Lacak pesanan
        </Link>
        <Link href="/complaint" className="btn btn-outline">
          Ajukan retur / komplain
        </Link>
      </div>
    </div>
  );
}
