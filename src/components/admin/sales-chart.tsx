"use client";

import { useState } from "react";
import { rupiah } from "@/lib/format";

type Day = { key: string; label: string; total: number; count: number };

/** Lightweight bar chart (no chart library) fed with real per-day order totals. */
export function SalesChart({ days }: { days: Day[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => d.total), 1);
  const sum = days.reduce((s, d) => s + d.total, 0);
  const orders = days.reduce((s, d) => s + d.count, 0);
  const h = hover !== null ? days[hover]! : null;
  const ticks = [1, 0.5, 0];
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-6">
        <div>
          <p className="text-xs text-ink-soft">30 hari</p>
          <p className="text-xl font-extrabold">{rupiah(sum)}</p>
        </div>
        <div>
          <p className="text-xs text-ink-soft">Pesanan</p>
          <p className="text-xl font-extrabold">{orders}</p>
        </div>
        <div className="ml-auto min-h-[40px] text-right text-sm" aria-live="polite">
          {h && (
            <>
              <p className="font-semibold">{h.label}</p>
              <p className="text-ink-soft">
                {rupiah(h.total)} · {h.count} pesanan
              </p>
            </>
          )}
        </div>
      </div>
      <div className="relative flex h-56 gap-[3px] pl-14">
        {ticks.map((t) => (
          <div key={t} className="pointer-events-none absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${t * 100}%` }}>
            <span className="w-12 text-right text-[10px] text-ink-soft">{t ? `${Math.round((max * t) / 1000).toLocaleString("id-ID")}k` : "0"}</span>
            <span className="h-px flex-1 bg-ink/[.06]" />
          </div>
        ))}
        {days.map((d, i) => (
          <button
            key={d.key}
            type="button"
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            aria-label={`${d.label}: ${rupiah(d.total)}, ${d.count} pesanan`}
            className="group relative flex h-full flex-1 items-end"
          >
            <span
              className={`w-full rounded-t-md transition-colors ${hover === i ? "bg-brand-dark" : d.total ? "bg-brand" : "bg-ink/[.06]"}`}
              style={{ height: `${Math.max(d.total ? 4 : 2, (d.total / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex justify-between pl-14 text-[10px] text-ink-soft">
        <span>{days[0]?.label}</span>
        <span>{days[14]?.label}</span>
        <span>{days[29]?.label}</span>
      </div>
    </div>
  );
}
