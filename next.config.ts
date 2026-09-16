import type { NextConfig } from "next";
import { ACTION_BODY_LIMIT_BYTES } from "./src/lib/upload-limits";

// A Content-Security-Policy tight enough to be worth having, and loose enough
// for what this app actually does. Next injects inline bootstrap scripts and
// Tailwind ships inline styles, hence 'unsafe-inline' on those two; everything
// else is same-origin only. `data:` is allowed for images because QR codes are
// rendered to data URLs in the client area. In development, Turbopack's HMR
// needs eval and a websocket back to the dev server.
const development = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${development ? " ws: wss:" : ""}`,
  // Nothing here is embeddable, and nothing here embeds anything.
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // Payment callbacks POST back to this origin; nothing else may.
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",

  // Uploads go through Server Actions, whose 1 MB default body cap would
  // refuse most phone photos before the action's own limit is ever checked.
  experimental: {
    serverActions: { bodySizeLimit: ACTION_BODY_LIMIT_BYTES },
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          ...securityHeaders,
          // HSTS is meaningless over http and harmful to a local dev machine,
          // where it would pin localhost to https in the browser.
          ...(development
            ? []
            : [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
      {
        // A scan page can carry someone's medical details. Belt and braces
        // alongside the `robots` metadata the route itself exports.
        source: "/t/:shortCode*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },

  async redirects() {
    return [{ source: "/pricing", destination: "/shop", permanent: true }];
  },
};

export default nextConfig;
