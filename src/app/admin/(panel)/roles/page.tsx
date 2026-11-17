import type { Metadata } from "next";
import { db } from "@/lib/db";
import { can, requireStaffPage } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/constants";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { ActionButton, ActionForm, Field, SubmitButton } from "@/components/forms";
import { deleteRole, saveRole } from "@/app/admin/actions/team";

export const metadata: Metadata = { title: "Roles & Permissions" };

const GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];

function PermissionGrid({ selected, disabled, allowed }: { selected: Set<string>; disabled?: boolean; allowed: (k: string) => boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {GROUPS.map((g) => (
        <fieldset key={g} className="rounded-xl border border-ink/10 p-3">
          <legend className="px-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">{g}</legend>
          {PERMISSIONS.filter((p) => p.group === g).map((p) => (
            <label key={p.key} className="flex items-start gap-2 py-1 text-sm">
              <input
                type="checkbox"
                name="permissions"
                value={p.key}
                defaultChecked={selected.has(p.key)}
                disabled={disabled || !allowed(p.key)}
                className="mt-0.5 h-4 w-4 accent-brand-dark"
              />
              <span>
                {p.label}
                <span className="block font-mono text-[10px] text-ink-soft">{p.key}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}

export default async function RolesPage() {
  const me = await requireStaffPage("team.view");
  const manage = can(me, "team.manage");
  const roles = await db.role.findMany({
    orderBy: [{ isOwner: "desc" }, { isSystem: "desc" }, { createdAt: "asc" }],
    include: { permissions: { include: { permission: true } }, _count: { select: { users: { where: { status: { not: "REMOVED" } } } } } },
  });
  const allowed = (k: string) => me.isOwner || me.permissions.has(k);

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        back={{ href: "/admin/team", label: "Team Management" }}
        description="Izin diterapkan di server untuk setiap halaman dan aksi — bukan hanya menyembunyikan tombol."
      />
      {manage && (
        <Panel title="Create custom role" description="Buat jabatan baru dan tentukan izinnya." className="mb-6">
          <ActionForm action={saveRole} reset className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nama role" name="name" required placeholder="Contoh: Content Creator" />
              <Field label="Deskripsi" name="description" placeholder="Tugas utama role ini" />
            </div>
            <PermissionGrid selected={new Set()} allowed={allowed} />
            <SubmitButton>Create role</SubmitButton>
          </ActionForm>
        </Panel>
      )}
      <div className="space-y-4">
        {roles.map((r) => {
          const selected = new Set(r.isOwner ? PERMISSIONS.map((p) => p.key) : r.permissions.map((p) => p.permission.key));
          return (
            <details key={r.id} className="card group" open={false}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-5">
                <span className="text-base font-bold">{r.name}</span>
                {r.isOwner ? <Badge tone="dark">Full access</Badge> : r.isSystem ? <Badge tone="green">Default</Badge> : <Badge tone="blue">Custom</Badge>}
                <span className="text-xs text-ink-soft">{r._count.users} anggota · {selected.size} izin</span>
                <span className="ml-auto text-xs font-semibold text-brand-dark group-open:hidden">Lihat / ubah</span>
                {r.description && <p className="w-full text-sm text-ink-soft">{r.description}</p>}
              </summary>
              <div className="border-t border-ink/[.07] p-5">
                {r.isOwner ? (
                  <p className="text-sm text-ink-soft">Owner selalu memiliki seluruh izin, termasuk satu-satunya yang dapat mentransfer kepemilikan toko.</p>
                ) : (
                  <ActionForm action={saveRole} className="space-y-4">
                    <input type="hidden" name="id" value={r.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nama role" name="name" defaultValue={r.name} required disabled={!manage} />
                      <Field label="Deskripsi" name="description" defaultValue={r.description ?? ""} disabled={!manage} />
                    </div>
                    <PermissionGrid selected={selected} disabled={!manage} allowed={allowed} />
                    {manage && (
                      <div className="flex gap-2">
                        <SubmitButton>Save permissions</SubmitButton>
                        {!r.isSystem && (
                          <ActionButton action={deleteRole.bind(null, r.id)} confirm={`Hapus role ${r.name}?`} className="btn-ghost text-sale">
                            Delete role
                          </ActionButton>
                        )}
                      </div>
                    )}
                  </ActionForm>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}
