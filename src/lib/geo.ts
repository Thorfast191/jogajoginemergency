// Approximate scan location, taken from the geolocation headers a CDN or
// reverse proxy adds. Nothing is looked up and no IP is stored — these are
// hints the edge already computed, and they are absent in local development.

type HeaderBag = { get(name: string): string | null };

const CITY = ["cf-ipcity", "x-vercel-ip-city", "x-geo-city"];
const REGION = ["cf-region", "x-vercel-ip-country-region", "x-geo-region"];
const COUNTRY = ["cf-ipcountry", "x-vercel-ip-country", "x-geo-country"];

export type ApproxLocation = {
  approxCity: string | null;
  approxRegion: string | null;
  approxCountry: string | null;
};

function first(headers: HeaderBag, names: string[]): string | null {
  for (const name of names) {
    const raw = headers.get(name);
    if (!raw) continue;
    // Values arrive percent-encoded from some edges ("Dhaka" vs "Dhaka%20City").
    const value = decodeURIComponent(raw).trim();
    if (value && value !== "XX") return value.slice(0, 80);
  }
  return null;
}

export function approxLocationFrom(headers: HeaderBag): ApproxLocation {
  return {
    approxCity: first(headers, CITY),
    approxRegion: first(headers, REGION),
    approxCountry: first(headers, COUNTRY),
  };
}

/** "Dhaka, Bangladesh" — or null when the edge told us nothing. */
export function formatLocation(loc: ApproxLocation): string | null {
  const parts = [loc.approxCity, loc.approxRegion, loc.approxCountry].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
