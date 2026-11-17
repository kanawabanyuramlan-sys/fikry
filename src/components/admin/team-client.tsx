"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Mail, Loader2, UserPlus, KeyRound } from "@/components/icons";
import { ActionForm, Field, Select, SubmitButton } from "@/components/forms";
import { useToast } from "@/components/providers/toast";
import { createMemberAccount, inviteMember, resendInvitation, updateMember, resetMemberPassword } from "@/app/admin/actions/team";
import type { ActionResult } from "@/lib/action";

function CopyLink({ link, emailed }: { link: string; emailed: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-4 rounded-xl border border-brand/30 bg-brand-light p-3 text-sm">
      <p className="font-semibold text-brand-dark">{emailed ? "Email undangan terkirim. Tautan cadangan:" : "Bagikan tautan undangan ini secara pribadi (berlaku 72 jam):"}</p>
      <div className="mt-2 flex gap-2">
        <input readOnly value={link} className="input bg-card font-mono text-xs" onFocus={(e) => e.target.select()} aria-label="Tautan undangan" />
        <button
          type="button"
          className="btn btn-dark btn-sm shrink-0"
          onClick={() => {
            navigator.clipboard?.writeText(link).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
    </div>
  );
}

export function InviteForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [result, setResult] = useState<{ link: string; emailed: boolean } | null>(null);
  return (
    <div>
      <ActionForm
        action={inviteMember}
        reset
        onDone={(r) => setResult(r.data as { link: string; emailed: boolean })}
        className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end"
      >
        <Field label="Email anggota" name="email" type="email" required placeholder="pikry@example.com" />
        <Field label="Nama (opsional)" name="name" placeholder="Pikry" />
        <Select label="Role" name="roleId" required placeholder="Pilih role" options={roles.map((r) => ({ value: r.id, label: r.name }))} />
        <SubmitButton className="btn-primary h-[42px]">
          <Mail className="h-4 w-4" /> Send invite
        </SubmitButton>
      </ActionForm>
      {result && <CopyLink {...result} />}
    </div>
  );
}

export function CreateAccountForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" /> Create account directly
      </button>
    );
  return (
    <ActionForm action={createMemberAccount} reset onDone={() => setOpen(false)} className="grid gap-3 rounded-2xl bg-brand-off p-4 sm:grid-cols-2">
      <Field label="Nama" name="name" required />
      <Field label="Email" name="email" type="email" required />
      <Select label="Role" name="roleId" required placeholder="Pilih role" options={roles.map((r) => ({ value: r.id, label: r.name }))} />
      <Field label="Password sementara" name="password" type="text" required minLength={8} hint="Min. 8 karakter, huruf & angka. Minta anggota menggantinya setelah login." autoComplete="off" />
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton>Buat akun</SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Batal
        </button>
      </div>
    </ActionForm>
  );
}

export function ResendButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [res, setRes] = useState<{ link: string; emailed: boolean } | null>(null);
  const toast = useToast();
  const router = useRouter();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn btn-outline btn-sm"
        onClick={() =>
          start(async () => {
            const r: ActionResult<{ link: string; emailed: boolean }> = await resendInvitation(id);
            if (r.ok) {
              toast("success", r.message ?? "OK");
              setRes(r.data ?? null);
              router.refresh();
            } else toast("error", r.error);
          })
        }
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Resend / new link
      </button>
      {res && <CopyLink {...res} />}
    </div>
  );
}

export function MemberRoleForm({ id, name, roleId, roles }: { id: string; name: string; roleId: string; roles: { id: string; name: string }[] }) {
  return (
    <ActionForm action={updateMember} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="name" value={name} />
      <select name="roleId" defaultValue={roleId} className="input w-auto py-1.5 text-xs" aria-label={`Role ${name}`}>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <SubmitButton className="btn-outline btn-sm">Assign</SubmitButton>
    </ActionForm>
  );
}

export function ResetPasswordForm({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)} title="Reset password">
        <KeyRound className="h-3.5 w-3.5" />
      </button>
    );
  return (
    <ActionForm action={resetMemberPassword} reset onDone={() => setOpen(false)} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input name="password" required minLength={8} placeholder="Password baru" className="input w-36 py-1.5 text-xs" autoComplete="off" aria-label="Password baru" />
      <SubmitButton className="btn-outline btn-sm">Set</SubmitButton>
    </ActionForm>
  );
}
