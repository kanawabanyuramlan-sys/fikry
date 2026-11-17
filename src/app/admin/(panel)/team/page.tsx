import type { Metadata } from "next";
import Link from "next/link";
import { History } from "@/components/icons";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { fmtDateTime, initials, timeAgo } from "@/lib/format";
import { Badge, Empty, PageHeader, Panel, TableWrap } from "@/components/admin/ui";
import { ActionButton, ActionForm, Field, Select, SubmitButton } from "@/components/forms";
import { CreateAccountForm, InviteForm, MemberRoleForm, ResendButton, ResetPasswordForm } from "@/components/admin/team-client";
import { removeMember, revokeInvitation, setMemberStatus, transferOwnership } from "@/app/admin/actions/team";

export const metadata: Metadata = { title: "Team Management" };

export default async function TeamPage() {
  const me = await requireStaffPage("team.view");
  const manage = can(me, "team.manage");
  const [members, invites, roles, counts] = await Promise.all([
    db.user.findMany({
      where: { status: { not: "REMOVED" } },
      orderBy: [{ role: { isOwner: "desc" } }, { createdAt: "asc" }],
      include: { role: true },
    }),
    db.invitation.findMany({
      where: { acceptedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
      include: { role: true, invitedBy: { select: { name: true } } },
    }),
    db.role.findMany({ where: { isOwner: false }, orderBy: [{ isSystem: "desc" }, { name: "asc" }], include: { permissions: { include: { permission: true } } } }),
    db.activityLog.groupBy({ by: ["userId"], _count: true }),
  ]);
  // non-owners can only assign roles within their own permission set
  const assignable = roles
    .filter((r) => me.isOwner || r.permissions.every((p) => me.permissions.has(p.permission.key)))
    .map((r) => ({ id: r.id, name: r.name }));
  const actCount = (id: string) => counts.find((c) => c.userId === id)?._count ?? 0;
  const now = new Date();

  return (
    <>
      <PageHeader
        title="Team Management"
        description="Semua anggota bekerja di satu toko dan satu database produk & pesanan, dengan izin sesuai role masing-masing."
        actions={
          <Link href="/admin/roles" className="btn btn-outline btn-sm">
            Roles & Permissions
          </Link>
        }
      />

      {manage && (
        <Panel title="Invite team members" description="Undangan dikirim via email, berisi tautan sekali pakai yang kedaluwarsa dalam 72 jam." className="mb-6">
          <InviteForm roles={assignable} />
          <div className="mt-4 border-t border-ink/[.07] pt-4">
            <CreateAccountForm roles={assignable} />
          </div>
        </Panel>
      )}

      <Panel title={`Team members (${members.length})`} description="Kelola role, izin dan akses akun anggota." pad={false} className="mb-6">
        <TableWrap>
          <table className="table-x">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Role</th>
                <th>Status</th>
                <th>Login terakhir</th>
                <th className="text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {members.map((u) => {
                const self = u.id === me.id;
                const editable = manage && !u.role.isOwner && !self;
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-light text-xs font-bold text-brand-dark">{initials(u.name)}</span>
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {u.name} {self && <span className="text-xs font-normal text-ink-soft">(Anda)</span>}
                          </p>
                          <p className="truncate text-xs text-ink-soft">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {editable ? (
                        <MemberRoleForm id={u.id} name={u.name} roleId={u.roleId} roles={assignable.some((r) => r.id === u.roleId) ? assignable : [...assignable, { id: u.roleId, name: u.role.name }]} />
                      ) : (
                        <Badge tone={u.role.isOwner ? "dark" : "green"}>{u.role.name}</Badge>
                      )}
                    </td>
                    <td>{u.status === "ACTIVE" ? <Badge tone="solid">Active</Badge> : <Badge tone="red">Suspended</Badge>}</td>
                    <td className="whitespace-nowrap text-xs text-ink-soft">{u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Belum pernah"}</td>
                    <td>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {can(me, "activity.view") && (
                          <Link href={`/admin/activity?user=${u.id}`} className="btn btn-ghost btn-sm" title="Lihat aktivitas">
                            <History className="h-3.5 w-3.5" /> {actCount(u.id)}
                          </Link>
                        )}
                        {editable && (
                          <>
                            <ResetPasswordForm id={u.id} />
                            {u.status === "ACTIVE" ? (
                              <ActionButton action={setMemberStatus.bind(null, u.id, "SUSPENDED")} confirm={`Nonaktifkan ${u.name}? Semua sesi login akan dikeluarkan.`} className="btn-outline btn-sm">
                                Suspend
                              </ActionButton>
                            ) : (
                              <ActionButton action={setMemberStatus.bind(null, u.id, "ACTIVE")} className="btn-outline btn-sm">
                                Activate
                              </ActionButton>
                            )}
                            <ActionButton action={removeMember.bind(null, u.id)} confirm={`Hapus ${u.name} dari tim? Riwayat aktivitasnya tetap disimpan.`} className="btn-ghost btn-sm text-sale">
                              Remove
                            </ActionButton>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Panel>

      <Panel title={`Pending invitations (${invites.length})`} pad={false} className="mb-6">
        {invites.length ? (
          <TableWrap>
            <table className="table-x">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Diundang oleh</th>
                  <th>Berlaku sampai</th>
                  <th className="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td className="font-semibold">{i.email}</td>
                    <td>
                      <Badge tone="green">{i.role.name}</Badge>
                    </td>
                    <td className="text-xs text-ink-soft">{i.invitedBy.name}</td>
                    <td className="whitespace-nowrap text-xs">{i.expiresAt < now ? <Badge tone="red">Kedaluwarsa</Badge> : fmtDateTime(i.expiresAt)}</td>
                    <td>
                      {manage && (
                        <div className="flex flex-wrap items-start justify-end gap-2">
                          <ResendButton id={i.id} />
                          <ActionButton action={revokeInvitation.bind(null, i.id)} confirm="Batalkan undangan ini?" className="btn-ghost btn-sm text-sale">
                            Revoke
                          </ActionButton>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <Empty title="Tidak ada undangan tertunda" />
        )}
      </Panel>

      {me.isOwner && (
        <Panel title="Transfer ownership" description="Hanya Owner yang dapat memindahkan kepemilikan toko. Anda akan menjadi Manager setelahnya.">
          <ActionForm action={transferOwnership} confirm="Yakin memindahkan kepemilikan toko? Tindakan ini mengubah akses penuh." className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Select
              label="Owner baru"
              name="userId"
              required
              placeholder="Pilih anggota aktif"
              options={members.filter((m) => m.id !== me.id && m.status === "ACTIVE").map((m) => ({ value: m.id, label: `${m.name} (${m.role.name})` }))}
            />
            <Field label='Ketik "TRANSFER"' name="confirm" required autoComplete="off" />
            <SubmitButton className="btn-danger">Transfer</SubmitButton>
          </ActionForm>
        </Panel>
      )}
    </>
  );
}
