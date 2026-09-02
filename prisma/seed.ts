import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
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

const PRODUCTS = [
  {
    slug: "bike-sticker",
    name: "Bike QR Sticker",
    tagline: "For the frame of your daily ride",
    description:
      "A weatherproof QR sticker sized for a bike frame or seat post. If your bike is lost or stolen and recovered, whoever finds it can reach you in seconds — without seeing your phone number.",
    useCase: "Great for commuters, delivery riders, and anyone who parks in public.",
    priceCents: 29900,
    sortOrder: 1,
    accent: "#059669",
  },
  {
    slug: "car-sticker",
    name: "Car QR Sticker",
    tagline: "Windshield or dashboard contact tag",
    description:
      "A discreet QR sticker for your windshield or dashboard. Handy for blocked-in parking, minor bumps, or emergencies where someone needs to reach the owner fast.",
    useCase: "Useful for shared parking, road trips, and emergency contact access.",
    priceCents: 34900,
    sortOrder: 2,
    accent: "#0EA5E9",
  },
  {
    slug: "luggage-sticker",
    name: "Luggage QR Sticker",
    tagline: "Never lose a bag at the airport again",
    description:
      "A tough QR sticker for suitcases, backpacks, and travel bags. A finder scans it and sends you a message through Jogajog — your contact details stay private.",
    useCase: "Made for air travel, hostels, and check-in chaos.",
    priceCents: 24900,
    sortOrder: 3,
    accent: "#F98A6B",
  },
  {
    slug: "helmet-sticker",
    name: "Helmet QR Sticker",
    tagline: "Emergency info where first responders look",
    description:
      "A QR sticker for the back of a helmet. In a crash, a responder can scan it to see the emergency information and contacts you chose to make visible.",
    useCase: "For motorcyclists, cyclists, and climbers.",
    priceCents: 29900,
    sortOrder: 4,
    accent: "#8B5CF6",
  },
];

async function main() {
  const plans = [
    {
      slug: "basic",
      name: "Basic",
      priceCents: 29900,
      maxTags: 2,
      features: ["Scan notifications by email", "Masked contact relay"],
    },
    {
      slug: "standard",
      name: "Standard",
      priceCents: 59900,
      maxTags: 5,
      features: ["Scan notifications by email + SMS", "Masked contact relay", "Scan location history"],
    },
    {
      slug: "premium",
      name: "Premium",
      priceCents: 99900,
      maxTags: 15,
      features: [
        "Priority scan notifications",
        "Masked contact relay",
        "Scan location history",
        "Priority support",
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({ where: { slug: plan.slug }, update: plan, create: plan });
  }

  const adminEmail = "admin@jogajog.app";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "Jogajog Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash("ChangeMe123!", 10),
        role: "ADMIN",
      },
    });
    console.log(`Created admin user: ${adminEmail} / ChangeMe123! (change this immediately)`);
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

    const data = {
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      useCase: p.useCase,
      priceCents: p.priceCents,
      currency: "BDT",
      status: "ACTIVE" as const,
      sortOrder: p.sortOrder,
      imageAssetId,
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
