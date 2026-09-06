import { sslcommerz as config } from "./config";
import { GatewayError, type PaymentGateway } from "./types";

// SSLCommerz hosted checkout.
//
// The browser is returned to our callback with a POST body that includes a
// `val_id`. That body is not evidence — anyone can craft it — so settlement
// always goes back to SSLCommerz's validation API with the val_id and uses
// what *that* says.

type SessionResponse = {
  status?: string;
  failedreason?: string;
  sessionkey?: string;
  GatewayPageURL?: string;
};

type ValidationResponse = {
  status?: string;
  tran_id?: string;
  amount?: string;
  currency?: string;
  currency_type?: string;
  bank_tran_id?: string;
  error?: string;
};

function cfg() {
  const c = config();
  if (!c) throw new GatewayError("SSLCommerz is not configured.");
  return c;
}

export const sslcommerzGateway: PaymentGateway = {
  id: "SSLCOMMERZ",
  label: "Cards & mobile banking (SSLCommerz)",

  async initiate(intent) {
    const c = cfg();
    const body = new URLSearchParams({
      store_id: c.storeId,
      store_passwd: c.storePassword,
      total_amount: (intent.amountCents / 100).toFixed(2),
      currency: intent.currency,
      tran_id: intent.paymentId,
      success_url: intent.callbackUrl,
      fail_url: intent.callbackUrl,
      cancel_url: intent.callbackUrl,
      ipn_url: intent.callbackUrl,
      product_name: intent.description,
      product_category: "physical",
      product_profile: "physical-goods",
      shipping_method: "NO",
      cus_name: intent.customer.name,
      cus_email: intent.customer.email,
      cus_phone: intent.customer.phone ?? "N/A",
      cus_add1: "N/A",
      cus_city: "N/A",
      cus_country: "Bangladesh",
    });

    const res = await fetch(`${c.baseUrl}/gwprocess/v4/api.php`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) throw new GatewayError(`SSLCommerz session failed (${res.status}).`);

    const data = (await res.json()) as SessionResponse;
    if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
      throw new GatewayError(data.failedreason ?? "SSLCommerz refused the session.");
    }

    return { redirectUrl: data.GatewayPageURL, gatewayPaymentId: data.sessionkey ?? null };
  },

  async verify(params, payment) {
    const c = cfg();

    // A cancel or failure comes back without a val_id; there is nothing to
    // validate, so take the reported outcome at face value. It can only ever
    // make us *less* generous, never fulfil an order.
    const valId = params.val_id;
    if (!valId) {
      const status = (params.status ?? "").toUpperCase();
      if (status === "CANCELLED") return { status: "CANCELLED" };
      return { status: "FAILED", reason: params.error ?? "No validation id returned." };
    }

    const url = new URL(`${c.baseUrl}/validator/api/validationserverAPI.php`);
    url.searchParams.set("val_id", valId);
    url.searchParams.set("store_id", c.storeId);
    url.searchParams.set("store_passwd", c.storePassword);
    url.searchParams.set("format", "json");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new GatewayError(`SSLCommerz validation failed (${res.status}).`);
    const data = (await res.json()) as ValidationResponse;

    // The validation response must name the same transaction we started, or
    // this callback belongs to a different payment.
    if (data.tran_id && data.tran_id !== payment.id) {
      return { status: "FAILED", reason: "Validation referenced a different transaction." };
    }

    const status = (data.status ?? "").toUpperCase();
    if (status === "VALID" || status === "VALIDATED") {
      return {
        status: "SUCCEEDED",
        providerRef: data.bank_tran_id ?? valId,
        amount: data.amount,
        currency: data.currency_type ?? data.currency,
      };
    }
    if (status === "PENDING") return { status: "PENDING" };
    return { status: "FAILED", reason: data.error ?? `SSLCommerz reported ${status || "no status"}.` };
  },
};
