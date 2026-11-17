"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "@/components/icons";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };
const Ctx = createContext<(kind: Toast["kind"], message: string) => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-2xl border border-ink/10 bg-card p-4 text-sm shadow-lift"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
            ) : t.kind === "error" ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sale" />
            ) : (
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" />
            )}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button aria-label="Tutup" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-ink-soft hover:text-ink">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
