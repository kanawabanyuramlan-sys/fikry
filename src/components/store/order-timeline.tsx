import { Check, X } from "@/components/icons";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OrderTimeline({ status, history }: { status: string; history: { status: string; createdAt: Date | string; note?: string | null }[] }) {
  if (status === "CANCELLED") {
    const at = history.find((h) => h.status === "CANCELLED");
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-sale/10 p-4 text-sm text-sale">
        <X className="h-5 w-5" /> Pesanan dibatalkan {at && `· ${fmtDateTime(at.createdAt)}`}
        {at?.note && <span className="text-ink-soft">— {at.note}</span>}
      </div>
    );
  }
  const steps = ORDER_STATUSES.filter((s) => s !== "CANCELLED");
  const idx = steps.indexOf(status as (typeof steps)[number]);
  return (
    <ol className="grid grid-cols-1 gap-0 sm:grid-cols-6">
      {steps.map((s, i) => {
        const h = [...history].reverse().find((x) => x.status === s);
        const done = i <= idx;
        return (
          <li key={s} className="relative flex gap-3 pb-5 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
            {i < steps.length - 1 && (
              <span className={cn("absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5 sm:left-[calc(50%+16px)] sm:top-[15px] sm:h-0.5 sm:w-[calc(100%-32px)]", i < idx ? "bg-brand" : "bg-ink/10")} />
            )}
            <span className={cn("relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold", done ? "border-brand bg-brand text-paper" : "border-ink/15 bg-card text-ink-soft")}>
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className="sm:mt-2">
              <span className={cn("block text-xs font-bold", !done && "text-ink-soft")}>{ORDER_STATUS_LABEL[s]}</span>
              {h && <span className="block text-[11px] text-ink-soft">{fmtDateTime(h.createdAt)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
