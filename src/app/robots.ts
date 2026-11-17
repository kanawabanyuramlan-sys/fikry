import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/mailer";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/account", "/cart", "/checkout", "/order", "/wishlist"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
