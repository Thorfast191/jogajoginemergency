import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const plans = [
    {
      slug: "basic",
      name: "Basic",
      priceCents: 29900, // 299 BDT / year
      maxTags: 2,
      features: ["2 QR stickers", "Scan notifications by email", "Masked contact relay"],
    },
    {
      slug: "standard",
      name: "Standard",
      priceCents: 59900,
      maxTags: 5,
      features: [
        "5 QR stickers",
        "Scan notifications by email + SMS",
        "Masked contact relay",
        "Scan location history",
      ],
    },
    {
      slug: "premium",
      name: "Premium",
      priceCents: 99900,
      maxTags: 15,
      features: [
        "15 QR stickers",
        "Priority scan notifications",
        "Masked contact relay",
        "Scan location history",
        "Priority support",
      ],
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
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
