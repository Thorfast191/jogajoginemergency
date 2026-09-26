import { NextResponse, after } from "next/server";
import { settlePayment } from "@/lib/payments/settle";
import { remindAboutNewOrder } from "@/lib/print-server";
import { issueTagsForOrder } from "@/lib/tag-issue";
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

    // Stickers are printed with the customer's QR in them, so the codes are
    // minted the moment the order is paid: the customer finds them ready
    // instead of being asked to press a button, and the order is printable
    // straight away.
    //
    // Awaited rather than deferred, because the very next page the customer
    // sees says how many codes they have. `after()` runs once the response has
    // gone out, which is a race the success page loses. The work is bounded by
    // the slots the order paid for and each code is its own short transaction;
    // a provider that retries the callback meanwhile costs nothing, since both
    // settlement and issuing are idempotent.
    const paidOrderId = outcome.fulfilledOrderId;
    if (paidOrderId) {
      try {
        await issueTagsForOrder(paidOrderId);
      } catch (e) {
        console.error(`[payments] issuing QR codes failed for order ${paidOrderId}:`, e);
      }
    }

    // The reminder sends nothing when an order needs no more codes, so after
    // the step above it only speaks up if issuing them failed. Deferred: an
    // email must not keep the gateway waiting.
    if (paidOrderId) {
      after(() =>
        remindAboutNewOrder(paidOrderId).catch((e) =>
          console.error(`[payments] QR reminder failed for order ${paidOrderId}:`, e),
        ),
      );
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
