import type { AccountRow, WarmupMode } from "@/lib/data/accounts";
import type { Platform } from "@/lib/platform";

/**
 * Invented phones and accounts for the Accounts page's by-phone view —
 * design ticket P4.
 *
 * WHY THIS EXISTS. No account has been moved to the Physical fleet yet and no
 * phone has been registered, so the real by-phone view draws nothing at all and
 * there is no design to judge. Garreth asked for invented data (2026-09-22),
 * the same way the To-do screens were drawn.
 *
 * It is NEVER the default: the page shows real data unless `?demo=1` is on the
 * URL, because Accounts is a working screen on live rows and a placeholder that
 * quietly replaced them would be a lie the day the first account moves over.
 *
 * The phones and handles are the same invented world as
 * `todo-placeholder.ts`, so the two screens describe one farm rather than two.
 * Both files go when PF-02 and PF-04 make this real.
 */

export interface PlaceholderPhone {
  id: number;
  name: string;
  model: string | null;
  isActive: boolean;
}

export const PLACEHOLDER_PHONES: PlaceholderPhone[] = [
  { id: 1, name: "iPhone 1", model: "iPhone 12", isActive: true },
  { id: 2, name: "iPhone 2", model: "iPhone 12", isActive: true },
  { id: 3, name: "iPhone 3", model: "iPhone 13", isActive: true },
  // A phone switched off still has its accounts; they simply do no work.
  { id: 4, name: "iPhone 4", model: "iPhone 13", isActive: false },
];

/** Everything an AccountRow needs that this view does not care about. */
function account(partial: {
  profile: string;
  username: string;
  character: string;
  platform: Platform;
  deviceId: number | null;
  healthStatus?: string;
  ageDays?: number;
  tier?: string;
  daysSinceWarmup?: number | null;
  daysSincePost?: number | null;
  paused?: boolean;
  warmupMode?: WarmupMode;
}): AccountRow {
  const health = partial.healthStatus ?? "healthy";
  return {
    profile: partial.profile,
    username: partial.username,
    character: partial.character,
    platform: partial.platform,
    deliveryMode: "manual",
    deviceId: partial.deviceId,
    warmupMode: partial.warmupMode ?? "manual",
    isActive: true,
    paused: partial.paused ?? false,
    healthStatus: health,
    healthConfidence: null,
    ageDays: partial.ageDays ?? 40,
    tier: partial.tier ?? "full",
    med5: null,
    med5Posts: 0,
    med7d: null,
    suppressedPct: null,
    sampleN: null,
    med28d: null,
    healthReason: null,
    healthCaveat: null,
    systemHealth: health,
    review: null,
    postingErrors: 0,
    warmupErrors: 0,
    latestFailCode: null,
    latestFailMeaning: null,
    loginVerdict: null,
    loginCheckedAt: null,
    bannedAt: null,
    statusNote: null,
    cleanedUp: false,
    daysSinceWarmup: partial.daysSinceWarmup ?? 0,
    lastWarmupAt: null,
    daysSincePost: partial.daysSincePost ?? 0,
    lastPostAt: null,
    override: null,
    effective: null,
  };
}

/**
 * Three phones carrying accounts, a fourth switched off, and two accounts that
 * have not been put on a phone at all — the group that must not vanish
 * (Garreth, 2026-09-22).
 */
export const PLACEHOLDER_ACCOUNTS: AccountRow[] = [
  account({
    profile: "Profile 21",
    username: "character2.daily",
    character: "Character 2",
    platform: "tiktok",
    deviceId: 1,
  }),
  account({
    profile: "Profile 22",
    username: "character2.clips",
    character: "Character 2",
    platform: "instagram",
    deviceId: 1,
    daysSinceWarmup: 1,
    // One account set to Automated, so iPhone 1's phone-wide switch shows the
    // "mixed" state P4 asks for. Before PF-04 that state could be reached by
    // pressing; now that a press on the invented farm deliberately saves
    // nothing, it has to be here to be seen at all.
    warmupMode: "script",
  }),
  account({
    profile: "Profile 23",
    username: "character3.lab",
    character: "Character 3",
    platform: "tiktok",
    deviceId: 2,
    healthStatus: "warming",
    ageDays: 12,
    tier: "warming",
  }),
  account({
    profile: "Profile 24",
    username: "character3.clips",
    character: "Character 3",
    platform: "instagram",
    deviceId: 2,
    healthStatus: "warming",
    ageDays: 12,
    tier: "warming",
  }),
  account({
    profile: "Profile 25",
    username: "character4.notes",
    character: "Character 4",
    platform: "facebook",
    deviceId: 3,
    daysSinceWarmup: 3,
    daysSincePost: 2,
  }),
  account({
    profile: "Profile 26",
    username: "character4.daily",
    character: "Character 4",
    platform: "tiktok",
    deviceId: 3,
    healthStatus: "attention",
    daysSinceWarmup: 6,
    daysSincePost: 4,
  }),
  account({
    profile: "Profile 27",
    username: "character5.asmr",
    character: "Character 5",
    platform: "tiktok",
    deviceId: 4,
    paused: true,
    daysSinceWarmup: 9,
    daysSincePost: 9,
  }),
  // Moved to Physical, not yet put on a phone.
  account({
    profile: "Profile 28",
    username: "character5.daily",
    character: "Character 5",
    platform: "tiktok",
    deviceId: null,
    ageDays: 3,
    tier: "new",
    healthStatus: "new",
    daysSinceWarmup: null,
    daysSincePost: null,
  }),
  account({
    profile: "Profile 29",
    username: "character6.clips",
    character: "Character 6",
    platform: "instagram",
    deviceId: null,
    ageDays: 2,
    tier: "new",
    healthStatus: "new",
    daysSinceWarmup: null,
    daysSincePost: null,
  }),
];

/** `?demo=1` — nothing else turns the invented data on. */
export function wantsDemo(value: string | string[] | undefined): boolean {
  return (Array.isArray(value) ? value[0] : value) === "1";
}
