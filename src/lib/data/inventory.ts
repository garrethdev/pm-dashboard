import { INVENTORY_TAG, TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest, sbRpc } from "@/lib/data/supabase";

/**
 * Inventory (plan §5) — rendered from the same views the Mon/Fri digest reads,
 * so the dashboard can never disagree with the email. Verified 2026-08-31:
 * inventory_check is one row per character × bucket over the 14-day window
 * (geelark_profile holds the character rollup label).
 */
export interface InventoryBucket {
  character: string;
  bucket: "glp" | "filler";
  target: number;
  pool: number; // "placeable now" — from the scheduler's own filter
  scheduled: number;
  shortfall: number;
  newAcctNeed: number;
  grandTotal: number;
  daysOfCover: number; // pool ÷ (target/14); 14-day window
}

/**
 * v_scheduler_production_order — the Smart Scheduler 1.0.1 view that tells
 * production *what to make next*, per character x content type. It is the
 * scheduler's own arithmetic (usable pool after quarantine, weekly demand from
 * the registry cadence, days of cover, and the make-up quantity to reach a
 * 21-day buffer), so the Inventory page cannot disagree with what the
 * scheduler will actually be able to place.
 *
 * Full Inventory page only — deliberately not on the homepage card, which
 * stays at the character x bucket rollup.
 */
export interface ProductionOrderRow {
  character: string;
  contentType: string;
  bucket: "glp" | "filler";
  /** Placeable after quarantine is subtracted. */
  usablePool: number;
  quarantined: number;
  weeklyDemand: number;
  daysCover: number;
  slotsMissed14d: number;
  lastMissed: string | null;
  produceToReach21d: number;
  /** EMPTY | CRITICAL | low | ok — the view's own label, not ours. */
  status: string;
}

/**
 * A character whose accounts are ALL paused. It has no demand — the scheduler
 * is not planning for it — so it appears in none of the numbers above, and it
 * must not: those are kept byte-for-byte in step with the Mon/Fri digest.
 * This is a separate, deliberately number-free note so that a character
 * waiting to be switched on is at least visible, with what is ready for it.
 */
export interface PausedCharacter {
  character: string;
  accounts: number;
  lanes: { contentType: string; pool: number }[];
}

export interface InventoryData {
  window: { start: string | null; end: string | null };
  buckets: InventoryBucket[];
  productionOrder: ProductionOrderRow[];
  totalToProduce: number;
  /** Not part of any total — see PausedCharacter. */
  pausedCharacters: PausedCharacter[];
}

async function fetchInventory(): Promise<InventoryData> {
  const [checks, order, accounts, pools] = await Promise.all([
    sbRest<
      {
        character: string;
        bucket: string;
        scheduled_in_window: number;
        target: number;
        pool_available: string | number | null;
        shortfall: number;
        new_acct_need: number;
        grand_total: number;
        iso_week_start: string | null;
        iso_week_end: string | null;
      }[]
    >(
      "inventory_check?select=character,bucket,scheduled_in_window,target,pool_available,shortfall,new_acct_need,grand_total,iso_week_start,iso_week_end",
    ),
    // Numerics arrive as strings over PostgREST, hence the Number() below.
    sbRest<
      {
        character: string;
        content_type: string;
        bucket: string;
        usable_pool: string | number | null;
        quarantined: string | number | null;
        weekly_demand: string | number | null;
        days_cover: string | number | null;
        slots_missed_14d: string | number | null;
        last_missed: string | null;
        produce_to_reach_21d: string | number | null;
        status: string;
      }[]
    >(
      "v_scheduler_production_order?select=character,content_type,bucket,usable_pool,quarantined,weekly_demand,days_cover,slots_missed_14d,last_missed,produce_to_reach_21d,status&order=days_cover.asc",
    ),
    sbRest<{ character: string | null; posting_paused: boolean | null }[]>(
      "accounts?select=character,posting_paused&is_active=eq.true&character=like.Character*",
    ),
    sbRest<{ content_type: string; character: string; pool_n: number }[]>(
      "v_scheduler_pool?select=content_type,character,pool_n",
    ),
  ]);

  // "All paused" means every live account for that character, not merely one.
  const byCharacter = new Map<string, { total: number; paused: number }>();
  for (const a of accounts) {
    if (!a.character) continue;
    const e = byCharacter.get(a.character) ?? { total: 0, paused: 0 };
    e.total += 1;
    if (a.posting_paused === true) e.paused += 1;
    byCharacter.set(a.character, e);
  }
  const pausedCharacters: PausedCharacter[] = [...byCharacter.entries()]
    .filter(([, e]) => e.total > 0 && e.total === e.paused)
    .map(([character, e]) => ({
      character,
      accounts: e.total,
      lanes: pools
        .filter((p) => p.character === character)
        .map((p) => ({ contentType: p.content_type, pool: p.pool_n }))
        .sort((x, y) => x.contentType.localeCompare(y.contentType)),
    }))
    .sort((a, b) => a.character.localeCompare(b.character));

  const buckets = checks
    .map((c): InventoryBucket => {
      const pool = Number(c.pool_available ?? 0);
      return {
        character: c.character,
        bucket: c.bucket === "filler" ? "filler" : "glp",
        target: c.target,
        pool,
        scheduled: c.scheduled_in_window,
        shortfall: c.shortfall,
        newAcctNeed: c.new_acct_need,
        grandTotal: c.grand_total,
        daysOfCover: c.target > 0 ? (pool / (c.target / 14)) : 14,
      };
    })
    .sort((a, b) => a.character.localeCompare(b.character) || b.bucket.localeCompare(a.bucket)); // glp before filler

  return {
    window: { start: checks[0]?.iso_week_start ?? null, end: checks[0]?.iso_week_end ?? null },
    buckets,
    productionOrder: order.map(
      (o): ProductionOrderRow => ({
        character: o.character,
        contentType: o.content_type,
        bucket: o.bucket === "filler" ? "filler" : "glp",
        usablePool: Number(o.usable_pool ?? 0),
        quarantined: Number(o.quarantined ?? 0),
        weeklyDemand: Number(o.weekly_demand ?? 0),
        daysCover: Number(o.days_cover ?? 0),
        slotsMissed14d: Number(o.slots_missed_14d ?? 0),
        lastMissed: o.last_missed,
        produceToReach21d: Number(o.produce_to_reach_21d ?? 0),
        status: o.status,
      }),
    ),
    totalToProduce: checks.reduce((acc, c) => acc + (c.grand_total ?? 0), 0),
    pausedCharacters,
  };
}

// v4: added pausedCharacters. The suffix is bumped whenever InventoryData
// changes shape — a cache entry written by the previous version has no such
// field, and the page crashed on `characters.length` reading it back.
export const getInventory = cachedFetcher("inventory-data-v4", TTL.supabase, fetchInventory, {
  tags: [INVENTORY_TAG],
});

/* ── Demand vs supply, parameterised window ────────────────────────────────── */

/**
 * The card's window switcher. `inventory_check` is a fixed 14-day view, so the
 * toggle is backed by inventory_rollup(p_days, …) instead — a set-returning
 * function added 2026-09-04 alongside the view rather than replacing it, because
 * the Mon/Fri digest email reads `inventory_check` directly.
 *
 * Verified at migration time: inventory_rollup(14) reproduces inventory_check
 * row-for-row (target, scheduled, pool, shortfall — 0 mismatches over 6 rows),
 * so the dashboard still cannot disagree with the email.
 */
export type InventoryRangeKey = "7d" | "14d" | "30d";

export const INVENTORY_RANGES: { key: InventoryRangeKey; label: string; days: number }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "14d", label: "14 days", days: 14 },
  { key: "30d", label: "1 month", days: 30 },
];

export interface DemandSupplyRow {
  character: string;
  bucket: "glp" | "filler";
  target: number;
  scheduled: number;
  pool: number;
  shortfall: number;
  /** Extra demand from the "what if we add N accounts" overlay; 0 when unused. */
  newAcctAdd: number;
  grandTotal: number;
  daysOfCover: number;
}

export interface DemandSupplyData {
  window: { start: string | null; end: string | null; days: number };
  rows: DemandSupplyRow[];
  totalToProduce: number;
  /** Characters offered in the what-if picker. */
  characters: string[];
}

interface RawRollupRow {
  character: string;
  bucket: string;
  target: string | number | null;
  scheduled_in_window: string | number | null;
  pool_available: string | number | null;
  shortfall: string | number | null;
  new_acct_add: string | number | null;
  grand_total: string | number | null;
  days_of_cover: string | number | null;
  window_start: string | null;
  window_end: string | null;
}

/**
 * @param days      7 | 14 | 30 — the horizon the RPC recomputes over. `scheduled`
 *                  is a real count per window and `pool` is a stock, so neither
 *                  is scaled client-side.
 * @param newAccts  what-if: how many accounts to pretend we add today.
 * @param newChar   what-if: which character those accounts belong to.
 */
export async function getDemandSupply(
  days: number,
  newAccts = 0,
  newChar: string | null = null,
) {
  const n = (v: string | number | null) => Number(v ?? 0);
  return cachedFetcher(
    `inventory-rollup-v1:${days}:${newAccts}:${newChar ?? "-"}`,
    TTL.supabase,
    async (): Promise<DemandSupplyData> => {
      const raw = await sbRpc<RawRollupRow[]>("inventory_rollup", {
        p_days: days,
        p_new_accounts: newAccts,
        p_new_character: newChar,
      });
      const rows = raw.map(
        (r): DemandSupplyRow => ({
          character: r.character,
          bucket: r.bucket === "filler" ? "filler" : "glp",
          target: n(r.target),
          scheduled: n(r.scheduled_in_window),
          pool: n(r.pool_available),
          shortfall: n(r.shortfall),
          newAcctAdd: n(r.new_acct_add),
          grandTotal: n(r.grand_total),
          daysOfCover: n(r.days_of_cover),
        }),
      );
      return {
        window: { start: raw[0]?.window_start ?? null, end: raw[0]?.window_end ?? null, days },
        rows,
        totalToProduce: rows.reduce((acc, r) => acc + r.grandTotal, 0),
        characters: [...new Set(rows.map((r) => r.character))].sort(),
      };
    },
    // One key per (window, what-if), so the family tag is the only way Refresh
    // reaches whichever combination is on screen.
    { tags: [INVENTORY_TAG] },
  )();
}
