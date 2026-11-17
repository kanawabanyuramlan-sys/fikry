import Image from "next/image";
import { ProductIllustration } from "@/components/illustration";
import { cn } from "@/lib/utils";

/**
 * Product photo in a square sand well. Licensed stock photos carry a small "Foto contoh" tag so a
 * sample is never presented as the actual item; products without any photo show a neutral placeholder.
 */
export function ProductMedia({
  image,
  illustration,
  alt,
  className,
  sizes = "(min-width:1024px) 25vw, 50vw",
  priority,
  label = true,
  sample = false,
  fit = "cover",
}: {
  image?: string | null;
  illustration?: string | null;
  color?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  label?: boolean;
  sample?: boolean;
  tint?: string;
  fit?: "cover" | "contain";
}) {
  return (
    <div className={cn("relative aspect-square w-full overflow-hidden bg-surface", className)}>
      {image ? (
        <>
          <Image src={image} alt={alt} fill sizes={sizes} priority={priority} className={fit === "cover" ? "object-cover" : "object-contain"} />
          {label && sample && (
            <span
              title="Foto contoh berlisensi — bukan foto produk yang dijual"
              className="absolute bottom-2.5 left-2.5 rounded-full bg-card/85 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-soft backdrop-blur"
            >
              Foto contoh
            </span>
          )}
        </>
      ) : (
        <ProductIllustration type={illustration} title={`Foto ${alt} segera hadir`} className="h-full w-full" caption={label} />
      )}
    </div>
  );
}
