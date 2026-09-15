import { getSettings } from "@/lib/settings";
import { enabledProviderIds } from "@/lib/gateway-filter";
import { availableGateways, gatewayFor } from "./registry";
import { GatewayError, type PaymentGateway } from "./types";

// What checkout and the subscription page may offer: configured gateways that a
// super admin hasn't switched off.
//
// Settlement deliberately keeps using gatewayFor directly. A payment already in
// flight when a gateway is switched off must still be verified and settled, or
// the customer is charged for an order that never completes.

export async function enabledGateways(): Promise<PaymentGateway[]> {
  const { disabledGateways } = await getSettings();
  const all = availableGateways();
  const allowed = new Set(enabledProviderIds(all.map((g) => g.id), disabledGateways));
  return all.filter((g) => allowed.has(g.id));
}

/** Resolve a gateway a customer chose, refusing one that's switched off. */
export async function enabledGatewayFor(id: string): Promise<PaymentGateway> {
  const gateway = gatewayFor(id);
  const { disabledGateways } = await getSettings();
  if (disabledGateways.includes(gateway.id)) {
    throw new GatewayError("That payment method isn't available.");
  }
  return gateway;
}
