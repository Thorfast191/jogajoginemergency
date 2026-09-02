import { customAlphabet } from "nanoid";
import type { Prisma } from "@prisma/client";

// Human-friendly order reference. Uppercase unambiguous alphabet (shares the
// shortCode set minus lowercase); collisions are handled by the unique index +
// a retry at the call site.
const nano = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 6);

export function generateOrderNumber(): string {
  return `JJ-${nano()}`;
}

/**
 * Reserve `quantity` inventory tags of `productId` for an order line, inside a
 * transaction. Uses `FOR UPDATE SKIP LOCKED` so two concurrent checkouts never
 * grab the same tag. Throws `Error("OUT_OF_STOCK")` if fewer are available.
 * Returns the reserved tag ids.
 */
export async function allocateTags(
  tx: Prisma.TransactionClient,
  { productId, orderItemId, quantity }: { productId: string; orderItemId: string; quantity: number },
): Promise<string[]> {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Tag"
    WHERE "productId" = ${productId}
      AND "status" = 'UNASSIGNED'::"TagStatus"
      AND "orderItemId" IS NULL
    ORDER BY "createdAt" ASC
    FOR UPDATE SKIP LOCKED
    LIMIT ${quantity}`;

  if (rows.length < quantity) throw new Error("OUT_OF_STOCK");

  const ids = rows.map((r) => r.id);
  const updated = await tx.tag.updateMany({
    where: { id: { in: ids } },
    data: { orderItemId, status: "ALLOCATED" },
  });
  if (updated.count !== quantity) throw new Error("OUT_OF_STOCK");

  return ids;
}
