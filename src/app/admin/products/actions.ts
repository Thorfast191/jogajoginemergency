"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/validations";
import { processImage, MediaError } from "@/lib/media";

export type ProductState = { error?: string; success?: boolean };

function parse(formData: FormData) {
  return productSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    useCase: formData.get("useCase") || null,
    priceCents: formData.get("priceCents"),
    currency: formData.get("currency") || "BDT",
    status: formData.get("status"),
    sortOrder: formData.get("sortOrder") || 0,
  });
}

function revalidate() {
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function createProductAction(
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const clash = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (clash) return { error: "A product with that slug already exists." };

  const created = await prisma.product.create({ data: parsed.data });
  revalidate();
  redirect(`/admin/products/${created.id}`);
}

export async function updateProductAction(
  id: string,
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const clash = await prisma.product.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { error: "Another product already uses that slug." };

  await prisma.product.update({ where: { id }, data: parsed.data });
  revalidate();
  revalidatePath(`/admin/products/${id}`);
  return { success: true };
}

export async function archiveProductAction(id: string) {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidate();
  revalidatePath(`/admin/products/${id}`);
}

export async function uploadProductImageAction(
  id: string,
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  await requireAdmin();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > 5 * 1024 * 1024) return { error: "Image is larger than 5 MB." };

  const product = await prisma.product.findUnique({ where: { id }, select: { imageAssetId: true } });
  if (!product) return { error: "Product not found." };

  let processed;
  try {
    processed = await processImage(Buffer.from(await file.arrayBuffer()), "PRODUCT_IMAGE");
  } catch (e) {
    return { error: e instanceof MediaError ? e.message : "Could not process that image." };
  }

  const asset = await prisma.mediaAsset.create({
    data: {
      ownerId: null,
      kind: "PRODUCT_IMAGE",
      mimeType: processed.mimeType,
      byteSize: processed.byteSize,
      width: processed.width,
      height: processed.height,
      data: new Uint8Array(processed.data),
      checksum: processed.checksum,
    },
  });

  await prisma.product.update({ where: { id }, data: { imageAssetId: asset.id } });
  if (product.imageAssetId) {
    await prisma.mediaAsset.delete({ where: { id: product.imageAssetId } }).catch(() => {});
  }

  revalidate();
  revalidatePath(`/admin/products/${id}`);
  return { success: true };
}
