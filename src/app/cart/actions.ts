"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { addLine, setLineQty, removeLine } from "@/lib/cart";
import { readCart, writeCart } from "@/lib/cart-server";

// The cart is deliberately open to signed-out visitors — browsing and filling
// a basket shouldn't require an account. Checkout is where auth is enforced.

const slugSchema = z.string().min(1).max(64);
const qtySchema = z.coerce.number().int().min(0).max(10);

export async function addToCartAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success) return;
  const qty = qtySchema.safeParse(formData.get("qty") ?? 1);

  await writeCart(addLine(await readCart(), slug.data, qty.success ? qty.data || 1 : 1));

  const then = formData.get("then");
  if (typeof then === "string" && then === "checkout") redirect("/checkout");
  revalidatePath("/cart");
  redirect("/cart");
}

export async function updateCartQtyAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  const qty = qtySchema.safeParse(formData.get("qty"));
  if (!slug.success || !qty.success) return;

  await writeCart(setLineQty(await readCart(), slug.data, qty.data));
  revalidatePath("/cart");
}

export async function removeFromCartAction(formData: FormData) {
  const slug = slugSchema.safeParse(formData.get("slug"));
  if (!slug.success) return;

  await writeCart(removeLine(await readCart(), slug.data));
  revalidatePath("/cart");
}

export async function clearCartAction() {
  await writeCart([]);
  revalidatePath("/cart");
}
