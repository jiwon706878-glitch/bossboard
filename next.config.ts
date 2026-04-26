import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import withBundleAnalyzer from "@next/bundle-analyzer";

const isTauriBuild = process.env.TAURI_BUILD === "true";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  ...(isTauriBuild ? { output: "export" } : {}),
  images: {
    unoptimized: isTauriBuild,
  },
  async headers() {
    return [
      // Security headers — all routes
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      // API routes — no caching
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, must-revalidate" },
        ],
      },
      // Dashboard — private, no caching
      {
        source: "/dashboard/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, must-revalidate" },
        ],
      },
      // Marketing pages — public, cacheable
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/developers",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=7200, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/privacy",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800" },
        ],
      },
      {
        source: "/terms",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=604800" },
        ],
      },
    ];
  },
};

export default withSentryConfig(bundleAnalyzer(nextConfig), {
  silent: true,
  org: process.env.SENTRY_ORG || "bossboard",
  project: process.env.SENTRY_PROJECT || "bossboard-web",
});
