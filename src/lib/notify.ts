// Notification stub. Swap this for a real email/SMS provider (e.g. SES,
// Twilio, or a local SMS gateway) — every call site below is already
// isolated to this module.

export async function notifyOwnerOfScan(params: {
  ownerEmail: string;
  tagShortCode: string;
  itemLabel?: string;
  scannedAt: Date;
  approxCity?: string | null;
}) {
  console.log(
    `[notify] scan on tag ${params.tagShortCode} (${params.itemLabel ?? "no item"}) at ${params.scannedAt.toISOString()}${
      params.approxCity ? ` near ${params.approxCity}` : ""
    } — would email ${params.ownerEmail}`
  );
}

export async function notifyPasswordReset(params: { email: string; resetUrl: string }) {
  console.log(`[notify] password reset requested for ${params.email} — would email link: ${params.resetUrl}`);
}

export async function notifyOwnerOfRelayMessage(params: {
  ownerEmail: string;
  tagShortCode: string;
  finderContact: string;
  message: string;
}) {
  console.log(
    `[notify] relay message on tag ${params.tagShortCode} from ${params.finderContact}: "${params.message}" — would email ${params.ownerEmail}`
  );
}
