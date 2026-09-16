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
// also drops anything taken off sale since it was added.

const slugSchema = z.string().min(1).max(64);
const qtySchema = z.coerce.number().int().min(0).max(10);

export async function addToCartAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success) return;
  const qty = qtySchema.safeParse(formData.get("qty") ?? 1);

  // Only something on sale goes in: a stale page's button for a retired
  // product would otherwise take up one of the cart's ten lines for nothing.
  const onSale = await prisma.product.findFirst({
    where: { slug: slug.data, status: "ACTIVE" },
    select: { id: true },
  });
  const lines = await readLiveCart();
  await writeCart(onSale ? addLine(lines, slug.data, qty.success ? qty.data || 1 : 1) : lines);

  const then = formData.get("then");
  if (typeof then === "string" && then === "checkout") redirect("/checkout");
  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartQtyAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  const qty = qtySchema.safeParse(formData.get("qty"));
  if (!slug.success || !qty.success) return;

  await writeCart(setLineQty(await readLiveCart(), slug.data, qty.data));
  revalidatePath("/cart");
}

export async function removeFromCartAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success) return;

  await writeCart(removeLine(await readLiveCart(), slug.data));
  revalidatePath("/cart");
}

export async function clearCartAction() {
  await writeCart([]);
  revalidatePath("/cart");
}
