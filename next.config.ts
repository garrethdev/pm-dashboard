import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The documentation serves these pinned assets locally, including in Vercel bundles.
  outputFileTracingIncludes: {
    "/api/carousel-generator/docs/assets/*": ["./node_modules/swagger-ui-dist/swagger-ui.css", "./node_modules/swagger-ui-dist/swagger-ui-bundle.js"],
  },
  /**
   * Keep a visited page in the browser for a short while, so going back to one
   * is instant instead of a fresh round trip.
   *
   * Next defaults the dynamic entry to 0, which means every navigation refetches
   * even if you were just there a second ago. Every page here is dynamic, and
   * from Manila a round trip to iad1 is roughly half a second, so the second
   * visit to Inventory cost exactly as much as the first and showed the loading
   * state again.
   *
   * 30s is deliberately under the 60s Supabase TTL these pages already read
   * through, so this never serves anything older than the server would have.
   * Writes are unaffected: every mutation path calls router.refresh(), which
   * drops this cache, and the Refresh button expires the server tags first.
   */
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },

  // The slide-image converter (HEIC to JPEG for the Trends screens) runs on
  // the server and ships its own WebAssembly, so it is loaded from
  // node_modules as is instead of being bundled.
  serverExternalPackages: ["heic-decode", "libheif-js", "sharp"],

  // /cadence was folded into /content-calendar (2026-09-06): the lane mix moved
  // into the "Adjust Cadence" dialog and the per-account limits table moved
  // under the calendar. Permanent, because the old URL is in people's history
  // and there is nothing left at it.
  async redirects() {
    return [{ source: "/cadence", destination: "/content-calendar", permanent: true }];
  },
};

export default nextConfig;
