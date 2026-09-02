"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validations";
import { isSafeNext } from "@/lib/nav";
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
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, phone, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: { name, email, phone: phone || null, passwordHash },
  });

  await signIn("credentials", { email, password, redirect: false });

  const nextRaw = formData.get("next");
  const next = typeof nextRaw === "string" && isSafeNext(nextRaw) ? nextRaw : "/dashboard";
  redirect(next);
}
