import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { can, getStaff, type Staff } from "./auth";
import type { PermissionKey } from "./constants";
import { db } from "./db";

export type ActionResult<T = unknown> =
  | { ok: true; message?: string; data?: T; redirect?: string }
  | { ok: false; error: string; fieldErrors?: Partial<Record<string, string>> };

/** Error whose message is safe to show to the user. */
export class UserError extends Error {}

function fromZod(e: ZodError): ActionResult<never> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of e.issues) {
    const k = issue.path.join(".");
    if (!fieldErrors[k]) fieldErrors[k] = issue.message;
  }
  const first = e.issues[0];
  return {
    ok: false,
    error: first ? `${first.path.join(".") || "Input"}: ${first.message}` : "Input tidak valid.",
    fieldErrors,
  };
}

export async function safe<T>(fn: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    return await fn();
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof ZodError) return fromZod(e);
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error("[action]", e);
    return { ok: false, error: "Terjadi kesalahan pada server. Silakan coba lagi." };
  }
}

/**
 * Wraps every admin mutation. Permission is checked on the server for every call —
 * hiding a button in the UI is never the only protection.
 */
export async function staffAction<T>(
  perm: PermissionKey | PermissionKey[] | null,
  fn: (staff: Staff) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  return safe(async () => {
    const staff = await getStaff();
    if (!staff) return { ok: false, error: "Sesi berakhir. Silakan login kembali." };
    if (perm && !can(staff, perm)) return { ok: false, error: "Anda tidak memiliki izin untuk aksi ini." };
    return fn(staff);
  });
}

export async function logActivity(
  userId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string,
  meta?: unknown,
) {
  await db.activityLog.create({
    data: { userId, action, entityType, entityId, summary, meta: meta === undefined ? null : JSON.stringify(meta) },
  });
}

// FormData helpers
export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
export const bool = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v === "on" || v === "true" || v === "1";
};
export const int = (fd: FormData, k: string, fallback = 0) => {
  const v = parseInt(str(fd, k).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(v) ? v : fallback;
};
export const optDate = (fd: FormData, k: string) => {
  const v = str(fd, k);
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};
