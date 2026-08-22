"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations";
import { signIn } from "@/lib/auth";

export type SignupState = { error?: string };

export async function signupAction(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    planSlug: formData.get("planSlug"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, phone, password, planSlug } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const plan = await prisma.subscriptionPlan.findUnique({ where: { slug: planSlug } });
  if (!plan) {
    return { error: "Selected plan no longer exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      subscriptions: {
        create: {
          planId: plan.id,
          status: "ACTIVE",
          provider: "DEMO",
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          payments: {
            create: {
              amountCents: plan.priceCents,
              currency: plan.currency,
              provider: "DEMO",
              status: "SUCCEEDED",
              providerRef: `demo_${Date.now()}`,
            },
          },
        },
      },
    },
  });

  await signIn("credentials", { email, password, redirect: false });
  redirect("/dashboard");
}
