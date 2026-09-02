import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    return [{ source: "/pricing", destination: "/shop", permanent: true }];
  },
};

export default nextConfig;
