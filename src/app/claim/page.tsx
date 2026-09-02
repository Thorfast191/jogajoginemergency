import { redirect } from "next/navigation";
import { getCustomer } from "@/lib/session";
import { normalizeClaimCode } from "@/lib/claim-code";

export const dynamic = "force-dynamic";

async function goToCode(formData: FormData) {
  "use server";
  const raw = String(formData.get("code") ?? "");
  const code = normalizeClaimCode(raw);
  redirect(code ? `/claim/${encodeURIComponent(code)}` : "/claim");
}

export default async function ClaimPage() {
  const user = await getCustomer();
  if (!user) redirect("/login?next=/claim");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold">Claim a tag</h1>
      <p className="mt-1 text-sm text-black/60">
        Enter the claim code printed on your sticker to link it to your account.
      </p>

      <form action={goToCode} className="mt-6 space-y-3">
        <input
          name="code"
          required
          autoComplete="off"
          placeholder="XXXX-XXXX-XXXX"
          className="w-full rounded-md border border-black/15 px-3 py-2 font-mono uppercase tracking-wider"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
