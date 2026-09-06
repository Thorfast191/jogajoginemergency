import { bkash as config } from "./config";
import { GatewayError, type PaymentGateway } from "./types";

// bKash tokenized checkout.
//
// Three legs: grant a token, create a payment, then *execute* it after the
// customer returns. Execution is what actually moves the money, so a callback
// saying `status=success` means nothing until execute has succeeded.

type TokenResponse = { id_token?: string; statusCode?: string; statusMessage?: string };
type CreateResponse = {
  paymentID?: string;
  bkashURL?: string;
  statusCode?: string;
  statusMessage?: string;
};
type ExecuteResponse = {
  paymentID?: string;
  trxID?: string;
  amount?: string;
  currency?: string;
  transactionStatus?: string;
  statusCode?: string;
  statusMessage?: string;
};

function cfg() {
  const c = config();
  if (!c) throw new GatewayError("bKash is not configured.");
  return c;
}

async function grantToken(): Promise<string> {
  const c = cfg();
  const res = await fetch(`${c.baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: c.username,
      password: c.password,
    },
    body: JSON.stringify({ app_key: c.appKey, app_secret: c.appSecret }),
    cache: "no-store",
  });
  if (!res.ok) throw new GatewayError(`bKash token request failed (${res.status}).`);

  const data = (await res.json()) as TokenResponse;
  if (!data.id_token) {
    throw new GatewayError(data.statusMessage ?? "bKash did not issue a token.");
  }
  return data.id_token;
}

async function authedHeaders(): Promise<Record<string, string>> {
  const c = cfg();
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: await grantToken(),
    "X-APP-Key": c.appKey,
  };
}

export const bkashGateway: PaymentGateway = {
  id: "BKASH",
  label: "bKash",

  async initiate(intent) {
    const c = cfg();
    const res = await fetch(`${c.baseUrl}/tokenized/checkout/create`, {
      method: "POST",
      headers: await authedHeaders(),
      body: JSON.stringify({
        mode: "0011",
        payerReference: intent.customer.phone ?? intent.customer.email,
        callbackURL: intent.callbackUrl,
        amount: (intent.amountCents / 100).toFixed(2),
        currency: intent.currency,
        intent: "sale",
        merchantInvoiceNumber: intent.paymentId,
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new GatewayError(`bKash create failed (${res.status}).`);

    const data = (await res.json()) as CreateResponse;
    if (!data.paymentID || !data.bkashURL) {
      throw new GatewayError(data.statusMessage ?? "bKash refused to create the payment.");
    }
    return { redirectUrl: data.bkashURL, gatewayPaymentId: data.paymentID };
  },

  async verify(params, payment) {
    const c = cfg();

    // The callback tells us how the customer left the bKash screen. Only
    // "success" is worth pursuing; the rest never took money.
    const status = (params.status ?? "").toLowerCase();
    if (status === "cancel") return { status: "CANCELLED" };
    if (status && status !== "success") {
      return { status: "FAILED", reason: `bKash reported ${status}.` };
    }

    // Trust our own stored id over the query string, which is forgeable.
    const paymentID = payment.gatewayPaymentId ?? params.paymentID;
    if (!paymentID) return { status: "FAILED", reason: "No bKash payment id to execute." };

    const headers = await authedHeaders();
    const res = await fetch(`${c.baseUrl}/tokenized/checkout/execute`, {
      method: "POST",
      headers,
      body: JSON.stringify({ paymentID }),
      cache: "no-store",
    });
    let data = (await res.json().catch(() => ({}))) as ExecuteResponse;

    // Execute is single-use. If the customer refreshed, or an earlier attempt
    // already executed, ask for the payment's status instead of concluding it
    // failed.
    if (!res.ok || !data.trxID) {
      const q = await fetch(`${c.baseUrl}/tokenized/checkout/payment/status`, {
        method: "POST",
        headers,
        body: JSON.stringify({ paymentID }),
        cache: "no-store",
      });
      data = (await q.json().catch(() => ({}))) as ExecuteResponse;
    }

    const txStatus = (data.transactionStatus ?? "").toLowerCase();
    if (data.trxID && (txStatus === "completed" || data.statusCode === "0000")) {
      return {
        status: "SUCCEEDED",
        providerRef: data.trxID,
        amount: data.amount,
        currency: data.currency,
      };
    }
    if (txStatus === "initiated") return { status: "PENDING" };

    return {
      status: "FAILED",
      reason: data.statusMessage ?? `bKash reported ${txStatus || "no status"}.`,
    };
  },
};
