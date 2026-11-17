import nodemailer from "nodemailer";

export type MailResult = { sent: boolean; reason?: string };

/** Sends mail via SMTP when configured. Without SMTP it logs and reports `sent: false` — never pretends. */
export async function sendMail(to: string, subject: string, html: string, text: string): Promise<MailResult> {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.info(`[mail:not-sent] SMTP not configured. To: ${to} · ${subject}\n${text}`);
    return { sent: false, reason: "SMTP belum dikonfigurasi" };
  }
  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, html, text });
    return { sent: true };
  } catch (e) {
    console.error("[mail:error]", e);
    return { sent: false, reason: "Gagal mengirim email" };
  }
}

export const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
