import type { ProviderId } from "./types";

// Credentials come from the environment; nothing is hard-coded and nothing is
// committed. A provider whose variables are absent is simply not offered at
// checkout, so a deployment can run with one, two or all three.

export type Mode = "sandbox" | "live";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export function mode(): Mode {
  return env("PAYMENT_MODE") === "live" ? "live" : "sandbox";
}

export function appUrl(): string {
  return env("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000";
}

export const sslcommerz = () => {
  const storeId = env("SSLCOMMERZ_STORE_ID");
  const storePassword = env("SSLCOMMERZ_STORE_PASSWORD");
  if (!storeId || !storePassword) return null;
  return {
    storeId,
    storePassword,
    baseUrl:
      mode() === "live" ? "https://securepay.sslcommerz.com" : "https://sandbox.sslcommerz.com",
  };
};

export const bkash = () => {
  const appKey = env("BKASH_APP_KEY");
  const appSecret = env("BKASH_APP_SECRET");
  const username = env("BKASH_USERNAME");
  const password = env("BKASH_PASSWORD");
  if (!appKey || !appSecret || !username || !password) return null;
  return {
    appKey,
    appSecret,
    username,
    password,
    baseUrl:
      mode() === "live"
        ? "https://tokenized.pay.bka.sh/v1.2.0-beta"
        : "https://tokenized.sandbox.bka.sh/v1.2.0-beta",
  };
};

export const nagad = () => {
  const merchantId = env("NAGAD_MERCHANT_ID");
  const merchantNumber = env("NAGAD_MERCHANT_NUMBER");
  const privateKey = env("NAGAD_MERCHANT_PRIVATE_KEY");
  const publicKey = env("NAGAD_PG_PUBLIC_KEY");
  if (!merchantId || !merchantNumber || !privateKey || !publicKey) return null;
  return {
    merchantId,
    merchantNumber,
    privateKey,
    publicKey,
    baseUrl:
      mode() === "live"
        ? "https://api.mynagad.com/api/dfs"
        : "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs",
  };
};

/**
 * Whether the DEMO provider may be offered. It settles payments inline with no
 * money involved, so it must never be reachable in a live deployment.
 */
export function demoEnabled(): boolean {
  if (mode() === "live") return false;
  return env("PAYMENT_ALLOW_DEMO") !== "0";
}

export function configuredProviders(): ProviderId[] {
  const out: ProviderId[] = [];
  if (bkash()) out.push("BKASH");
  if (nagad()) out.push("NAGAD");
  if (sslcommerz()) out.push("SSLCOMMERZ");
  if (demoEnabled()) out.push("DEMO");
  return out;
}
