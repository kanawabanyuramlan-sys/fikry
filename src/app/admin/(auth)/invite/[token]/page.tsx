import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { acceptInvitation } from "@/app/admin/actions/auth";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Terima Undangan", robots: { index: false, follow: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv, s] = await Promise.all([
    db.invitation.findUnique({ where: { tokenHash: sha256(token) }, include: { role: true, invitedBy: { select: { name: true } } } }),
    getSettings(),
  ]);
  const invalid = !inv || !!inv.acceptedAt || !!inv.revokedAt || inv.role.isOwner;
  const expired = inv && inv.expiresAt < new Date();
  return (
    <div className="grid min-h-screen place-items-center bg-brand-off px-4 py-12">
      <div className="card w-full max-w-md p-7">
        <p className="eyebrow">{s["store.name"]} Team</p>
        {invalid || expired ? (
          <>
            <h1 className="mt-2 text-2xl font-extrabold">{expired && !invalid ? "Undangan kedaluwarsa" : "Undangan tidak valid"}</h1>
            <p className="mt-2 text-sm text-ink-soft">
              {expired && !invalid
                ? "Masa berlaku undangan sudah habis. Minta Owner untuk mengirim ulang undangan."
                : "Tautan ini sudah digunakan, dibatalkan, atau salah."}
            </p>
            <Link href="/admin/login" className="btn btn-primary mt-6">
              Ke halaman login
            </Link>
          </>
        ) : (
          <>
            <h1 className="mt-2 text-2xl font-extrabold">Bergabung sebagai {inv.role.name}</h1>
            <p className="mt-2 text-sm text-ink-soft">
              {inv.invitedBy.name} mengundang <b className="text-ink">{inv.email}</b>. Buat password untuk mengaktifkan akun Anda. Berlaku hingga {fmtDateTime(inv.expiresAt)}.
            </p>
            <ActionForm action={acceptInvitation} className="mt-6 space-y-4">
              <input type="hidden" name="token" value={token} />
              <Field label="Email" name="email_ro" value={inv.email} readOnly disabled />
              <Field label="Nama lengkap" name="name" defaultValue={inv.name ?? ""} required autoComplete="name" />
              <Field label="Password" name="password" type="password" required autoComplete="new-password" hint="Minimal 8 karakter, huruf dan angka." />
              <Field label="Ulangi password" name="confirm" type="password" required autoComplete="new-password" />
              <SubmitButton className="btn-primary h-12 w-full">Aktifkan akun</SubmitButton>
            </ActionForm>
          </>
        )}
      </div>
    </div>
  );
}
