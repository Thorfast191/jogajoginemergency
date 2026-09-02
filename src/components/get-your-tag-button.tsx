import Link from "next/link";
import { auth } from "@/lib/auth";

// Auth-aware CTA. Logged-in customers go straight to checkout (or the shop);
// logged-out visitors go to signup with a safe ?next= back to where they were
// headed; admins are bounced to their own area.
export async function GetYourTagButton({
  productSlug,
  className,
  children,
}: {
  productSlug?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const session = await auth();
  const target = productSlug ? `/checkout?product=${encodeURIComponent(productSlug)}` : "/shop";

  let href: string;
  if (!session?.user) {
    href = `/signup?next=${encodeURIComponent(target)}`;
  } else if (session.user.role === "ADMIN") {
    href = "/admin";
  } else {
    href = target;
  }

  const cls =
    className ??
    "inline-block rounded-md bg-emerald-600 text-white px-6 py-3 font-medium hover:bg-emerald-700";

  return (
    <Link href={href} className={cls}>
      {children ?? "Get your tag"}
    </Link>
  );
}
