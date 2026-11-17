import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings, POLICY_PAGES } from "@/lib/settings";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = POLICY_PAGES.find((p) => p.slug === slug);
  return { title: page?.title ?? "Informasi", alternates: { canonical: `/pages/${slug}` } };
}

export default async function PolicyPage({ params }: Props) {
  const { slug } = await params;
  const page = POLICY_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();
  const s = await getSettings();
  const body = s[page.key];
  return (
    <div className="container-x grid gap-12 py-12 lg:grid-cols-[240px_1fr] lg:py-16">
      <nav aria-label="Informasi" className="order-2 lg:order-1">
        <p className="label">Informasi</p>
        <ul className="space-y-1">
          {POLICY_PAGES.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/pages/${p.slug}`}
                className={`block rounded-lg px-3 py-2 text-sm ${p.slug === slug ? "bg-brand-light font-semibold text-brand-dark" : "text-ink/70 hover:bg-ink/5"}`}
              >
                {p.title}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/contact" className="block rounded-lg px-3 py-2 text-sm text-ink/70 hover:bg-ink/5">
              Contact Us
            </Link>
          </li>
        </ul>
      </nav>
      <article className="order-1 max-w-3xl lg:order-2">
        <p className="eyebrow">{s["store.name"]}</p>
        <h1 className="h-display mt-2 text-4xl sm:text-5xl">{page.title}</h1>
        <div className="prose-policy mt-8">
          {body.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="whitespace-pre-line">
              {para}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
