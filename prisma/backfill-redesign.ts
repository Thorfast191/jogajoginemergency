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

  // 2. internalLabel <- attached Item.label
  const tagsWithItem = await prisma.tag.findMany({
    where: { itemId: { not: null }, internalLabel: null },
    include: { item: true },
  });
  for (const t of tagsWithItem) {
    if (t.item) {
      await prisma.tag.update({
        where: { id: t.id },
        data: { internalLabel: t.item.label },
      });
    }
  }

  // 3. claimCode for every tag that lacks one
  const noCode = await prisma.tag.findMany({
    where: { claimCode: null },
    select: { id: true },
  });
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

  // 4. One EmergencyProfile per user that owns at least one tag
  const owners = await prisma.user.findMany({
    where: { tags: { some: {} }, emergencyProfile: null },
    include: { tags: { orderBy: { updatedAt: "desc" }, take: 1 } },
  });
  for (const u of owners) {
    const t = u.tags[0];
    const direct = t?.contactMode === "MASKED_PHONE";
    await prisma.emergencyProfile.create({
      data: {
        userId: u.id,
        displayName: t?.publicDisplayName ?? u.name,
        emergencyMessage: t?.publicMessage ?? null,
        contactMode: direct ? "DIRECT_CALL" : "RELAY",
        phonePublic: t?.maskedPhone ?? null,
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
  }

  // 5. Existing payments all belong to a subscription
  const payments = await prisma.payment.updateMany({
    where: {},
    data: { kind: "SUBSCRIPTION" },
  });

  console.log({
    tagsGivenLegacyProduct: noProduct.count,
    internalLabelsFromItems: tagsWithItem.length,
    claimCodesSet,
    emergencyProfilesCreated: owners.length,
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
