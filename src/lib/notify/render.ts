// Email bodies, built as pure functions so the escaping can be tested.
//
// Two of these carry text a stranger typed — a finder's message and the contact
// they left — straight into the owner's inbox. Mail clients render HTML, so
// anything interpolated into the HTML body is escaped here rather than trusted.

export type Rendered = { subject: string; text: string; html: string };

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape for HTML text and attribute contexts. Ampersand first, or the
 *  replacements would escape each other's entities. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

const FOOT = "Jogajog Emergency";

function layout(heading: string, bodyHtml: string, ctaUrl?: string, ctaLabel?: string): string {
  const cta = ctaUrl
    ? `<p style="margin:24px 0 0"><a href="${escapeHtml(ctaUrl)}" style="background:#0f9d76;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(ctaLabel ?? "Open")}</a></p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1c1917;line-height:1.6;max-width:520px">
<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(heading)}</h1>
${bodyHtml}${cta}
<p style="margin:28px 0 0;font-size:12px;color:#78716c">${FOOT}</p>
</div>`;
}

export function renderRelayMessage(p: {
  tagLabel: string;
  finderContact: string;
  message: string;
  dashboardUrl: string;
}): Rendered {
  // The contact is deliberately kept out of the subject: subjects are shown in
  // lock-screen previews, and this one is a stranger's phone number.
  const subject = `Someone found your ${p.tagLabel}`;
  const text = [
    `Someone scanned your "${p.tagLabel}" tag and left you a message.`,
    "",
    p.message,
    "",
    `Reply to: ${p.finderContact}`,
    "",
    `All your messages: ${p.dashboardUrl}`,
  ].join("\n");
  const html = layout(
    subject,
    `<p style="margin:0 0 12px">Someone scanned your <strong>${escapeHtml(p.tagLabel)}</strong> tag and left you a message.</p>
<blockquote style="margin:0;padding:12px 16px;background:#f6f2ea;border-left:3px solid #0f9d76;border-radius:0 8px 8px 0;white-space:pre-wrap">${escapeHtml(p.message)}</blockquote>
<p style="margin:16px 0 0">Reply to: <strong>${escapeHtml(p.finderContact)}</strong></p>`,
    p.dashboardUrl,
    "See all messages",
  );
  return { subject, text, html };
}

export function renderScan(p: {
  tagLabel: string;
  scannedAt: Date;
  approxLocation: string | null;
  dashboardUrl: string;
}): Rendered {
  const where = p.approxLocation ?? "Unknown location";
  const subject = `Your ${p.tagLabel} tag was just scanned`;
  const text = [
    `Your "${p.tagLabel}" tag was scanned.`,
    "",
    `When:  ${p.scannedAt.toUTCString()}`,
    `Where: ${where}`,
    "",
    "If this wasn't expected, you can mark the tag lost or deactivate it:",
    p.dashboardUrl,
  ].join("\n");
  const html = layout(
    subject,
    `<p style="margin:0 0 12px">Your <strong>${escapeHtml(p.tagLabel)}</strong> tag was scanned.</p>
<p style="margin:0"><strong>When:</strong> ${escapeHtml(p.scannedAt.toUTCString())}<br>
<strong>Where:</strong> ${escapeHtml(where)}</p>
<p style="margin:16px 0 0;color:#78716c;font-size:14px">Location is approximate, and we never store the scanner's IP address.</p>`,
    p.dashboardUrl,
    "Manage this tag",
  );
  return { subject, text, html };
}

export function renderPasswordReset(p: { resetUrl: string }): Rendered {
  const subject = "Reset your Jogajog Emergency password";
  const text = [
    "Use this link to choose a new password. It expires in one hour.",
    "",
    p.resetUrl,
    "",
    "If you didn't ask for this, you can ignore it — nothing has changed.",
  ].join("\n");
  const html = layout(
    subject,
    `<p style="margin:0">Use the button below to choose a new password. The link expires in one hour.</p>
<p style="margin:12px 0 0;color:#78716c;font-size:14px">If you didn&#39;t ask for this, you can ignore it — nothing has changed.</p>`,
    p.resetUrl,
    "Choose a new password",
  );
  return { subject, text, html };
}

export function renderQrReminder(p: { count: number; tagsUrl: string }): Rendered {
  const codes = `${p.count} QR ${p.count === 1 ? "code" : "codes"}`;
  const subject =
    p.count === 1
      ? "Your sticker is waiting for its QR code"
      : "Your stickers are waiting for their QR codes";
  const text = [
    "Thanks for your order! Each sticker is printed with your own QR code in the middle, so we",
    "can't print yours until you've generated them.",
    "",
    `You have ${codes} left to generate:`,
    p.tagsUrl,
    "",
    "It takes a few seconds, and you choose exactly what each one shows.",
  ].join("\n");
  const html = layout(
    subject,
    `<p style="margin:0">Thanks for your order! Each sticker is printed with your own QR code in the middle, so we can&#39;t print yours until you&#39;ve generated them.</p>
<p style="margin:12px 0 0">You have <strong>${escapeHtml(codes)}</strong> left to generate. It takes a few seconds, and you choose exactly what each one shows.</p>`,
    p.tagsUrl,
    "Generate my QR codes",
  );
  return { subject, text, html };
}

export function renderSubscriptionExpiring(p: {
  daysLeft: number;
  renewUrl: string;
}): Rendered {
  const subject =
    p.daysLeft <= 0
      ? "Your emergency page is no longer published"
      : `Your emergency page goes quiet in ${p.daysLeft} ${p.daysLeft === 1 ? "day" : "days"}`;
  const text = [
    p.daysLeft <= 0
      ? "Your subscription has ended, so your QR codes no longer show your information."
      : `Your subscription ends in ${p.daysLeft} ${p.daysLeft === 1 ? "day" : "days"}.`,
    "",
    "Your codes still scan and finders can still message you — but your name, medical",
    "details and contacts stay hidden until you renew.",
    "",
    p.renewUrl,
  ].join("\n");
  const html = layout(
    subject,
    `<p style="margin:0">${
      p.daysLeft <= 0
        ? "Your subscription has ended, so your QR codes no longer show your information."
        : `Your subscription ends in <strong>${p.daysLeft} ${p.daysLeft === 1 ? "day" : "days"}</strong>.`
    }</p>
<p style="margin:12px 0 0">Your codes still scan and finders can still message you — but your name, medical details and contacts stay hidden until you renew.</p>`,
    p.renewUrl,
    "Renew",
  );
  return { subject, text, html };
}
