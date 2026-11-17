"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity, safe, staffAction, str, UserError, type ActionResult } from "@/lib/action";
import {
  clearRateLimit,
  createSession,
  destroySession,
  hashPassword,
  passwordOk,
  PASSWORD_RULE,
  rateLimit,
  sha256,
  verifyPassword,
} from "@/lib/auth";

async function ip() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function staffLogin(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const email = str(fd, "email").toLowerCase();
    const key = `sl:${await ip()}:${email}`;
    if (!rateLimit(key, 6)) throw new UserError("Terlalu banyak percobaan login. Coba lagi dalam 10 menit.");
    const user = await db.user.findUnique({ where: { email } });
    const ok = user && (await verifyPassword(str(fd, "password"), user.passwordHash));
    if (!user || !ok) throw new UserError("Email atau password salah.");
    if (user.status === "SUSPENDED") throw new UserError("Akun Anda sedang dinonaktifkan. Hubungi Owner toko.");
    if (user.status !== "ACTIVE") throw new UserError("Akun ini tidak lagi memiliki akses.");
    clearRateLimit(key);
    await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await createSession("staff", user.id, user.sessionVersion);
    await logActivity(user.id, "auth.login", "user", user.id, `${user.name} login ke dashboard`);
    return { ok: true, redirect: "/admin" };
  });
}

export async function staffLogout(): Promise<ActionResult> {
  await destroySession("staff");
  return { ok: true, redirect: "/admin/login" };
}

/** Invitee sets their name + password. Token is single-use, hashed at rest and expires. */
export async function acceptInvitation(fd: FormData): Promise<ActionResult> {
  return safe(async () => {
    const token = str(fd, "token");
    const data = z
      .object({ name: z.string().trim().min(2, "Nama wajib diisi").max(100), password: z.string().refine(passwordOk, PASSWORD_RULE) })
      .parse({ name: str(fd, "name"), password: str(fd, "password") });
    if (str(fd, "password") !== str(fd, "confirm")) return { ok: false, error: "Konfirmasi password tidak sama.", fieldErrors: { confirm: "Tidak sama" } };
    const inv = await db.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { role: true } });
    if (!inv || inv.acceptedAt || inv.revokedAt) throw new UserError("Undangan tidak valid atau sudah digunakan.");
    if (inv.expiresAt < new Date()) throw new UserError("Undangan sudah kedaluwarsa. Minta Owner mengirim ulang undangan.");
    if (inv.role.isOwner) throw new UserError("Undangan tidak valid.");
    const existing = await db.user.findUnique({ where: { email: inv.email } });
    if (existing && existing.status !== "REMOVED") throw new UserError("Email ini sudah memiliki akun tim. Silakan login.");
    const passwordHash = await hashPassword(data.password);
    const user = await db.$transaction(async (tx) => {
      const u = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { name: data.name, passwordHash, roleId: inv.roleId, status: "ACTIVE", sessionVersion: { increment: 1 } },
          })
        : await tx.user.create({ data: { email: inv.email, name: data.name, passwordHash, roleId: inv.roleId } });
      await tx.invitation.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
      return u;
    });
    await logActivity(user.id, "team.join", "user", user.id, `${user.name} menerima undangan sebagai ${inv.role.name}`);
    await createSession("staff", user.id, user.sessionVersion);
    return { ok: true, message: `Selamat bergabung, ${user.name.split(" ")[0]}!`, redirect: "/admin" };
  });
}

export async function updateOwnProfile(fd: FormData): Promise<ActionResult> {
  return staffAction(null, async (me) => {
    const data = z
      .object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(20).optional() })
      .parse({ name: str(fd, "name"), phone: str(fd, "phone") || undefined });
    await db.user.update({ where: { id: me.id }, data });
    return { ok: true, message: "Profil diperbarui." };
  });
}

export async function changeOwnPassword(fd: FormData): Promise<ActionResult> {
  return staffAction(null, async (me) => {
    const u = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(str(fd, "current"), u.passwordHash)))
      return { ok: false, error: "Password saat ini salah.", fieldErrors: { current: "Salah" } };
    const pw = str(fd, "password");
    if (!passwordOk(pw)) return { ok: false, error: PASSWORD_RULE, fieldErrors: { password: PASSWORD_RULE } };
    const updated = await db.user.update({ where: { id: me.id }, data: { passwordHash: await hashPassword(pw), sessionVersion: { increment: 1 } } });
    await createSession("staff", me.id, updated.sessionVersion);
    await logActivity(me.id, "auth.password", "user", me.id, `${me.name} mengganti password`);
    return { ok: true, message: "Password diganti. Sesi lain telah dikeluarkan." };
  });
}
