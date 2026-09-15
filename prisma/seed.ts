import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { renderSvgToWebp } from "../src/lib/media";

const prisma = new PrismaClient();

// --- Placeholder product art ------------------------------------------
// A simple branded card per product until real designs are uploaded via
// /admin/products.
function placeholderSvg(label: string, accent: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
    <rect width="640" height="640" fill="#FBF9F6"/>
    <rect x="140" y="140" width="360" height="360" rx="40" fill="${accent}"/>
    <rect x="210" y="210" width="220" height="220" rx="16" fill="#ffffff"/>
    <rect x="245" y="245" width="150" height="150" fill="${accent}"/>
    <rect x="275" y="275" width="90" height="90" fill="#ffffff"/>
    <text x="320" y="560" text-anchor="middle" font-family="sans-serif" font-size="34" fill="#111">${label}</text>
  </svg>`;
}

// --- Themes ---------------------------------------------------------------
// Every theme here is original. They read as archetypes — a night guardian, a
// web-slinger, a speedster — without copying any licensed character's
// likeness, name or costume. If real characters are ever licensed, add rows.
const THEMES = [
  // The house skin. Every account has this one without buying anything, so it
  // is what a scan page falls back to — see DEFAULT_THEME_SLUG in
  // src/lib/theme-access.ts and DEFAULT_THEME in src/lib/themes.ts, which
  // mirror it. No product carries it; it is not for sale.
  {
    slug: "jogajog-emergency",
    name: "Jogajog Emergency",
    tagline: "🚨 Please scan this QR if it's an emergency",
    bgColor: "#FBF9F6",
    surfaceColor: "#FFFFFF",
    inkColor: "#171717",
    accentColor: "#059669",
    mascot: "BLOB",
    sortOrder: 0,
  },
  {
    slug: "classic",
    name: "Classic",
    tagline: "Calm, clear and unmistakably Jogajog.",
    bgColor: "#FBF9F6",
    surfaceColor: "#FFFFFF",
    inkColor: "#171717",
    accentColor: "#0F9D76",
    mascot: "BLOB",
    sortOrder: 1,
  },
  {
    slug: "sunrise",
    name: "Sunrise",
    tagline: "Warm and cheerful, for everyday things.",
    bgColor: "#FFF7ED",
    surfaceColor: "#FFFFFF",
    inkColor: "#1F2937",
    accentColor: "#EA580C",
    mascot: "BLOB",
    sortOrder: 2,
  },
  {
    slug: "night-guardian",
    name: "Night Guardian",
    tagline: "Caped, watchful, and a little dramatic.",
    bgColor: "#111827",
    surfaceColor: "#1F2937",
    inkColor: "#F9FAFB",
    accentColor: "#FBBF24",
    mascot: "GUARDIAN",
    sortOrder: 3,
  },
  {
    slug: "web-slinger",
    name: "Web Slinger",
    tagline: "Bold red and blue, with a knack for catching things.",
    bgColor: "#FEF2F2",
    surfaceColor: "#FFFFFF",
    inkColor: "#1F2937",
    accentColor: "#DC2626",
    mascot: "WEBBED",
    sortOrder: 4,
  },
  {
    slug: "speedster",
    name: "Speedster",
    tagline: "For things that move faster than you do.",
    bgColor: "#FEFCE8",
    surfaceColor: "#FFFFFF",
    inkColor: "#1F2937",
    accentColor: "#CA8A04",
    mascot: "SPARK",
    sortOrder: 5,
  },
  {
    slug: "good-boy",
    name: "Good Boy",
    tagline: "A loyal companion for collars and kit bags.",
    bgColor: "#F0F9FF",
    surfaceColor: "#FFFFFF",
    inkColor: "#0C4A6E",
    accentColor: "#0284C7",
    mascot: "ROVER",
    sortOrder: 6,
  },
];

const PRODUCTS = [
  {
    slug: "bike-sticker",
    name: "Bike QR Sticker",
    tagline: "For the frame of your daily ride",
    description:
      "A weatherproof QR sticker sized for a bike frame or seat post. If your bike is lost or stolen and recovered, whoever finds it can reach you in seconds — without seeing your phone number.",
    useCase: "Great for commuters, delivery riders, and anyone who parks in public.",
    qrSlots: 1,
    priceCents: 29900,
    sortOrder: 1,
    accent: "#059669",
    themeSlug: "classic",
  },
  {
    slug: "car-sticker",
    name: "Car QR Sticker",
    tagline: "Windshield or dashboard contact tag",
    description:
      "A discreet QR sticker for your windshield or dashboard. Handy for blocked-in parking, minor bumps, or emergencies where someone needs to reach the owner fast.",
    useCase: "Useful for shared parking, road trips, and emergency contact access.",
    qrSlots: 1,
    priceCents: 34900,
    sortOrder: 2,
    accent: "#0EA5E9",
    themeSlug: "sunrise",
  },
  {
    slug: "luggage-sticker",
    name: "Luggage QR Sticker",
    tagline: "Never lose a bag at the airport again",
    description:
      "A tough QR sticker for suitcases, backpacks, and travel bags. A finder scans it and sends you a message through Jogajog — your contact details stay private.",
    useCase: "Made for air travel, hostels, and check-in chaos.",
    qrSlots: 2,
    priceCents: 24900,
    sortOrder: 3,
    accent: "#F98A6B",
    themeSlug: "web-slinger",
  },
  {
    slug: "helmet-sticker",
    name: "Helmet QR Sticker",
    tagline: "Emergency info where first responders look",
    description:
      "A QR sticker for the back of a helmet. In a crash, a responder can scan it to see the emergency information and contacts you chose to make visible.",
    useCase: "For motorcyclists, cyclists, and climbers.",
    qrSlots: 1,
    priceCents: 29900,
    sortOrder: 4,
    accent: "#8B5CF6",
    themeSlug: "night-guardian",
  },
];

async function main() {
  // One paid tier. It unlocks presentation features only — see
  // src/lib/entitlements.ts for what that does and does not cover.
  await prisma.subscriptionPlan.upsert({
    where: { slug: "plus" },
    update: {},
    create: {
      slug: "plus",
      name: "Plus",
      priceCents: 49900,
      currency: "BDT",
      features: [
        "Your emergency page goes live for every QR you have",
        "Blood group, allergies, contacts and portfolio",
        "Any theme, scan history, and the message relay",
      ],
    },
  });

  // Retire the pre-Plus tiers. They are deactivated rather than deleted
  // because existing Subscription rows still reference them, and they
  // advertised features (email/SMS scan notifications) that do not exist.
  const retired = await prisma.subscriptionPlan.updateMany({
    where: { slug: { not: "plus" }, isActive: true },
    data: { isActive: false },
  });
  if (retired.count > 0) console.log(`Retired ${retired.count} legacy plan(s).`);

  for (const t of THEMES) {
    await prisma.theme.upsert({
      where: { slug: t.slug },
      update: t,
      create: { ...t, status: "ACTIVE" },
    });
  }
  console.log(`Seeded ${THEMES.length} themes.`);

  // The first admin, created as a super admin: somebody has to be able to
  // appoint the others. The password is taken from the environment, and otherwise
  // generated — a seed that ships a known password puts the same credentials on
  // every deployment that ever runs it, and the one account that can suspend
  // users and edit the store is the worst place for that.
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim() || "admin@jogajog.app";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const supplied = process.env.SEED_ADMIN_PASSWORD?.trim();
    const password = supplied || randomBytes(12).toString("base64url");
    await prisma.user.create({
      data: {
        name: "Jogajog Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(password, 10),
        role: "SUPER_ADMIN",
      },
    });
    console.log(`Created admin user: ${adminEmail}`);
    if (supplied) {
      console.log("Password: the SEED_ADMIN_PASSWORD you supplied.");
    } else {
      console.log(`Password: ${password}`);
      console.log("This is shown once. Change it at /admin/profile after signing in.");
    }
  }

  for (const p of PRODUCTS) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    let imageAssetId = existing?.imageAssetId ?? null;

    if (!imageAssetId) {
      const img = await renderSvgToWebp(placeholderSvg(p.name, p.accent), 640);
      const asset = await prisma.mediaAsset.create({
        data: {
          kind: "PRODUCT_IMAGE",
          ownerId: null,
          mimeType: img.mimeType,
          byteSize: img.byteSize,
          width: img.width,
          height: img.height,
          data: new Uint8Array(img.data),
          checksum: img.checksum,
        },
      });
      imageAssetId = asset.id;
    }

    const theme = await prisma.theme.findUnique({ where: { slug: p.themeSlug } });

    const data = {
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      useCase: p.useCase,
      priceCents: p.priceCents,
      qrSlots: p.qrSlots,
      currency: "BDT",
      status: "ACTIVE" as const,
      sortOrder: p.sortOrder,
      imageAssetId,
      themeId: theme?.id ?? null,
    };
    await prisma.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });
  }

  console.log(`Seeded ${PRODUCTS.length} products.`);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
