import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/providers/toast";
import { getSettings } from "@/lib/settings";
import { appUrl } from "@/lib/mailer";


// Catalog, stock, promotions and settings are edited live by the team, so every page renders fresh.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const name = s["store.name"];
  return {
    metadataBase: new URL(appUrl()),
    title: { default: `${name} — ${s["store.tagline"]}`, template: `%s | ${name}` },
    description: s["store.description"],
    openGraph: { type: "website", siteName: name, locale: "id_ID" },
    twitter: { card: "summary_large_image" },
    icons: { icon: "/icon.svg" },
  };
}

export const viewport: Viewport = { themeColor: "#285D25", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
