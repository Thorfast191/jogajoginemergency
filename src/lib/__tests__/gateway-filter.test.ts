import { describe, it, expect } from "vitest";
import { enabledProviderIds } from "../gateway-filter";

describe("enabledProviderIds", () => {
  it("hides the gateways a super admin switched off, keeping the offer order", () => {
    expect(enabledProviderIds(["DEMO", "BKASH", "NAGAD"], ["BKASH"])).toEqual(["DEMO", "NAGAD"]);
  });

  it("offers everything configured when nothing is switched off", () => {
    expect(enabledProviderIds(["BKASH", "SSLCOMMERZ"], [])).toEqual(["BKASH", "SSLCOMMERZ"]);
  });

  it("ignores switched-off ids that aren't configured anyway", () => {
    expect(enabledProviderIds(["BKASH", "NAGAD"], ["STRIPE", "nonsense"])).toEqual(["BKASH", "NAGAD"]);
  });

  // The settings row can only take a gateway away. A gateway with no
  // credentials in the environment must never appear because of a setting —
  // DEMO in production would hand out free orders.
  it("never adds a gateway the environment didn't configure", () => {
    expect(enabledProviderIds(["SSLCOMMERZ"], ["DEMO"])).toEqual(["SSLCOMMERZ"]);
  });
});
