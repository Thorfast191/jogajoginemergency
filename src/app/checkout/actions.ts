"use server";

import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber, allocateTags } from "@/lib/order";

export type CheckoutState = { error?: string };

export async function createOrderAction(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  let user;
  try {
    user = await requireCustomer();
  } catch {
    return { error: "Not authorized." };
  }

  const parsed = checkoutSchema.safeParse({
    productSlug: formData.get("productSlug"),
    quantity: formData.get("quantity"),
    shipName: formData.get("shipName") || null,
    shipPhone: formData.get("shipPhone") || null,
    shipAddress: formData.get("shipAddress") || null,
    shipCity: formData.get("shipCity") || null,
    shipNote: formData.get("shipNote") || null,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const product = await prisma.product.findUnique({ where: { slug: parsed.data.productSlug } });
  if (!product || product.status !== "ACTIVE") return { error: "That product isn't available." };

  const qty = parsed.data.quantity;
  const total = product.priceCents * qty;

  let orderNumber = "";
  try {
    orderNumber = await prisma.$transaction(async (tx) => {
      // Unique order number with a small retry.
      let number = generateOrderNumber();
      for (let i = 0; i < 5; i++) {
        const clash = await tx.order.findUnique({ where: { orderNumber: number } });
        if (!clash) break;
        number = generateOrderNumber();
      }

      const order = await tx.order.create({
        data: {
          orderNumber: number,
          userId: user.id,
          status: "PENDING",
          subtotalCents: total,
          totalCents: total,
          currency: product.currency,
          shipName: parsed.data.shipName ?? null,
          shipPhone: parsed.data.shipPhone ?? null,
          shipAddress: parsed.data.shipAddress ?? null,
          shipCity: parsed.data.shipCity ?? null,
          shipNote: parsed.data.shipNote ?? null,
        },
      });

      const item = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity: qty,
          unitPriceCents: product.priceCents,
          currency: product.currency,
        },
      });

      const tagIds = await allocateTags(tx, {
        productId: product.id,
        orderItemId: item.id,
        quantity: qty,
      });

      await tx.payment.create({
        data: {
          kind: "ORDER",
          orderId: order.id,
          amountCents: total,
          currency: product.currency,
          provider: "DEMO",
          status: "SUCCEEDED",
          providerRef: `demo_${Date.now()}`,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", placedAt: new Date() },
      });

      await tx.tag.updateMany({
        where: { id: { in: tagIds } },
        data: { userId: user.id, status: "ACTIVE" },
      });

      return number;
    });
  } catch (e) {
    if (e instanceof Error && e.message === "OUT_OF_STOCK") {
      console.warn(`[checkout] out of stock: product=${product.slug} qty=${qty}`);
      return { error: "Sorry, that product just sold out. We're restocking — please check back." };
    }
    throw e;
  }

  redirect(`/checkout/success?order=${orderNumber}`);
}
