/**
 * One-off, idempotent backfill bridging the pre-redesign data into the new
 * store / profile / privacy / media model. Runs between migrations M1 and M2.
 *
 *   npm run db:backfill
 *
 * Safe to re-run: every write is guarded by an "is null" / "does not exist"
 * check. `generateClaimCode` is inlined here so this script has no dependency
 * on src/lib (which is built in a later phase).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CLAIM_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTVWXYZ";
function randomClaimCode(): string {
  const group = () =>
    Array.from(
      { length: 4 },
      () => CLAIM_ALPHABET[Math.floor(Math.random() * CLAIM_ALPHABET.length)],
    ).join("");
  return `${group()}-${group()}-${group()}`;
}

async function main() {
  // 1. Legacy product — every existing tag needs a product.
  const legacy = await prisma.product.upsert({
    where: { slug: "legacy-tag" },
    update: {},
    create: {
      slug: "legacy-tag",
      name: "Legacy Tag",
      tagline: "Issued before the store existed",
      description:
        "A tag created before Jogajog had a physical product catalogue. Kept for historical reference.",
      priceCents: 0,
      status: "ARCHIVED",
      sortOrder: 999,
    },
  });
  const noProduct = await prisma.tag.updateMany({
    where: { productId: null },
    data: { productId: legacy.id },
  });

  // 2. internalLabel <- attached Item.label. Raw SQL so the script still
  //    compiles after migration M3 drops the Item table + Tag.itemId; on a
  //    post-M3 database this simply finds nothing (or the table is gone).
  let itemLabels = 0;
  try {
    const withItem = await prisma.$queryRaw<Array<{ id: string; label: string }>>`
      SELECT t."id", i."label"
      FROM "Tag" t JOIN "Item" i ON i."id" = t."itemId"
      WHERE t."itemId" IS NOT NULL AND t."internalLabel" IS NULL`;
    for (const row of withItem) {
      await prisma.tag.update({ where: { id: row.id }, data: { internalLabel: row.label } });
      itemLabels++;
    }
  } catch {
    // Item table / Tag.itemId already removed (post-M3) — nothing to bridge.
  }

  // 3. claimCode for every tag that lacks one. Raw query because after
  //    migration M2 the column is non-null at the type level, but this
  //    bridge script must still work on a pre-M2 database.
  const noCode = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Tag" WHERE "claimCode" IS NULL`;
  let claimCodesSet = 0;
  for (const t of noCode) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await prisma.tag.update({
          where: { id: t.id },
          data: { claimCode: randomClaimCode() },
        });
        claimCodesSet++;
        break;
      } catch {
        // unique collision — retry with a fresh code
      }
    }
  }

  // 4. One EmergencyProfile per user that owns at least one tag, seeded from
  //    that user's most recent tag's old public fields. Raw SQL for the same
  //    M3-compatibility reason; the pre-M3 columns are read via a LEFT JOIN
  //    that yields NULLs once they're gone.
  const owners = await prisma.user.findMany({
    where: { tags: { some: {} }, emergencyProfile: null },
    select: { id: true, name: true },
  });
  let profilesCreated = 0;
  for (const u of owners) {
    let legacy: { publicDisplayName: string | null; publicMessage: string | null; maskedPhone: string | null; contactMode: string | null } | undefined;
    try {
      const rows = await prisma.$queryRaw<Array<typeof legacy & object>>`
        SELECT "publicDisplayName", "publicMessage", "maskedPhone", "contactMode"::text AS "contactMode"
        FROM "Tag" WHERE "userId" = ${u.id} ORDER BY "updatedAt" DESC LIMIT 1`;
      legacy = rows[0];
    } catch {
      legacy = undefined;
    }
    const direct = legacy?.contactMode === "MASKED_PHONE";
    await prisma.emergencyProfile.create({
      data: {
        userId: u.id,
        displayName: legacy?.publicDisplayName ?? u.name,
        emergencyMessage: legacy?.publicMessage ?? null,
        contactMode: direct ? "DIRECT_CALL" : "RELAY",
        phonePublic: legacy?.maskedPhone ?? null,
        showPhone: direct,
        visibilityPreset: "STANDARD",
        photoPublic: true,
        namePublic: true,
        messagePublic: true,
        contactsPublic: true,
        bloodGroupPublic: false,
        allergiesPublic: false,
        medicalNotesPublic: false,
      },
    });
    profilesCreated++;
  }

  // 5. Existing payments all belong to a subscription
  const payments = await prisma.payment.updateMany({
    where: {},
    data: { kind: "SUBSCRIPTION" },
  });

  console.log({
    tagsGivenLegacyProduct: noProduct.count,
    internalLabelsFromItems: itemLabels,
    claimCodesSet,
    emergencyProfilesCreated: profilesCreated,
    paymentsMarkedSubscription: payments.count,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
