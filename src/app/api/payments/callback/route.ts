import { NextResponse } from "next/server";
import { settlePayment } from "@/lib/payments/settle";
import { appUrl } from "@/lib/payments/config";
import { cookies } from "next/headers";
import { CART_COOKIE } from "@/lib/cart";

// One callback endpoint for every gateway.
//
// Providers differ in whether they GET or POST, and in what they call the
// merchant reference, so both verbs are accepted and the reference is looked
// for under each provider's name. Nothing in the payload is treated as proof
// of payment — settlePayment re-verifies with the provider before fulfilling.

const REFERENCE_KEYS = [
  "payment", // ours, carried on the callback URL
  "tran_id", // SSLCommerz
  "merchantInvoiceNumber", // bKash
  "order_id", // Nagad
];

function referenceFrom(params: Record<string, string>): string | null {
  for (const key of REFERENCE_KEYS) {
    const value = params[key];
    if (value) return value;
  }
  return null;
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const params: Record<string, string> = Object.fromEntries(url.searchParams);

  if (req.method === "POST") {
    const type = req.headers.get("content-type") ?? "";
    try {
      if (type.includes("application/json")) {
        Object.assign(params, await req.json());
      } else {
        for (const [k, v] of await req.formData()) {
          if (typeof v === "string") params[k] = v;
        }
      }
    } catch {
      // A malformed body is not fatal — the query string may still carry the
      // reference, and the truth comes from the provider either way.
    }
  }

  const paymentId = referenceFrom(params);
  if (!paymentId) {
    return NextResponse.redirect(new URL("/dashboard?payment=unknown", appUrl()), 303);
  }

  let target = "/dashboard?payment=failed";
  try {
    const outcome = await settlePayment(paymentId, params);
    target = outcome.redirectTo;

    // The cart is emptied here rather than at redirect time, so a customer who
    // abandons the gateway comes back to a cart that still holds their
    // stickers. A server-to-server notification carries no cookies, in which
    // case this simply sets a header nobody reads.
    if (outcome.status === "SUCCEEDED") {
      (await cookies()).delete(CART_COOKIE);
    }
  } catch (e) {
    // A gateway that is down or misconfigured must not lose the customer.
    console.error(`[payments] settlement failed for ${paymentId}:`, e);
  }

  // 303 so the browser follows with GET even when the provider POSTed here.
  return NextResponse.redirect(new URL(target, appUrl()), 303);
}

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}
