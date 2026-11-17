import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaffPage } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/constants";
import { fmtDateTime } from "@/lib/format";
import { Badge, PageHeader, Panel } from "@/components/admin/ui";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { changeOwnPassword, updateOwnProfile } from "@/app/admin/actions/auth";

export const metadata: Metadata = { title: "My Account" };

export default async function MyAccount() {
  const me = await requireStaffPage();
  const [u, mine] = await Promise.all([
    db.user.findUniqueOrThrow({ where: { id: me.id } }),
    db.activityLog.findMany({ where: { userId: me.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  return (
    <>
      <PageHeader title="My Account" description={`${me.email} · ${me.role.name}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Profil">
          <ActionForm action={updateOwnProfile} className="space-y-4">
            <Field label="Nama" name="name" defaultValue={u.name} required />
            <Field label="Telepon" name="phone" defaultValue={u.phone ?? ""} />
            <SubmitButton>Simpan</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="Ganti password">
          <ActionForm action={changeOwnPassword} reset className="space-y-4">
            <Field label="Password saat ini" name="current" type="password" required autoComplete="current-password" />
            <Field label="Password baru" name="password" type="password" required autoComplete="new-password" hint="Minimal 8 karakter, huruf & angka." />
            <SubmitButton>Ganti password</SubmitButton>
          </ActionForm>
        </Panel>
        <Panel title="Izin akses Anda">
          <div className="flex flex-wrap gap-1.5">
            {PERMISSIONS.filter((p) => me.isOwner || me.permissions.has(p.key)).map((p) => (
              <Badge key={p.key} tone="green">
                {p.label}
              </Badge>
            ))}
          </div>
        </Panel>
        <Panel title="Aktivitas terakhir saya">
          <ul className="space-y-2 text-sm">
            {mine.map((a) => (
              <li key={a.id}>
                {a.summary} <span className="text-xs text-ink-soft">· {fmtDateTime(a.createdAt)}</span>
              </li>
            ))}
            {!mine.length && <li className="text-ink-soft">Belum ada aktivitas.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
