import { configuredProviders } from "./config";
import { demoGateway } from "./demo";
import { sslcommerzGateway } from "./sslcommerz";
import { bkashGateway } from "./bkash";
import { nagadGateway } from "./nagad";
import { GatewayError, type PaymentGateway, type ProviderId } from "./types";

const ALL: Record<ProviderId, PaymentGateway> = {
  DEMO: demoGateway,
  SSLCOMMERZ: sslcommerzGateway,
  BKASH: bkashGateway,
  NAGAD: nagadGateway,
};

/** The gateways this deployment can actually use, in the order to offer them. */
export function availableGateways(): PaymentGateway[] {
  return configuredProviders().map((id) => ALL[id]);
}

/**
 * Resolve a provider chosen by the customer.
 *
 * The id arrives from a form, so it is checked against what this deployment
 * has configured rather than the full list — otherwise a crafted request could
 * select DEMO in production and get an order fulfilled for nothing.
 */
export function gatewayFor(id: string): PaymentGateway {
  if (!configuredProviders().includes(id as ProviderId)) {
    throw new GatewayError("That payment method isn't available.");
  }
  return ALL[id as ProviderId];
}

export function isConfigured(id: string): boolean {
  return configuredProviders().includes(id as ProviderId);
}
