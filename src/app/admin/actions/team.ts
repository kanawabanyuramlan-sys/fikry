"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { logActivity, staffAction, str, UserError, type ActionResult } from "@/lib/action";
import { hashPassword, passwordOk, PASSWORD_RULE, randomToken, sha256, type Staff } from "@/lib/auth";
import { ALL_PERMISSION_KEYS, INVITE_TTL_HOURS } from "@/lib/constants";
import { appUrl, sendMail } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";
import { slugify } from "@/lib/format";

const email = z.string().trim().toLowerCase().email("Email tidak valid").max(120);

/** Prevent privilege escalation: a non-owner may only hand out roles whose permissions they already hold. */
async function assertAssignable(me: Staff, roleId: string) {
  const role = await db.role.findUnique({ where: { id: roleId }, include: { permissions: { include: { permission: true } } } });
  if (!role) throw new UserError("Role tidak ditemukan.");
  if (role.isOwner) throw new UserError("Role Owner tidak dapat diberikan. Gunakan Transfer Kepemilikan.");
  if (!me.isOwner) {
    const missing = role.permissions.map((p) => p.permission.key).filter((k) => !me.permissions.has(k));
    if (missing.length) throw new UserError(`Anda tidak dapat memberikan role dengan izin yang tidak Anda miliki (${missing.join(", ")}).`);
  }
  return role;
}

async function targetMember(me: Staff, id: string) {
  const u = await db.user.findUnique({ where: { id }, include: { role: true } });
  if (!u || u.status === "REMOVED") throw new UserError("Anggota tidak ditemukan.");
  if (u.role.isOwner) throw new UserError("Akun Owner tidak dapat diubah dari sini.");
  if (u.id === me.id) throw new UserError("Anda tidak dapat mengubah akses akun Anda sendiri.");
  return u;
}

async function sendInviteEmail(to: string, link: string, roleName: string, inviter: string) {
  const s = await getSettings();
  const store = s["store.name"];
  const text = `${inviter} mengundang Anda bergabung ke tim ${store} sebagai ${roleName}.\n\nBuat akun Anda melalui tautan berikut (berlaku ${INVITE_TTL_HOURS} jam):\n${link}\n\nAbaikan email ini jika Anda tidak mengenal pengirimnya.`;
  const html = `<p>${inviter} mengundang Anda bergabung ke tim <b>${store}</b> sebagai <b>${roleName}</b>.</p><p><a href="${link}">Terima undangan & buat akun</a></p><p>Tautan berlaku ${INVITE_TTL_HOURS} jam. Abaikan email ini jika Anda tidak mengenal pengirimnya.</p>`;
  return sendMail(to, `Undangan bergabung ke tim ${store}`, html, text);
}

export async function inviteMember(fd: FormData): Promise<ActionResult<{ link: string; emailed: boolean }>> {
  return staffAction("team.manage", async (me) => {
    const data = z
      .object({ email, roleId: z.string().min(1, "Pilih role"), name: z.string().trim().max(100).optional() })
      .parse({ email: str(fd, "email"), roleId: str(fd, "roleId"), name: str(fd, "name") || undefined });
    const role = await assertAssignable(me, data.roleId);
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing && existing.status !== "REMOVED") return { ok: false, error: "Email ini sudah terdaftar sebagai anggota tim.", fieldErrors: { email: "Sudah anggota" } };
    // revoke older pending invites for the same email
    await db.invitation.updateMany({ where: { email: data.email, acceptedAt: null, revokedAt: null }, data: { revokedAt: new Date() } });
    const token = randomToken(32);
    const inv = await db.invitation.create({
      data: {
        email: data.email,
        name: data.name,
        roleId: role.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000),
        invitedById: me.id,
      },
    });
    const link = `${appUrl()}/admin/invite/${token}`;
    const mail = await sendInviteEmail(data.email, link, role.name, me.name);
    await logActivity(me.id, "team.invite", "invitation", inv.id, `${me.name} mengundang ${data.email} sebagai ${role.name}`);
    return {
      ok: true,
      message: mail.sent ? `Undangan terkirim ke ${data.email}.` : `Undangan dibuat. Email belum terkirim (${mail.reason}) — salin tautan undangan.`,
      data: { link, emailed: mail.sent },
    };
  });
}

export async function resendInvitation(id: string): Promise<ActionResult<{ link: string; emailed: boolean }>> {
  return staffAction("team.manage", async (me) => {
    const inv = await db.invitation.findUnique({ where: { id }, include: { role: true } });
    if (!inv || inv.acceptedAt || inv.revokedAt) throw new UserError("Undangan tidak aktif.");
    await assertAssignable(me, inv.roleId);
    const token = randomToken(32);
    await db.invitation.update({
      where: { id },
      data: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000) },
    });
    const link = `${appUrl()}/admin/invite/${token}`;
    const mail = await sendInviteEmail(inv.email, link, inv.role.name, me.name);
    await logActivity(me.id, "team.invite.resend", "invitation", id, `${me.name} memperbarui undangan ${inv.email}`);
    return {
      ok: true,
      message: mail.sent ? "Undangan dikirim ulang." : "Tautan baru dibuat (email belum dikonfigurasi). Salin tautan di bawah.",
      data: { link, emailed: mail.sent },
    };
  });
}

export async function revokeInvitation(id: string): Promise<ActionResult> {
  return staffAction("team.manage", async (me) => {
    const inv = await db.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
    await logActivity(me.id, "team.invite.revoke", "invitation", id, `${me.name} membatalkan undangan ${inv.email}`);
    return { ok: true, message: "Undangan dibatalkan." };
  });
}

/** Owner/manager creates an account directly with a temporary password (shared privately with the member). */
export async function createMemberAccount(fd: FormData): Promise<ActionResult> {
  return staffAction("team.manage", async (me) => {
    const data = z
      .object({ email, name: z.string().trim().min(2).max(100), roleId: z.string().min(1, "Pilih role"), password: z.string().refine(passwordOk, PASSWORD_RULE) })
      .parse({ email: str(fd, "email"), name: str(fd, "name"), roleId: str(fd, "roleId"), password: str(fd, "password") });
    const role = await assertAssignable(me, data.roleId);
    const existing = await db.user.findUnique({ where: { email: data.email } });
    if (existing && existing.status !== "REMOVED") return { ok: false, error: "Email sudah terdaftar.", fieldErrors: { email: "Sudah terdaftar" } };
    const passwordHash = await hashPassword(data.password);
    const u = existing
      ? await db.user.update({ where: { id: existing.id }, data: { name: data.name, passwordHash, roleId: role.id, status: "ACTIVE", sessionVersion: { increment: 1 } } })
      : await db.user.create({ data: { email: data.email, name: data.name, passwordHash, roleId: role.id } });
    await logActivity(me.id, "team.create", "user", u.id, `${me.name} membuat akun ${u.name} (${role.name})`);
    return { ok: true, message: `Akun ${u.name} dibuat. Bagikan password sementara secara pribadi.` };
  });
}

export async function updateMember(fd: FormData): Promise<ActionResult> {
  return staffAction("team.manage", async (me) => {
    const u = await targetMember(me, str(fd, "id"));
    const roleId = str(fd, "roleId");
    const name = str(fd, "name");
    const role = await assertAssignable(me, roleId);
    await db.user.update({
      where: { id: u.id },
      data: { name: name.length >= 2 ? name : u.name, roleId: role.id },
    });
    if (role.id !== u.roleId)
      await logActivity(me.id, "team.role", "user", u.id, `${me.name} mengubah role ${u.name}: ${u.role.name} → ${role.name}`);
    return { ok: true, message: "Anggota diperbarui." };
  });
}

export async function setMemberStatus(id: string, status: "ACTIVE" | "SUSPENDED"): Promise<ActionResult> {
  return staffAction("team.manage", async (me) => {
    const u = await targetMember(me, id);
    await db.user.update({ where: { id: u.id }, data: { status, sessionVersion: { increment: 1 } } });
    await logActivity(me.id, status === "SUSPENDED" ? "team.suspend" : "team.activate", "user", u.id, `${me.name} ${status === "SUSPENDED" ? "menonaktifkan" : "mengaktifkan kembali"} ${u.name}`);
    return { ok: true, message: status === "SUSPENDED" ? `${u.name} dinonaktifkan dan dikeluarkan dari semua sesi.` : `${u.name} aktif kembali.` };
  });
}

/** Soft-remove: keeps the audit trail (who added which product) intact while revoking all access. */
export async function removeMember(id: string): Promise<ActionResult> {
  return staffAction("team.manage", async (me) => {
    const u = await targetMember(me, id);
    await db.user.update({ where: { id: u.id }, data: { status: "REMOVED", sessionVersion: { increment: 1 } } });
    await logActivity(me.id, "team.remove", "user", u.id, `${me.name} menghapus ${u.name} dari tim`);
    return { ok: true, message: `${u.name} dihapus dari tim.` };
  });
}

export async function saveRole(fd: FormData): Promise<ActionResult> {
  return staffAction("team.manage", async (me) => {
    const id = str(fd, "id");
    const name = z.string().trim().min(2, "Nama role minimal 2 karakter").max(50).parse(str(fd, "name"));
    const description = str(fd, "description").slice(0, 200) || null;
    const keys = fd.getAll("permissions").map(String).filter((k) => (ALL_PERMISSION_KEYS as string[]).includes(k));
    if (!me.isOwner) {
      const missing = keys.filter((k) => !me.permissions.has(k));
      if (missing.length) throw new UserError("Anda tidak dapat memberikan izin yang tidak Anda miliki.");
    }
    const perms = await db.permission.findMany({ where: { key: { in: keys } } });
    if (id) {
      const role = await db.role.findUnique({ where: { id } });
      if (!role) throw new UserError("Role tidak ditemukan.");
      if (role.isOwner) throw new UserError("Izin role Owner tidak dapat diubah.");
      await db.$transaction([
        db.rolePermission.deleteMany({ where: { roleId: id } }),
        db.role.update({
          where: { id },
          data: { name, description, permissions: { create: perms.map((p) => ({ permissionId: p.id })) } },
        }),
      ]);
      await logActivity(me.id, "team.role.update", "role", id, `${me.name} memperbarui izin role ${name}`, { permissions: keys });
      return { ok: true, message: `Role ${name} diperbarui.` };
    }
    let slug = slugify(name) || "role";
    if (await db.role.findUnique({ where: { slug } })) slug = `${slug}-${randomToken(3).toLowerCase()}`;
    if (await db.role.findUnique({ where: { name } })) return { ok: false, error: "Nama role sudah dipakai.", fieldErrors: { name: "Sudah dipakai" } };
    const role = await db.role.create({
      data: { name, slug, description, permissions: { create: perms.map((p) => ({ permissionId: p.id })) } },
    });
    await logActivity(me.id, "team.role.create", "role", role.id, `${me.name} membuat role kustom ${name}`, { permissions: keys });
    return { ok: true, message: `Role ${name} dibuat.`, redirect: "/admin/roles" };
  });
}

export async function deleteRole(id: string): Promise<ActionResult> {
  return staffAction("team.manage", async (me) => {
    const role = await db.role.findUnique({ where: { id }, include: { _count: { select: { users: { where: { status: { not: "REMOVED" } } } } } } });
    if (!role) throw new UserError("Role tidak ditemukan.");
    if (role.isSystem) throw new UserError("Role bawaan tidak dapat dihapus.");
    if (role._count.users > 0) throw new UserError("Pindahkan anggota ke role lain sebelum menghapus role ini.");
    const removedUsers = await db.user.count({ where: { roleId: id } });
    if (removedUsers > 0 || (await db.invitation.count({ where: { roleId: id } })) > 0) {
      throw new UserError("Role ini masih tercatat pada riwayat anggota/undangan dan tidak dapat dihapus.");
    }
    await db.role.delete({ where: { id } });
    await logActivity(me.id, "team.role.delete", "role", id, `${me.name} menghapus role ${role.name}`);
    return { ok: true, message: "Role dihapus." };
  });
}

/** Only the Owner can hand over ownership. The previous owner becomes Manager. */
export async function transferOwnership(fd: FormData): Promise<ActionResult> {
  return staffAction(null, async (me) => {
    if (!me.isOwner) throw new UserError("Hanya Owner yang dapat mentransfer kepemilikan.");
    if (str(fd, "confirm") !== "TRANSFER") throw new UserError('Ketik "TRANSFER" untuk konfirmasi.');
    const target = await db.user.findUnique({ where: { id: str(fd, "userId") } });
    if (!target || target.status !== "ACTIVE" || target.id === me.id) throw new UserError("Pilih anggota aktif lain.");
    const ownerRole = await db.role.findFirstOrThrow({ where: { isOwner: true } });
    const managerRole = await db.role.findUniqueOrThrow({ where: { slug: "manager" } });
    await db.$transaction([
      db.user.update({ where: { id: target.id }, data: { roleId: ownerRole.id, sessionVersion: { increment: 1 } } }),
      db.user.update({ where: { id: me.id }, data: { roleId: managerRole.id } }),
    ]);
    await logActivity(me.id, "store.ownership", "user", target.id, `${me.name} mentransfer kepemilikan toko ke ${target.name}`);
    return { ok: true, message: `Kepemilikan dipindahkan ke ${target.name}.`, redirect: "/admin" };
  });
}

export async function resetMemberPassword(fd: FormData): Promise<ActionResult> {
  return staffAction("team.manage", async (me) => {
    const u = await targetMember(me, str(fd, "id"));
    const pw = str(fd, "password");
    if (!passwordOk(pw)) return { ok: false, error: PASSWORD_RULE, fieldErrors: { password: PASSWORD_RULE } };
    await db.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(pw), sessionVersion: { increment: 1 } } });
    await logActivity(me.id, "team.password", "user", u.id, `${me.name} mereset password ${u.name}`);
    return { ok: true, message: `Password ${u.name} direset. Bagikan secara pribadi.` };
  });
}
