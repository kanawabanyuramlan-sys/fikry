import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";
import type { PermissionKey } from "./constants";

export const STAFF_COOKIE = "verda_staff";
export const CUSTOMER_COOKIE = "verda_customer";
type Kind = "staff" | "customer";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars).");
  return new TextEncoder().encode(s);
}

// ───────── passwords & tokens ─────────
export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

export const PASSWORD_RULE = "Minimal 8 karakter, mengandung huruf dan angka.";
export function passwordOk(pw: string) {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw);
}

// ───────── sessions (signed JWT in httpOnly cookie) ─────────
export async function createSession(kind: Kind, id: string, version: number) {
  const maxAge = kind === "staff" ? 60 * 60 * 12 : 60 * 60 * 24 * 30;
  const token = await new SignJWT({ k: kind, v: version })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(secret());
  const jar = await cookies();
  jar.set(kind === "staff" ? STAFF_COOKIE : CUSTOMER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  });
}

export async function destroySession(kind: Kind) {
  const jar = await cookies();
  jar.delete(kind === "staff" ? STAFF_COOKIE : CUSTOMER_COOKIE);
}

async function readSession(kind: Kind) {
  const jar = await cookies();
  const token = jar.get(kind === "staff" ? STAFF_COOKIE : CUSTOMER_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (payload.k !== kind || !payload.sub) return null;
    return { id: payload.sub, version: Number(payload.v ?? 0) };
  } catch {
    return null;
  }
}

// ───────── staff ─────────
export type Staff = NonNullable<Awaited<ReturnType<typeof loadStaff>>>;

async function loadStaff(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
  if (!user) return null;
  const permissions = new Set<string>(
    user.role.isOwner ? (await db.permission.findMany()).map((p) => p.key) : user.role.permissions.map((rp) => rp.permission.key),
  );
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    status: user.status,
    sessionVersion: user.sessionVersion,
    isOwner: user.role.isOwner,
    role: { id: user.role.id, name: user.role.name, slug: user.role.slug },
    permissions,
  };
}

/** Current staff member, re-validated against the DB on every request (status + session version). */
export const getStaff = cache(async () => {
  const s = await readSession("staff");
  if (!s) return null;
  const staff = await loadStaff(s.id);
  if (!staff || staff.status !== "ACTIVE" || staff.sessionVersion !== s.version) return null;
  return staff;
});

export function can(staff: Pick<Staff, "isOwner" | "permissions"> | null, perm: PermissionKey | PermissionKey[]) {
  if (!staff) return false;
  if (staff.isOwner) return true;
  const list = Array.isArray(perm) ? perm : [perm];
  return list.some((p) => staff.permissions.has(p));
}

/** Page guard: redirects to login, or to the dashboard with a notice when the permission is missing. */
export async function requireStaffPage(perm?: PermissionKey | PermissionKey[]) {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (perm && !can(staff, perm)) redirect("/admin?denied=1");
  return staff;
}

// ───────── customers ─────────
export const getCustomer = cache(async () => {
  const s = await readSession("customer");
  if (!s) return null;
  const c = await db.customer.findUnique({ where: { id: s.id } });
  if (!c || !c.passwordHash || c.sessionVersion !== s.version) return null;
  return { id: c.id, name: c.name, email: c.email, phone: c.phone };
});

export async function requireCustomerPage(next = "/account") {
  const c = await getCustomer();
  if (!c) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return c;
}

// ───────── naive in-memory rate limiter (per process) for login endpoints ─────────
const attempts = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, max = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.until < now) {
    attempts.set(key, { count: 1, until: now + windowMs });
    return true;
  }
  rec.count += 1;
  return rec.count <= max;
}
export function clearRateLimit(key: string) {
  attempts.delete(key);
}
