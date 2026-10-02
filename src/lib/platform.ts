/**
 * The platforms an account can live on, and everything the screens need to
 * name one (PF-08). Kept free of server imports so tables, filters and the
 * later Posting To-Do and warmup pages can all read from here.
 *
 * Facebook is an account platform only. Nothing ingests Facebook performance
 * yet, so `hasAnalytics` is what every views/top-posts path checks before it
 * picks a performance table. A Facebook account must never be read out of the
 * TikTok tables: it would come back as zero views and look dead.
 */
export const PLATFORMS = ["tiktok", "instagram", "facebook"] as const;
export type Platform = (typeof PLATFORMS)[number];

/** The platforms that have a performance feed behind them today. */
export type AnalyticsPlatform = "tiktok" | "instagram";

export const PLATFORM_LABEL: Record<Platform, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
};

export const PLATFORM_SHORT_LABEL: Record<Platform, string> = {
  tiktok: "TT",
  instagram: "IG",
  facebook: "FB",
};

export function isPlatform(raw: unknown): raw is Platform {
  return typeof raw === "string" && (PLATFORMS as readonly string[]).includes(raw);
}

/**
 * accounts.platform is free text in the database. Anything unrecognised reads
 * as TikTok, as it always has (the oldest rows predate the column being filled
 * consistently); the three known values are matched exactly.
 */
export function toPlatform(raw: string | null | undefined): Platform {
  const v = raw?.trim().toLowerCase();
  return isPlatform(v) ? v : "tiktok";
}

export function hasAnalytics(platform: Platform): platform is AnalyticsPlatform {
  return platform === "tiktok" || platform === "instagram";
}

/** Public profile page for a handle; null when there is no handle yet. */
export function platformProfileUrl(
  platform: Platform,
  username: string | null | undefined,
): string | null {
  const handle = username?.trim().replace(/^@/, "");
  if (!handle) return null;
  const h = encodeURIComponent(handle);
  switch (platform) {
    case "instagram":
      return `https://www.instagram.com/${h}/`;
    case "facebook":
      // A Facebook account with no username is kept as its page number, and
      // one given by the app's Copy link as "share/<code>" (account-rules.ts).
      if (/^\d+$/.test(handle)) return `https://www.facebook.com/profile.php?id=${handle}`;
      if (handle.startsWith("share/")) {
        return `https://www.facebook.com/share/${encodeURIComponent(handle.slice("share/".length))}/`;
      }
      return `https://www.facebook.com/${h}`;
    case "tiktok":
      return `https://www.tiktok.com/@${h}`;
  }
}

/**
 * A handle as it is shown: "@cleora" on TikTok and Instagram. Facebook has no
 * @-names, and its accounts are often kept as a page number or a share code,
 * so a Facebook one is shown as it is stored. Null when there is no handle.
 */
export function handleLabel(platform: Platform, username: string | null | undefined): string | null {
  if (!username) return null;
  return platform === "facebook" ? username : `@${username}`;
}

/** Which platforms a filter should offer: all three in Physical, the ones in the list in Cloud. */
export function platformsToOffer(
  fleet: "cloud" | "physical" | undefined,
  inList: Iterable<Platform>,
): Iterable<Platform> {
  return fleet === "physical" ? PLATFORMS : inList;
}

/**
 * Options for a platform filter control, "All" first.
 *
 * Facebook is offered when `present` includes it. Callers pass every platform
 * in Physical, where Facebook accounts live, so the filter is always there even
 * before the first Facebook account exists (Garreth, 2026-09-19: it was being
 * hidden until one existed, which read as Facebook missing). In Cloud they pass
 * the platforms in the list, so Cloud keeps the All / TT / IG filter it always
 * had. See `platformsToOffer`.
 */
export function platformFilterOptions(
  present: Iterable<Platform> = PLATFORMS,
  labels: Record<Platform, string> = PLATFORM_SHORT_LABEL,
): { value: "all" | Platform; label: string }[] {
  const has = new Set(present);
  return [
    { value: "all", label: "All" },
    ...PLATFORMS.filter((p) => p !== "facebook" || has.has(p)).map((p) => ({
      value: p,
      label: labels[p],
    })),
  ];
}
