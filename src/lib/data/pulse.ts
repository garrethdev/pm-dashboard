import { TTL, cachedFetcher } from "@/lib/data/cache";
import { fleetTone } from "@/lib/health";
import { sbRest } from "@/lib/data/supabase";
import type { PillTone } from "@/components/ui/pill";

/**
 * Homepage pulse stats (plan §3) — the four "is anything wrong?" cards.
 * Scheduler / posts / accounts come from Supabase; wallet from GeeLark.
 */
export interface PulseStat {
  label: string;
  value: string;
  sub: string;
  subTone: PillTone;
}

async function accountsStat(): Promise<PulseStat> {
  // Every live account counts — healthy, collapsing, warming, whatever — as long
  // as it is not banned/retired (is_active=false). Deliberately NO character
  // filter: new accounts are recorded before a character is assigned (P71/P72),
  // and filtering on it made this pill disagree with the Accounts table.
  const active = await sbRest<{ geelark_profile: string }[]>(
    "accounts?select=geelark_profile&is_active=eq.true",
  );
  const dayAgo = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const bannedToday = await sbRest<{ geelark_profile: string }[]>(
    `accounts?select=geelark_profile&banned_at=gte.${dayAgo}`,
  );
  const dropped = bannedToday.length;
  const n = active.length;
  const subTone: PillTone = fleetTone(n);
  return {
    label: "Active accounts",
    value: String(n),
    sub: dropped > 0 ? `−${dropped} vs yesterday` : "stable",
    subTone,
  };
}

// Wallet balance is shown as its own homepage card (see wallet.ts /
// geelark-wallet-card.tsx), so it's intentionally no longer a pulse pill.
async function fetchPulse(): Promise<PulseStat[]> {
  return Promise.all([accountsStat()]);
}

export const getPulse = cachedFetcher("pulse-stats", TTL.supabase, fetchPulse);
