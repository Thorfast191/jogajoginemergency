import { paymentNotice } from "@/lib/payments/notice";

/** The banner for a `?payment=<code>` a payment redirect brought the customer back with. */
export function PaymentNotice({ code }: { code: string | string[] | undefined }) {
  const notice = paymentNotice(code);
  if (!notice) return null;
  const tone =
    notice.tone === "error"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-amber-200 bg-amber-50 text-amber-900";
  return (
    <p role="alert" className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>
      {notice.text}
    </p>
  );
}
