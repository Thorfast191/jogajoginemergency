import {
  constants,
  createSign,
  privateDecrypt,
  publicEncrypt,
  randomBytes,
} from "node:crypto";
import { nagad as config } from "./config";
import { GatewayError, type PaymentGateway } from "./types";

// Nagad's payment gateway.
//
// Unlike the others, every request body is RSA-encrypted with Nagad's public
// key and signed with the merchant's private key, and responses come back
// encrypted the other way round. The flow is initialize → complete → redirect,
// then a verify call once the customer returns.

const API_VERSION = "v-0.2.0";
const BDT_NUMERIC = "050"; // ISO 4217 numeric code, which Nagad expects.

function cfg() {
  const c = config();
  if (!c) throw new GatewayError("Nagad is not configured.");
  return c;
}

/** Accept either a full PEM or the bare base64 body that Nagad hands out. */
function pem(key: string, kind: "PUBLIC" | "PRIVATE"): string {
  const trimmed = key.replace(/\\n/g, "\n").trim();
  if (trimmed.includes("-----BEGIN")) return trimmed;
  const label = kind === "PUBLIC" ? "PUBLIC KEY" : "PRIVATE KEY";
  const body = trimmed.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----`;
}

function encrypt(payload: unknown): string {
  return publicEncrypt(
    { key: pem(cfg().publicKey, "PUBLIC"), padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(JSON.stringify(payload)),
  ).toString("base64");
}

function decrypt(data: string): Record<string, string> {
  const plain = privateDecrypt(
    { key: pem(cfg().privateKey, "PRIVATE"), padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(data, "base64"),
  ).toString();
  return JSON.parse(plain) as Record<string, string>;
}

function sign(payload: unknown): string {
  return createSign("SHA256")
    .update(JSON.stringify(payload))
    .sign(pem(cfg().privateKey, "PRIVATE"), "base64");
}

/** Nagad wants a local timestamp as YYYYMMDDHHmmss. */
function timestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 14);
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-KM-Api-Version": API_VERSION,
    // Nagad requires a client IP header. There is no meaningful client IP for
    // a server-to-server call, so this is the documented placeholder.
    "X-KM-IP-V4": "0.0.0.0",
    "X-KM-Client-Type": "PC_WEB",
  };
}

export const nagadGateway: PaymentGateway = {
  id: "NAGAD",
  label: "Nagad",

  async initiate(intent) {
    const c = cfg();
    const dateTime = timestamp();
    const challenge = randomBytes(10).toString("hex");

    const initPayload = {
      merchantId: c.merchantId,
      datetime: dateTime,
      orderId: intent.paymentId,
      challenge,
    };

    const initRes = await fetch(
      `${c.baseUrl}/check-out/initialize/${c.merchantId}/${intent.paymentId}`,
      {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          accountNumber: c.merchantNumber,
          dateTime,
          sensitiveData: encrypt(initPayload),
          signature: sign(initPayload),
        }),
        cache: "no-store",
      },
    );
    if (!initRes.ok) throw new GatewayError(`Nagad initialize failed (${initRes.status}).`);

    const init = (await initRes.json()) as { sensitiveData?: string; reason?: string };
    if (!init.sensitiveData) {
      throw new GatewayError(init.reason ?? "Nagad refused to initialize the payment.");
    }

    const { paymentReferenceId, challenge: serverChallenge } = decrypt(init.sensitiveData);
    if (!paymentReferenceId) throw new GatewayError("Nagad returned no payment reference.");

    const completePayload = {
      merchantId: c.merchantId,
      orderId: intent.paymentId,
      currencyCode: BDT_NUMERIC,
      amount: (intent.amountCents / 100).toFixed(2),
      challenge: serverChallenge,
    };

    const completeRes = await fetch(`${c.baseUrl}/check-out/complete/${paymentReferenceId}`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        sensitiveData: encrypt(completePayload),
        signature: sign(completePayload),
        merchantCallbackURL: intent.callbackUrl,
      }),
      cache: "no-store",
    });
    if (!completeRes.ok) throw new GatewayError(`Nagad complete failed (${completeRes.status}).`);

    const complete = (await completeRes.json()) as {
      callBackUrl?: string;
      status?: string;
      message?: string;
    };
    if (!complete.callBackUrl) {
      throw new GatewayError(complete.message ?? "Nagad did not return a checkout URL.");
    }

    return { redirectUrl: complete.callBackUrl, gatewayPaymentId: paymentReferenceId };
  },

  async verify(params, payment) {
    const c = cfg();

    // Prefer our stored reference over the query string, which is forgeable.
    const ref = payment.gatewayPaymentId ?? params.payment_ref_id;
    if (!ref) {
      const status = (params.status ?? "").toLowerCase();
      if (status === "cancelled" || status === "aborted") return { status: "CANCELLED" };
      return { status: "FAILED", reason: params.message ?? "No Nagad payment reference." };
    }

    const res = await fetch(`${c.baseUrl}/verify/payment/${ref}`, {
      headers: headers(),
      cache: "no-store",
    });
    if (!res.ok) throw new GatewayError(`Nagad verify failed (${res.status}).`);

    const data = (await res.json()) as {
      status?: string;
      orderId?: string;
      amount?: string;
      issuerPaymentRefNo?: string;
      statusCode?: string;
    };

    // The verified record must name the order we started.
    if (data.orderId && data.orderId !== payment.id) {
      return { status: "FAILED", reason: "Nagad verified a different order." };
    }

    const status = (data.status ?? "").toLowerCase();
    if (status === "success") {
      return {
        status: "SUCCEEDED",
        providerRef: data.issuerPaymentRefNo ?? ref,
        amount: data.amount,
        // Nagad's verify response reports the amount without a currency; it
        // only ever settles in BDT.
        currency: payment.currency,
      };
    }
    if (status === "pending" || status === "initiated") return { status: "PENDING" };
    if (status === "aborted" || status === "cancelled") return { status: "CANCELLED" };

    return { status: "FAILED", reason: `Nagad reported ${data.status ?? "no status"}.` };
  },
};
