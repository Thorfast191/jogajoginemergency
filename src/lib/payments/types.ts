import type { SettleStatus } from "./core";

export type ProviderId = "DEMO" | "SSLCOMMERZ" | "BKASH" | "NAGAD";

export type PaymentIntent = {
  /** Our Payment.id. This is the merchant reference handed to the gateway. */
  paymentId: string;
  amountCents: number;
  currency: string;
  description: string;
  customer: { name: string; email: string; phone?: string | null };
  /** Where the gateway returns the customer. Always absolute. */
  callbackUrl: string;
};

export type InitiateResult = {
  /** Where to send the customer to pay. */
  redirectUrl: string;
  /** The gateway's handle for this in-flight payment, if it issues one. */
  gatewayPaymentId?: string | null;
};

export type VerifyResult = {
  status: SettleStatus;
  /** The gateway's own transaction id, once the money has moved. */
  providerRef?: string | null;
  /** Amount and currency as the gateway reports them, for tamper checking. */
  amount?: string | number | null;
  currency?: string | null;
  reason?: string;
};

export type PaymentRecord = {
  id: string;
  amountCents: number;
  currency: string;
  gatewayPaymentId: string | null;
};

export interface PaymentGateway {
  readonly id: ProviderId;
  readonly label: string;

  /** Create a payment at the gateway and return where to send the customer. */
  initiate(intent: PaymentIntent): Promise<InitiateResult>;

  /**
   * Establish what actually happened, by asking the gateway.
   *
   * `params` is the callback query/body, which is attacker-controlled and used
   * only to look things up — never as evidence. Implementations must reach the
   * provider's own verification or execution endpoint before reporting
   * SUCCEEDED.
   */
  verify(params: Record<string, string>, payment: PaymentRecord): Promise<VerifyResult>;
}

export class GatewayError extends Error {}
