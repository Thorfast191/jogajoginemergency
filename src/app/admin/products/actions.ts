"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStaffWith } from "@/lib/session";
import { MAX_IMAGE_BYTES, oversizeMessage } from "@/lib/upload-limits";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/permissions";
import { productSchema, firstIssue } from "@/lib/validations";
import { processImage, MediaError } from "@/lib/media";
import { formatPrice } from "@/lib/money";
import { audit } from "@/lib/audit";

export type ProductState = { error?: string; success?: boolean };

/**
 * The fields only `pricing.manage` may set: what a product costs, what it
 * grants, whether customers can see it — and which theme it carries, because
 * buying a product is what unlocks that theme for the customer.
 */
type Pricing = {
  priceCents: number;
  currency: string;
  qrSlots: number;
  status: string;
  themeId: string | null;
};

function parse(formData: FormData, keep?: Pricing) {
  return productSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    tagline: formData.get("tagline"),
    description: formData.get("description"),
    useCase: formData.get("useCase") || null,
    priceCents: keep ? keep.priceCents : formData.get("priceCents"),
    currency: keep ? keep.currency : formData.get("currency") || "BDT",
    qrSlots: keep ? keep.qrSlots : formData.get("qrSlots") || 1,
    stickerWidthMm: formData.get("stickerWidthMm") || 60,
    themeId: keep ? keep.themeId : formData.get("themeId") || null,
    status: keep ? keep.status : formData.get("status"),
    sortOrder: formData.get("sortOrder") || 0,
  });
}

function revalidate() {
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

/** A themeId posted by hand must name a real theme, or the write raises a foreign-key error. */
async function themeMissing(themeId: string | null | undefined): Promise<boolean> {
  if (!themeId) return false;
  const theme = await prisma.theme.findUnique({ where: { id: themeId }, select: { id: true } });
  return !theme;
}

/** A new product needs a price and QR slots, so creating one is a pricing decision. */
export async function createProductAction(
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const actor = await getStaffWith("pricing.manage");
  if (!actor) return { error: "Only a super admin can create products." };
  const parsed = parse(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const clash = await prisma.product.findUnique({ where: { slug: parsed.data.slug } });
  if (clash) return { error: "A product with that slug already exists." };
  if (await themeMissing(parsed.data.themeId)) return { error: "Choose a theme that exists." };

  // An image may come with the very first save, so a new product need not be
  // created blank and then edited just to give it a picture.
  const file = formData.get("image");
  let imageAssetId: string | null = null;
  if (file instanceof File && file.size > 0) {
    const asset = await storeProductImage(file);
    if ("error" in asset) return asset;
    imageAssetId = asset.id;
  }

  const created = await prisma.product.create({ data: { ...parsed.data, imageAssetId } });
  await audit(
    actor.id,
    "product.create",
    { type: "product", id: created.id },
    `Created ${created.name} at ${formatPrice(created.priceCents, created.currency)} (${created.status.toLowerCase()})`,
  );
  revalidate();
  redirect(`/admin/products/${created.id}`);
}

/**
 * Validate, re-encode and store one uploaded product image.
 *
 * Shared by create and replace so both enforce the same size ceiling and the
 * same re-encoding — an uploaded file is never stored as it arrived.
 */
async function storeProductImage(file: File): Promise<{ id: string } | { error: string }> {
  if (file.size > MAX_IMAGE_BYTES) return { error: oversizeMessage(MAX_IMAGE_BYTES) };

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
  return { id: asset.id };
}

/**
 * Save a product.
 *
 * Any admin may edit its content. The price, currency, QR slots and status are
 * written from the form only for someone who holds `pricing.manage`; for
 * everyone else the stored values are carried through untouched, so a crafted
 * form cannot reprice a sticker.
 */
export async function updateProductAction(
  id: string,
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const actor = await getStaffWith("catalog.edit");
  if (!actor) return { error: "Not authorized." };

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { error: "Product not found." };

  const pricer = can(actor.role, "pricing.manage");
  const parsed = parse(formData, pricer ? undefined : existing);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const clash = await prisma.product.findFirst({
    where: { slug: parsed.data.slug, NOT: { id } },
    select: { id: true },
  });
  if (clash) return { error: "Another product already uses that slug." };
  if (await themeMissing(parsed.data.themeId)) return { error: "Choose a theme that exists." };

  await prisma.product.update({ where: { id }, data: parsed.data });

  if (pricer) {
    const changes: string[] = [];
    if (parsed.data.priceCents !== existing.priceCents || parsed.data.currency !== existing.currency) {
      changes.push(
        `price ${formatPrice(existing.priceCents, existing.currency)} → ${formatPrice(parsed.data.priceCents, parsed.data.currency)}`,
      );
    }
    if (parsed.data.qrSlots !== existing.qrSlots) {
      changes.push(`QR slots ${existing.qrSlots} → ${parsed.data.qrSlots}`);
    }
    if (parsed.data.status !== existing.status) {
      changes.push(`status ${existing.status.toLowerCase()} → ${parsed.data.status.toLowerCase()}`);
    }
    if (changes.length > 0) {
      await audit(actor.id, "product.pricing", { type: "product", id }, `${existing.name}: ${changes.join(", ")}`);
    }
  }

  revalidate();
  revalidatePath(`/admin/products/${id}`);
  return { success: true };
}

export async function archiveProductAction(id: string): Promise<ProductState> {
  const actor = await getStaffWith("destructive");
  if (!actor) return { error: "Only a super admin can archive a product." };

  const product = await prisma.product.findUnique({ where: { id }, select: { name: true } });
  if (!product) return { error: "Product not found." };

  await prisma.product.update({ where: { id }, data: { status: "ARCHIVED" } });
  await audit(actor.id, "product.archive", { type: "product", id }, `Archived ${product.name}`);
  revalidate();
  revalidatePath(`/admin/products/${id}`);
  return { success: true };
}

export async function uploadProductImageAction(
  id: string,
  _prev: ProductState,
  formData: FormData,
): Promise<ProductState> {
  if (!(await getStaffWith("catalog.edit"))) return { error: "Not authorized." };

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };

  const product = await prisma.product.findUnique({ where: { id }, select: { imageAssetId: true } });
  if (!product) return { error: "Product not found." };

  const asset = await storeProductImage(file);
  if ("error" in asset) return asset;

  await prisma.product.update({ where: { id }, data: { imageAssetId: asset.id } });
  if (product.imageAssetId) {
    await prisma.mediaAsset.delete({ where: { id: product.imageAssetId } }).catch(() => {});
  }

  revalidate();
  revalidatePath(`/admin/products/${id}`);
  return { success: true };
}
