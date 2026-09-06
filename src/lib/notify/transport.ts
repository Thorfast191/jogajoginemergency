import nodemailer, { type Transporter } from "nodemailer";
import type { Rendered } from "./render";

// SMTP if configured, console otherwise.
//
// The fallback is deliberate: the app has to stay runnable locally without mail
// credentials, and a developer should be able to read what would have been
// sent. `isConfigured()` is what the rest of the app checks before promising a
// customer that mail is on its way.

let cached: Transporter | null = null;

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function isConfigured(): boolean {
  return Boolean(env("SMTP_HOST") && env("SMTP_USER") && env("SMTP_PASSWORD"));
}

export function fromAddress(): string {
  return env("MAIL_FROM") ?? "Jogajog Emergency <no-reply@jogajog.app>";
}

function transporter(): Transporter {
  if (cached) return cached;
  const port = Number(env("SMTP_PORT") ?? 587);
  cached = nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port,
    // Port 465 is implicit TLS; everything else negotiates STARTTLS.
    secure: port === 465,
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASSWORD") },
  });
  return cached;
}

/** Deliver one message. Throws on failure so the caller can record it. */
export async function deliver(to: string, message: Rendered): Promise<void> {
  if (!isConfigured()) {
    console.log(
      `[notify] (no SMTP configured) to=${to} subject="${message.subject}"\n${message.text}`,
    );
    return;
  }
  await transporter().sendMail({
    from: fromAddress(),
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
