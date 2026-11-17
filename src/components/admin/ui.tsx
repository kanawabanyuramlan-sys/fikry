import Link from "next/link";
import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABEL, PRODUCT_STATUS_LABEL, PAYMENT_STATUS_LABEL, COMPLAINT_STATUS_LABEL } from "@/lib/constants";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {back && (
          <Link href={back.href} className="mb-2 inline-block text-xs font-semibold text-ink-soft hover:text-ink">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className, pad = true }: { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cn("card", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/[.07] px-5 py-4">
          <div>
            {title && <h2 className="text-base font-bold">{title}</h2>}
            {description && <p className="text-xs text-ink-soft">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint, accent }: { label: string; value: React.ReactNode; hint?: React.ReactNode; accent?: boolean }) {
  return (
    <div className={cn("card p-5", accent && "border-transparent bg-brand-dark text-paper")}>
      <p className={cn("text-xs font-semibold uppercase tracking-wider", accent ? "text-brand-lime" : "text-ink-soft")}>{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight sm:text-[28px]">{value}</p>
      {hint && <p className={cn("mt-1 text-xs", accent ? "text-paper/70" : "text-ink-soft")}>{hint}</p>}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: "bg-brand-light text-brand-dark",
  solid: "bg-brand text-paper",
  amber: "bg-warn-soft text-warn",
  red: "bg-sale/10 text-sale",
  gray: "bg-ink/[.06] text-ink/70",
  blue: "bg-surface-2 text-ink",
  dark: "bg-ink text-paper",
};
export function Badge({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={cn("badge whitespace-nowrap", TONES[tone])}>{children}</span>;
}

export function ProductStatusBadge({ status, outcome }: { status: string; outcome?: string | null }) {
  const tone = ({ DRAFT: "gray", PENDING: "amber", APPROVED: "blue", PUBLISHED: "solid", ARCHIVED: "dark" } as const)[status as "DRAFT"] ?? "gray";
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge tone={tone}>{PRODUCT_STATUS_LABEL[status] ?? status}</Badge>
      {outcome === "REJECTED" && <Badge tone="red">Ditolak</Badge>}
      {outcome === "REVISION" && <Badge tone="amber">Perlu revisi</Badge>}
    </span>
  );
}
export function OrderStatusBadge({ status }: { status: string }) {
  const tone = ({ RECEIVED: "amber", CONFIRMED: "blue", PROCESSING: "blue", PACKED: "blue", SHIPPED: "green", DELIVERED: "solid", CANCELLED: "red" } as const)[status as "RECEIVED"] ?? "gray";
  return <Badge tone={tone}>{ORDER_STATUS_LABEL[status] ?? status}</Badge>;
}
export function PaymentBadge({ status }: { status: string }) {
  return <Badge tone={status === "PAID" ? "solid" : status === "REFUNDED" ? "gray" : "amber"}>{PAYMENT_STATUS_LABEL[status] ?? status}</Badge>;
}
export function ComplaintBadge({ status }: { status: string }) {
  const tone = ({ SUBMITTED: "amber", REVIEWING: "blue", APPROVED: "green", REJECTED: "red", RESOLVED: "solid" } as const)[status as "SUBMITTED"] ?? "gray";
  return <Badge tone={tone}>{COMPLAINT_STATUS_LABEL[status] ?? status}</Badge>;
}

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="grid place-items-center px-6 py-14 text-center">
      <p className="font-bold">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="-mx-px overflow-x-auto">{children}</div>;
}

export function Pager({ page, pages, href }: { page: number; pages: number; href: (n: number) => string }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t border-ink/[.07] px-5 py-3 text-sm">
      <span className="text-ink-soft">
        Halaman {page} dari {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="btn btn-outline btn-sm">
            Sebelumnya
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="btn btn-outline btn-sm">
            Berikutnya
          </Link>
        )}
      </div>
    </div>
  );
}

/** Builds a query-string href preserving current filters. */
export function qs(base: string, params: Record<string, string | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `${base}?${s}` : base;
}
