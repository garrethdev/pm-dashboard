import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // /cadence was folded into /content-calendar (2026-09-06): the lane mix moved
  // into the "Adjust Cadence" dialog and the per-account limits table moved
  // under the calendar. Permanent, because the old URL is in people's history
  // and there is nothing left at it.
  async redirects() {
    return [{ source: "/cadence", destination: "/content-calendar", permanent: true }];
  },
};

export default nextConfig;
