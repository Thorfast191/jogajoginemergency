import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  areaForHost,
  areaForPath,
  areasAreSplit,
  adminHref,
  clientHref,
  homeForRole,
  hrefIn,
  landingPathFor,
  pathBelongsTo,
  publicOrigin,
} from "../hosts";

const PUBLIC = "https://jogajoginemergency.com";
const CLIENT = "https://client.jogajoginemergency.com";
const ADMIN = "https://admin.jogajoginemergency.com";

const saved = { ...process.env };

function split() {
  process.env.NEXT_PUBLIC_APP_URL = PUBLIC;
  process.env.NEXT_PUBLIC_CLIENT_URL = CLIENT;
  process.env.NEXT_PUBLIC_ADMIN_URL = ADMIN;
}

function singleHost() {
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3005";
  delete process.env.NEXT_PUBLIC_CLIENT_URL;
  delete process.env.NEXT_PUBLIC_ADMIN_URL;
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_CLIENT_URL;
  delete process.env.NEXT_PUBLIC_ADMIN_URL;
});
afterEach(() => {
  process.env = { ...saved };
});

describe("a single-host deployment behaves exactly as before", () => {
  beforeEach(singleHost);

  it("is not split", () => {
    expect(areasAreSplit()).toBe(false);
  });

  it("every host is the public area, so nothing is redirected away", () => {
    for (const host of ["localhost:3005", "client.localhost:3005", "admin.localhost:3005"]) {
      expect(areaForHost(host)).toBe("public");
    }
  });

  it("serves every path", () => {
    for (const p of ["/", "/shop", "/dashboard/tags", "/admin/orders", "/t/abc"]) {
      expect(pathBelongsTo("public", p)).toBe(true);
    }
  });

  it("links stay plain paths — no hardcoded port anywhere", () => {
    expect(clientHref("/dashboard")).toBe("/dashboard");
    expect(adminHref("/admin")).toBe("/admin");
    expect(homeForRole("USER")).toBe("/dashboard");
    expect(homeForRole("SUPER_ADMIN")).toBe("/admin");
  });
});

describe("areaForHost", () => {
  beforeEach(split);

  it("reads the three hostnames", () => {
    expect(areaForHost("jogajoginemergency.com")).toBe("public");
    expect(areaForHost("client.jogajoginemergency.com")).toBe("client");
    expect(areaForHost("admin.jogajoginemergency.com")).toBe("admin");
  });

  it("ignores the port and the case", () => {
    expect(areaForHost("ADMIN.jogajoginemergency.com:443")).toBe("admin");
    expect(areaForHost("Client.Jogajoginemergency.Com")).toBe("client");
  });

  it("sends anything unrecognised to the public site, never to a private area", () => {
    // A bare IP, a health check, a stale DNS record, a Host header someone made
    // up. None of them may resolve to the console.
    for (const host of ["163.61.236.109", "www.jogajoginemergency.com", "evil.example", "", null]) {
      expect(areaForHost(host)).toBe("public");
    }
  });
});

describe("pathBelongsTo — each host serves its own area", () => {
  beforeEach(split);

  it("keeps the console off the public site and the shop off the console", () => {
    expect(pathBelongsTo("public", "/admin/orders")).toBe(false);
    expect(pathBelongsTo("public", "/dashboard/tags")).toBe(false);
    expect(pathBelongsTo("admin", "/shop")).toBe(false);
    expect(pathBelongsTo("client", "/shop")).toBe(false);
    expect(pathBelongsTo("client", "/admin")).toBe(false);
    expect(pathBelongsTo("admin", "/dashboard")).toBe(false);
  });

  it("serves each area its own prefix", () => {
    expect(pathBelongsTo("admin", "/admin/orders")).toBe(true);
    expect(pathBelongsTo("client", "/dashboard/tags")).toBe(true);
    expect(pathBelongsTo("public", "/shop/bike-sticker")).toBe(true);
    expect(pathBelongsTo("public", "/t/62Ch7wuR")).toBe(true);
  });

  it("lets every area sign in, call the API and read authorized media", () => {
    for (const area of ["public", "client", "admin"] as const) {
      expect(pathBelongsTo(area, "/login")).toBe(true);
      expect(pathBelongsTo(area, "/api/payments/callback")).toBe(true);
      expect(pathBelongsTo(area, "/media/abc123")).toBe(true);
      expect(pathBelongsTo(area, "/reset-password/tok")).toBe(true);
    }
  });

  it("does not let a prefix match a different word", () => {
    // /administration is not the console; /dashboards is not the client area.
    expect(areaForPath("/administration")).toBe("admin");
    expect(pathBelongsTo("public", "/logindeed")).toBe(true);
  });
});

describe("where a stray path is sent", () => {
  beforeEach(split);

  it("routes a path to the host that owns it", () => {
    expect(areaForPath("/dashboard/tags")).toBe("client");
    expect(areaForPath("/admin/orders")).toBe("admin");
    expect(areaForPath("/shop")).toBe("public");
  });

  it("builds an absolute URL onto the right origin", () => {
    expect(hrefIn("client", "/dashboard/tags")).toBe(`${CLIENT}/dashboard/tags`);
    expect(hrefIn("admin", "/admin/orders")).toBe(`${ADMIN}/admin/orders`);
    expect(hrefIn("public", "/shop")).toBe(`${PUBLIC}/shop`);
  });

  it("tolerates a missing leading slash and a trailing slash on the origin", () => {
    process.env.NEXT_PUBLIC_CLIENT_URL = `${CLIENT}/`;
    expect(hrefIn("client", "dashboard")).toBe(`${CLIENT}/dashboard`);
  });

  it("lands a bare subdomain visit in that area", () => {
    expect(landingPathFor("client")).toBe("/dashboard");
    expect(landingPathFor("admin")).toBe("/admin");
    expect(landingPathFor("public")).toBe("/");
  });

  it("sends each role to its own host after sign-in", () => {
    expect(homeForRole("USER")).toBe(`${CLIENT}/dashboard`);
    expect(homeForRole("ADMIN")).toBe(`${ADMIN}/admin`);
    expect(homeForRole("SUPER_ADMIN")).toBe(`${ADMIN}/admin`);
    expect(homeForRole(null)).toBe(`${CLIENT}/dashboard`);
  });
});

describe("publicOrigin is what QR codes are printed with", () => {
  it("is the main domain even when the areas are split", () => {
    split();
    // A sticker in someone's pocket must outlive any console reshuffle.
    expect(publicOrigin()).toBe(PUBLIC);
  });
});
