import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Single-day pages were replaced by the calendar; keep old links working.
  async redirects() {
    return [
      { source: "/day/:date", destination: "/calendar?day=:date", permanent: true },
      { source: "/upcoming", destination: "/glance", permanent: true },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
