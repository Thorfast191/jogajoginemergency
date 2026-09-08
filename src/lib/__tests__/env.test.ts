import { describe, it, expect } from "vitest";
import { checkEnv, appUrlMismatch, assertEnv } from "../env";

const PROD = {
  DATABASE_URL: "postgresql://u:p@db:5432/app",
  AUTH_SECRET: "x".repeat(40),
  IP_HASH_SALT: "a-long-random-salt",
  NEXT_PUBLIC_APP_URL: "https://jogajog.app",
  PAYMENT_MODE: "live",
  SMTP_HOST: "smtp.example.com",
  MAINTENANCE_SECRET: "y".repeat(32),
};

const keys = (issues: { key: string }[]) => issues.map((i) => i.key).sort();

describe("checkEnv in production", () => {
  it("passes a fully configured environment", () => {
    const report = checkEnv(PROD, "production");
    expect(report.errors).toEqual([]);
    expect(report.warnings).toEqual([]);
  });

  it("rejects missing secrets", () => {
    const report = checkEnv({ ...PROD, AUTH_SECRET: undefined, IP_HASH_SALT: "" }, "production");
    expect(keys(report.errors)).toEqual(["AUTH_SECRET", "IP_HASH_SALT"]);
  });

  it("rejects a short signing secret, which looks configured but is not", () => {
    const report = checkEnv({ ...PROD, AUTH_SECRET: "short" }, "production");
    expect(keys(report.errors)).toEqual(["AUTH_SECRET"]);
  });

  it("rejects a plaintext or localhost public URL", () => {
    expect(checkEnv({ ...PROD, NEXT_PUBLIC_APP_URL: "http://jogajog.app" }, "production").errors)
      .toHaveLength(1);
    expect(checkEnv({ ...PROD, NEXT_PUBLIC_APP_URL: "https://localhost:3000" }, "production").errors)
      .toHaveLength(1);
  });

  it("rejects a malformed public URL", () => {
    expect(keys(checkEnv({ ...PROD, NEXT_PUBLIC_APP_URL: "not a url" }, "production").errors))
      .toEqual(["NEXT_PUBLIC_APP_URL"]);
  });

  // The demo gateway hands out paid orders for free.
  it("refuses production unless PAYMENT_MODE is live", () => {
    expect(keys(checkEnv({ ...PROD, PAYMENT_MODE: undefined }, "production").errors))
      .toEqual(["PAYMENT_MODE"]);
    expect(keys(checkEnv({ ...PROD, PAYMENT_MODE: "sandbox" }, "production").errors))
      .toEqual(["PAYMENT_MODE"]);
  });

  it("warns, but does not fail, without mail or a maintenance secret", () => {
    const report = checkEnv(
      { ...PROD, SMTP_HOST: undefined, MAINTENANCE_SECRET: undefined },
      "production",
    );
    expect(report.errors).toEqual([]);
    expect(keys(report.warnings)).toEqual(["MAINTENANCE_SECRET", "SMTP_HOST"]);
  });
});

describe("checkEnv in development", () => {
  it("tolerates localhost, sandbox payments and no mail", () => {
    const report = checkEnv(
      {
        DATABASE_URL: "postgresql://localhost:5433/app",
        AUTH_SECRET: "x".repeat(40),
        IP_HASH_SALT: "dev-salt",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      },
      "development",
    );
    expect(report.errors).toEqual([]);
  });

  it("still treats a missing database as fatal", () => {
    expect(keys(checkEnv({}, "development").errors)).toEqual(["AUTH_SECRET", "DATABASE_URL"]);
  });
});

describe("appUrlMismatch", () => {
  it("is silent when the request origin matches the configured one", () => {
    expect(appUrlMismatch("jogajog.app", "https://jogajog.app")).toBeNull();
    expect(appUrlMismatch("localhost:3000", "http://localhost:3000")).toBeNull();
  });

  it("ignores case differences in the host", () => {
    expect(appUrlMismatch("JogaJog.app", "https://jogajog.app")).toBeNull();
  });

  // Exactly the reported bug: the app answered on 3001 while callbacks were
  // addressed to 3000, where a different app was listening.
  it("reports a port mismatch, naming both sides", () => {
    const warning = appUrlMismatch("localhost:3001", "http://localhost:3000");
    expect(warning).toContain("localhost:3001");
    expect(warning).toContain("localhost:3000");
  });

  it("says so when the configured URL is unparseable", () => {
    expect(appUrlMismatch("localhost:3000", "://broken")).toContain("not a valid URL");
  });

  it("stays quiet when the request host is unknown", () => {
    expect(appUrlMismatch(null, "https://jogajog.app")).toBeNull();
  });
});

describe("assertEnv", () => {
  it("throws in production rather than starting misconfigured", () => {
    expect(() => assertEnv({ ...PROD, AUTH_SECRET: undefined }, "production")).toThrow(
      /Refusing to start/,
    );
  });

  it("returns the report in development instead of throwing", () => {
    expect(() => assertEnv({}, "development")).not.toThrow();
    expect(assertEnv({}, "development").errors.length).toBeGreaterThan(0);
  });
});
