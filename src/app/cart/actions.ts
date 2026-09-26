"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addLine, setLineQty, removeLine } from "@/lib/cart";
import { readLiveCart, writeCart } from "@/lib/cart-server";
import { prisma } from "@/lib/prisma";

// The cart is deliberately open to signed-out visitors — browsing and filling
// a basket shouldn't require an account. Checkout is where auth is enforced.
//
// Every change starts from the purchasable lines only, so writing the cookie
// also drops anything taken off sale since it was added — including a plan
// that has since been switched off.

const slugSchema = z.string().min(1).max(64);
const qtySchema = z.coerce.number().int().min(0).max(10);

/** A theme slug from a form, or undefined when the buyer didn't pick one. */
function themeFrom(formData: FormData): string | undefined {
  const parsed = slugSchema.safeParse(formData.get("theme"));
  return parsed.success ? parsed.data : undefined;
}

export async function addToCartAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success) return;
  const qty = qtySchema.safeParse(formData.get("qty") ?? 1);
  const theme = themeFrom(formData);

  // Only something on sale goes in: a stale page's button for a retired
  // product would otherwise take up one of the cart's ten lines for nothing.
  const onSale = await prisma.product.findFirst({
    where: { slug: slug.data, status: "ACTIVE" },
    select: { id: true },
  });

  // A theme that isn't live is dropped rather than refused — the line still
  // resolves to the product's own artwork, which is what the buyer saw.
  const liveTheme = theme
    ? await prisma.theme.findFirst({ where: { slug: theme, status: "ACTIVE" }, select: { id: true } })
    : null;

  const { lines, planSlug } = await readLiveCart();
  await writeCart(
    onSale
      ? addLine(lines, slug.data, qty.success ? qty.data || 1 : 1, liveTheme ? theme : undefined)
      : lines,
    planSlug,
  );

  const then = formData.get("then");
  if (typeof then === "string" && then === "checkout") redirect("/checkout");
  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartQtyAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  const qty = qtySchema.safeParse(formData.get("qty"));
  if (!slug.success || !qty.success) return;

  const { lines, planSlug } = await readLiveCart();
  await writeCart(setLineQty(lines, slug.data, qty.data, themeFrom(formData)), planSlug);
  revalidatePath("/cart");
}

export async function removeFromCartAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success) return;

  const { lines, planSlug } = await readLiveCart();
  await writeCart(removeLine(lines, slug.data, themeFrom(formData)), planSlug);
  revalidatePath("/cart");
}

/**
 * Add the plan to this checkout, so publishing the page is part of buying the
 * sticker rather than a second payment discovered afterwards.
 *
 * The cart holds the plan's slug only. Its price, its billing period and
 * whether it is still on sale are read at checkout, like every other price.
 */
export async function addPlanToCartAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("planSlug"));
  if (!slug.success) return;

  const plan = await prisma.subscriptionPlan.findFirst({
    where: { slug: slug.data, isActive: true },
    select: { slug: true },
  });

  const { lines, planSlug } = await readLiveCart();
  await writeCart(lines, plan?.slug ?? planSlug);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function removePlanFromCartAction() {
  const { lines } = await readLiveCart();
  await writeCart(lines, null);
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function clearCartAction() {
  await writeCart([], null);
  revalidatePath("/cart");
}
