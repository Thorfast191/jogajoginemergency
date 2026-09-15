import { prisma } from "@/lib/prisma";
import { deliver } from "./transport";
import {
  renderRelayMessage,
  renderScan,
  renderPasswordReset,
  renderSubscriptionExpiring,
  renderQrReminder,
  type Rendered,
} from "./render";

export { isConfigured } from "./transport";

type Kind =
  | "SCAN"
  | "RELAY_MESSAGE"
  | "PASSWORD_RESET"
  | "SUBSCRIPTION_EXPIRING"
  | "QR_GENERATION_REMINDER";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Write the message to the outbox, then try to send it.
 *
 * Recorded first so a delivery failure is visible and retryable instead of
 * vanishing. Sending never throws to the caller: a finder pressing "send"
 * should not see an error because our mail host is down — their message is
 * already saved, and the outbox row carries the failure.
 */
async function send(
  kind: Kind,
  to: string,
  message: Rendered,
  userId?: string | null,
): Promise<void> {
  const log = await prisma.notificationLog.create({
    data: { kind, toEmail: to, subject: message.subject, userId: userId ?? null },
    select: { id: true },
  });

  try {
    await deliver(to, message);
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "SENT", sentAt: new Date() },
    });
  } catch (e) {
    const error = e instanceof Error ? e.message.slice(0, 300) : "Unknown transport error";
    console.error(`[notify] delivery failed (${kind} -> ${to}):`, error);
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error },
    });
  }
}

export async function notifyOwnerOfScan(params: {
  userId: string;
  ownerEmail: string;
  tagId: string;
  tagLabel: string;
  scannedAt: Date;
  approxLocation: string | null;
}): Promise<void> {
  await send(
    "SCAN",
    params.ownerEmail,
    renderScan({
      tagLabel: params.tagLabel,
      scannedAt: params.scannedAt,
      approxLocation: params.approxLocation,
      dashboardUrl: `${appUrl()}/dashboard/tags/${params.tagId}`,
    }),
    params.userId,
  );
}

export async function notifyOwnerOfRelayMessage(params: {
  userId: string;
  ownerEmail: string;
  tagLabel: string;
  finderContact: string;
  message: string;
}): Promise<void> {
  await send(
    "RELAY_MESSAGE",
    params.ownerEmail,
    renderRelayMessage({
      tagLabel: params.tagLabel,
      finderContact: params.finderContact,
      message: params.message,
      dashboardUrl: `${appUrl()}/dashboard/messages`,
    }),
    params.userId,
  );
}

export async function notifyPasswordReset(params: {
  email: string;
  resetUrl: string;
}): Promise<void> {
  await send("PASSWORD_RESET", params.email, renderPasswordReset({ resetUrl: params.resetUrl }));
}

/** Stickers are printed with the QR in them; this tells a customer we're waiting on theirs. */
export async function notifyQrGenerationNeeded(params: {
  userId: string;
  email: string;
  count: number;
}): Promise<void> {
  await send(
    "QR_GENERATION_REMINDER",
    params.email,
    renderQrReminder({ count: params.count, tagsUrl: `${appUrl()}/dashboard/tags` }),
    params.userId,
  );
}

export async function notifySubscriptionExpiring(params: {
  userId: string;
  email: string;
  daysLeft: number;
}): Promise<void> {
  await send(
    "SUBSCRIPTION_EXPIRING",
    params.email,
    renderSubscriptionExpiring({
      daysLeft: params.daysLeft,
      renewUrl: `${appUrl()}/dashboard/subscription`,
    }),
    params.userId,
  );
}
