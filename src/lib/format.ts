export function rupiah(value: number | null | undefined) {
  const v = Math.round(value ?? 0);
  return "Rp" + v.toLocaleString("id-ID");
}

export function discountPercent(original: number, selling: number) {
  if (!original || selling >= original) return 0;
  return Math.round(((original - selling) / original) * 100);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const dtf = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const dtfTime = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
export const fmtDate = (d: Date | string | null | undefined) => (d ? dtf.format(new Date(d)) : "—");
export const fmtDateTime = (d: Date | string | null | undefined) => (d ? dtfTime.format(new Date(d)) : "—");

export function timeAgo(d: Date | string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "baru saja";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} hari lalu`;
  return fmtDate(d);
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** Normalise an Indonesian phone number to international digits (62...). */
export function normalizePhone(phone: string) {
  let p = phone.replace(/[^0-9]/g, "");
  if (p.startsWith("0")) p = "62" + p.slice(1);
  if (p.startsWith("8")) p = "62" + p;
  return p;
}

export function waLink(phone: string, text: string) {
  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

/** Same-site relative path only: blocks "//evil.com" and "/\evil.com" open redirects. */
export function isSafePath(p: string | null | undefined): p is string {
  return !!p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/\\");
}
