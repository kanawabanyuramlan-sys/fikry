// Neutral "photo coming soon" placeholder. Products are shown with real / licensed photos;
// when a product has none yet, this calm panel (type icon + caption) stands in — it never
// pretends to be the product.
import { PRODUCT_GLYPHS } from "@/components/icons";
import { cn } from "@/lib/utils";

/** Kept for API compatibility with older callers; colour no longer tints anything. */
export function tintOf(_hex?: string | null) {
  return "oklch(var(--surface))";
}

export function ProductIllustration({
  type,
  className,
  title,
  plain = false,
  caption = true,
}: {
  type?: string | null;
  color?: string | null;
  className?: string;
  title?: string;
  plain?: boolean;
  caption?: boolean;
}) {
  const Glyph = PRODUCT_GLYPHS[type ?? ""] ?? PRODUCT_GLYPHS.accessory!;
  return (
    <div
      role="img"
      aria-label={title ?? "Foto produk segera hadir"}
      className={cn("flex flex-col items-center justify-center gap-2 text-ink-soft/70", !plain && "bg-surface", className)}
    >
      <Glyph weight="thin" className="h-[38%] max-h-28 w-[38%] max-w-28" />
      {caption && <span className="text-[10px] font-semibold uppercase tracking-[.16em]">Foto segera hadir</span>}
    </div>
  );
}
