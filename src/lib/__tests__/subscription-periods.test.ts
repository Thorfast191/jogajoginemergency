import { describe, it, expect } from "vitest";
import {
  addMonths,
  daysLeft,
  extendPeriod,
  intervalLabel,
  subscriptionBucket,
} from "../subscription-periods";

const at = (iso: string) => new Date(iso);
const DAY = 24 * 60 * 60 * 1000;

describe("addMonths", () => {
  it("adds calendar months, keeping the time of day", () => {
    expect(addMonths(at("2026-03-15T10:00:00Z"), 12)).toEqual(at("2027-03-15T10:00:00Z"));
    expect(addMonths(at("2026-11-20T00:00:00Z"), 3)).toEqual(at("2027-02-20T00:00:00Z"));
  });

  // Jan 31 + 1 month must not overflow into March.
  it("clamps to the end of a shorter month", () => {
    expect(addMonths(at("2026-01-31T10:00:00Z"), 1)).toEqual(at("2026-02-28T10:00:00Z"));
    expect(addMonths(at("2028-01-31T10:00:00Z"), 1)).toEqual(at("2028-02-29T10:00:00Z"));
  });
});

describe("extendPeriod", () => {
  const now = at("2026-09-15T00:00:00Z");

  it("adds to the period end when it is still in the future, so renewing early loses nothing", () => {
    expect(extendPeriod(at("2026-10-01T00:00:00Z"), 3, now)).toEqual(at("2027-01-01T00:00:00Z"));
  });

  it("starts from today when the period already lapsed", () => {
    expect(extendPeriod(at("2026-01-01T00:00:00Z"), 1, now)).toEqual(at("2026-10-15T00:00:00Z"));
  });
});

describe("daysLeft", () => {
  const now = at("2026-09-15T00:00:00Z");

  it("rounds a part day up", () => {
    expect(daysLeft(new Date(now.getTime() + 1.2 * DAY), now)).toBe(2);
  });

  it("is zero once the period has ended", () => {
    expect(daysLeft(now, now)).toBe(0);
    expect(daysLeft(new Date(now.getTime() - 3 * DAY), now)).toBe(0);
  });
});

describe("subscriptionBucket", () => {
  const now = at("2026-09-15T00:00:00Z");
  const inDays = (d: number) => new Date(now.getTime() + d * DAY);

  it("calls a paid-up subscription with time to spare active", () => {
    expect(subscriptionBucket({ status: "ACTIVE", currentPeriodEnd: inDays(30) }, now)).toBe("active");
    expect(subscriptionBucket({ status: "TRIALING", currentPeriodEnd: inDays(30) }, now)).toBe("active");
  });

  it("flags one ending within a week as expiring", () => {
    expect(subscriptionBucket({ status: "ACTIVE", currentPeriodEnd: inDays(3) }, now)).toBe("expiring");
    expect(subscriptionBucket({ status: "ACTIVE", currentPeriodEnd: inDays(7) }, now)).toBe("expiring");
  });

  // The same rule the scan page uses: a lapsed period does not entitle,
  // whatever the status column still says.
  it("calls a lapsed period expired even if the row still says ACTIVE", () => {
    expect(subscriptionBucket({ status: "ACTIVE", currentPeriodEnd: inDays(-1) }, now)).toBe("expired");
    expect(subscriptionBucket({ status: "PAST_DUE", currentPeriodEnd: inDays(10) }, now)).toBe("expired");
  });

  it("keeps cancelled subscriptions in their own bucket", () => {
    expect(subscriptionBucket({ status: "CANCELED", currentPeriodEnd: inDays(20) }, now)).toBe("cancelled");
  });
});

describe("intervalLabel", () => {
  it("names the billing periods a plan can have", () => {
    expect(intervalLabel(1)).toBe("month");
    expect(intervalLabel(6)).toBe("6 months");
    expect(intervalLabel(12)).toBe("year");
  });
});
