import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createTag } from "@/lib/tag";
import { canGenerateTag, lineRemaining, nextOpenLine } from "@/lib/slots";
import { paidLineCapacities, slotBalanceForUser } from "@/lib/slots-server";
import { defaultTheme } from "@/lib/theme-access-server";

/**
 * Spending a purchased QR slot on a new code.
 *
 * Two callers, one rule. A paid order goes through `issueTagsForOrder`, which
 * is what makes pressing a button unnecessary in the first place: the codes are
 * waiting when the customer arrives and the order is printable immediately,
 * instead of sitting in the queue until someone notices an email. The customer's
 * own Generate button goes through `issueTagForUser`, for what that leaves over
 * — a slot freed by deleting a code, or an order whose automatic issue failed.
 *
 * Generation carries no choice worth interrupting someone for: the theme comes
 * from the line they bought and the label is optional and editable afterwards.
 *
 * Both paths mint one code per transaction, at Serializable, because counting
 * rows and then inserting one is otherwise unsafe against a second tab doing
 * the same thing: at READ COMMITTED both transactions read the same count, both
 * pass the check, and the account ends up with more codes than it bought.
 */

export type IssueOutcome =
  | { ok: true; tagId: string; shortCode: string }
  | { ok: false; reason: "NO_SLOTS" | "RACED" };

/** Mint one code against the oldest unspent slot on this account. */
export async function issueTagForUser(
  userId: string,
  opts: { internalLabel?: string } = {},
): Promise<IssueOutcome> {
  const balance = await slotBalanceForUser(userId);
  if (!canGenerateTag(balance)) return { ok: false, reason: "NO_SLOTS" };

  // Charge the tag to the oldest paid line that still has an unused slot, so
  // it inherits that purchase's product, theme and provenance. Reading the
  // most recent line instead would hand a second Classic tag the theme of a
  // Night Guardian sticker whose slot was never spent.
  const line = nextOpenLine(await paidLineCapacities(userId));
  if (!line) return { ok: false, reason: "NO_SLOTS" };

  return issueAgainstLine({
    userId,
    orderItemId: line.orderItemId,
    productId: line.productId,
    themeId: line.themeId,
    internalLabel: opts.internalLabel,
  });
}

/**
 * Mint every code an order paid for and hasn't had yet, in the artwork each of
 * its lines was bought in.
 *
 * Scoped to this order's own lines on purpose. Filling every open slot on the
 * account would mean paying for one sticker quietly minted codes for a purchase
 * made months ago — a side effect nobody asked for, on a code whose short link
 * is printed and permanent. Those stay the customer's to generate.
 *
 * Idempotent: it asks each line how much room is left and stops when there is
 * none, so a provider that retries its callback mints nothing the first one did.
 * One transaction per code, so a collision on the last of ten does not undo the
 * other nine.
 */
export async function issueTagsForOrder(orderId: string): Promise<number> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      userId: true,
      status: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          id: true,
          quantity: true,
          themeId: true,
          productId: true,
          product: { select: { qrSlots: true, themeId: true } },
          tags: { select: { isReplacement: true } },
        },
      },
    },
  });
  // Only a paid order grants anything — see src/lib/slots.ts.
  if (!order || order.status !== "PAID") return 0;

  const fallback = await defaultTheme();
  let issued = 0;

  for (const item of order.items) {
    const remaining = lineRemaining({
      orderItemId: item.id,
      productId: item.productId,
      themeId: item.themeId ?? item.product.themeId,
      quantity: item.quantity,
      qrSlots: item.product.qrSlots,
      tagsUsed: item.tags.filter((t) => !t.isReplacement).length,
    });

    for (let i = 0; i < remaining; i++) {
      const result = await issueAgainstLine({
        userId: order.userId,
        orderItemId: item.id,
        productId: item.productId,
        // The artwork the buyer chose, else the product's own, else the branded
        // default — a sticker sold without a theme still gets a readable page.
        themeId: item.themeId ?? item.product.themeId ?? fallback?.id ?? null,
      });
      if (!result.ok) break;
      issued++;
    }
  }

  return issued;
}

/**
 * The one write both paths share: a code charged to a specific order line,
 * with that line's own remaining capacity re-checked inside the transaction.
 *
 * Checking the line rather than the account total is what makes the two paths
 * safe to run at the same time — the Generate button and an order's automatic
 * issue can pick the same line, and only one of them can win it.
 */
async function issueAgainstLine(params: {
  userId: string;
  orderItemId: string | null;
  productId: string | null;
  themeId: string | null;
  internalLabel?: string;
}): Promise<IssueOutcome> {
  const label = params.internalLabel?.trim().slice(0, 100);
  const fallbackTheme = params.themeId ? null : await defaultTheme();

  try {
    const tag = await prisma.$transaction(
      async (tx) => {
        if (params.orderItemId) {
          const line = await tx.orderItem.findUnique({
            where: { id: params.orderItemId },
            select: {
              quantity: true,
              product: { select: { qrSlots: true } },
              _count: { select: { tags: { where: { isReplacement: false } } } },
            },
          });
          if (!line) throw new Error("NO_SLOTS");
          if (line._count.tags >= line.quantity * line.product.qrSlots) {
            throw new Error("NO_SLOTS");
          }
        }

        const created = await createTag(tx, {
          userId: params.userId,
          productId: params.productId,
          orderItemId: params.orderItemId,
          themeId: params.themeId ?? fallbackTheme?.id ?? null,
        });
        if (label) {
          await tx.tag.update({ where: { id: created.id }, data: { internalLabel: label } });
        }
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return { ok: true, tagId: tag.id, shortCode: tag.shortCode };
  } catch (e) {
    if (e instanceof Error && e.message === "NO_SLOTS") return { ok: false, reason: "NO_SLOTS" };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034") {
      return { ok: false, reason: "RACED" };
    }
    throw e;
  }
}
