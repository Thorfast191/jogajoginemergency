import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeClaimCode } from "@/lib/claim-code";
import { ClaimConfirm } from "./claim-confirm";

export const dynamic = "force-dynamic";

export default async function ClaimCodePage({ params }: { params: Promise<{ code: string }> }) {
  const user = await getCustomer();
  if (!user) redirect("/login");

  const { code: rawCode } = await params;
  const code = normalizeClaimCode(decodeURIComponent(rawCode));

  const tag = await prisma.tag.findUnique({
    where: { claimCode: code },
    include: { product: true },
  });

  const claimable = tag && tag.userId === null && tag.status !== "DEACTIVATED";

  if (!claimable) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-2xl font-bold">Can&apos;t claim this code</h1>
        <p className="mt-2 text-sm text-black/60">
          That code isn&apos;t valid or has already been used. Double-check the code on your
          sticker.
        </p>
        <Link href="/claim" className="mt-4 inline-block text-sm text-emerald-700 hover:underline">
          ← Try another code
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Claim this tag</h1>
      <p className="mt-2 text-sm text-black/60">
        This will link the <span className="font-medium">{tag.product?.name ?? "tag"}</span> to your
        account. What finders see comes from your emergency profile.
      </p>
      <div className="mt-6">
        <ClaimConfirm code={code} />
      </div>
    </div>
  );
}
