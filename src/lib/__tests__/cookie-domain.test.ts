import { describe, it, expect } from "vitest";
import { sessionCookieDomain } from "../cookie-domain";

const P = "https://jogajoginemergency.com";
const C = "https://client.jogajoginemergency.com";
const A = "https://admin.jogajoginemergency.com";

describe("sessionCookieDomain — one sign-in across three hostnames", () => {
  it("is the parent domain the three share", () => {
    expect(sessionCookieDomain([P, C, A])).toBe("jogajoginemergency.com");
  });

  it("is null when every area is the same host — nothing to share", () => {
    expect(sessionCookieDomain([P, P, P])).toBeNull();
    expect(sessionCookieDomain(["http://localhost:3005", "http://localhost:3005"])).toBeNull();
  });

  it("is null for hosts that cannot carry a Domain attribute", () => {
    // A cookie cannot be scoped to an IP, and `localhost` has no parent.
    expect(sessionCookieDomain(["http://163.61.236.109", "http://163.61.236.109:3000"])).toBeNull();
    expect(sessionCookieDomain(["http://localhost:3000", "http://client.localhost:3000"])).toBeNull();
  });

  it("refuses a suffix a browser would reject", () => {
    // Two unrelated domains share only "com", which is a public suffix: issuing
    // a cookie for it would hand the session to every site on the internet.
    expect(sessionCookieDomain(["https://one.com", "https://two.com"])).toBeNull();
  });

  it("handles a deeper shared parent", () => {
    expect(
      sessionCookieDomain(["https://a.apps.example.co", "https://b.apps.example.co"]),
    ).toBe("apps.example.co");
  });

  it("is null when an origin is unparseable, rather than guessing", () => {
    expect(sessionCookieDomain([P, "not a url"])).toBeNull();
  });
});
