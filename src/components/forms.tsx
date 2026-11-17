"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "@/components/icons";
import { useToast } from "@/components/providers/toast";
import type { ActionResult } from "@/lib/action";
import { cn } from "@/lib/utils";

// Serverless platforms (Vercel) cap a request body at ~4.5 MB, so photos are downscaled in the
// browser before upload: longest side ≤ 1600 px, JPEG q≈0.82. GIFs are left untouched.
const MAX_SIDE = 1600;
const MAX_REQUEST_BYTES = 4 * 1024 * 1024;

async function downscale(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size < 350 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

async function shrinkImages(fd: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  let total = 0;
  for (const key of new Set(fd.keys())) {
    const values = fd.getAll(key);
    if (!values.some((v) => v instanceof File && v.size > 0)) {
      for (const v of values) total += typeof v === "string" ? v.length : 0;
      continue;
    }
    const next = await Promise.all(values.map((v) => (v instanceof File && v.size > 0 ? downscale(v) : v)));
    fd.delete(key);
    for (const v of next) {
      fd.append(key, v);
      total += v instanceof File ? v.size : v.length;
    }
  }
  if (total > MAX_REQUEST_BYTES)
    return { ok: false, error: "Total foto terlalu besar untuk sekali kirim (maks ±4 MB). Unggah sebagian dulu, lalu simpan lagi." };
  return { ok: true };
}

type FormCtx = { pending: boolean; errors: Partial<Record<string, string>> };
const Ctx = createContext<FormCtx>({ pending: false, errors: {} });

/**
 * Submits a server action, shows success/error toasts, maps field errors, then
 * redirects or refreshes server data. Every action re-checks auth & permissions on the server.
 */
export function ActionForm({
  action,
  children,
  className,
  reset,
  refresh = true,
  onDone,
  confirm,
  id,
}: {
  action: (fd: FormData) => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  className?: string;
  reset?: boolean;
  refresh?: boolean;
  onDone?: (r: Extract<ActionResult<unknown>, { ok: true }>) => void;
  confirm?: string;
  id?: string;
}) {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const toast = useToast();
  const router = useRouter();
  return (
    <Ctx.Provider value={{ pending, errors }}>
      <form
        id={id}
        className={className}
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm && !window.confirm(confirm)) return;
          const form = e.currentTarget;
          const fd = new FormData(form);
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          if (submitter?.name) fd.set(submitter.name, submitter.value);
          start(async () => {
            const sized = await shrinkImages(fd);
            if (!sized.ok) {
              toast("error", sized.error);
              return;
            }
            const r = await action(fd);
            if (r.ok) {
              setErrors({});
              if (r.message) toast("success", r.message);
              if (reset) form.reset();
              onDone?.(r);
              if (r.redirect) router.push(r.redirect);
              else if (refresh) router.refresh();
            } else {
              setErrors(r.fieldErrors ?? {});
              toast("error", r.error);
            }
          });
        }}
      >
        {children}
      </form>
    </Ctx.Provider>
  );
}

export const useFormState2 = () => useContext(Ctx);

export function SubmitButton({
  children,
  className,
  name,
  value,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useContext(Ctx);
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} className={cn("btn", className ?? "btn-primary")}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function FieldError({ name }: { name: string }) {
  const { errors } = useContext(Ctx);
  if (!errors[name]) return null;
  return <p className="mt-1 text-xs font-medium text-sale">{errors[name]}</p>;
}

export function Field({
  label,
  name,
  hint,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; name: string; hint?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      <input name={name} className="input" {...props} />
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
      <FieldError name={name} />
    </label>
  );
}

export function TextArea({
  label,
  name,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; name: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      <textarea name={name} className="input min-h-[96px]" {...props} />
      <FieldError name={name} />
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  className,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      <select name={name} className="input" {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError name={name} />
    </label>
  );
}

export function Checkbox({ label, name, defaultChecked, hint }: { label: string; name: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink/10 p-3 hover:bg-brand-off">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-brand-dark" />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

/** One-click action (delete, approve…) with optional confirm dialog. */
export function ActionButton({
  action,
  children,
  className,
  confirm,
  title,
}: {
  action: () => Promise<ActionResult<unknown>>;
  children: React.ReactNode;
  className?: string;
  confirm?: string;
  title?: string;
}) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      title={title}
      disabled={pending}
      className={cn("btn", className ?? "btn-outline btn-sm")}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const r = await action();
          if (r.ok) {
            if (r.message) toast("success", r.message);
            if (r.redirect) router.push(r.redirect);
            else router.refresh();
          } else toast("error", r.error);
        });
      }}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
