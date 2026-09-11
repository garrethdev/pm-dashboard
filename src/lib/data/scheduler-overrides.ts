import { ACCOUNTS_TAG, TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";

/**
 * Per-account Smart Scheduler overrides.
 *
 * `scheduler_overrides` was built and wired into v_scheduler_account_config
 * long before anything wrote to it — the resolution chain is already
 *   account override -> character override -> fleet default -> hardcoded
 * so this module only has to put rows in the table.
 *
 * Shape gotcha: the caps live on THREE rows per account, keyed by bucket —
 *   bucket = null      -> max_posts_per_day (the whole-account daily cap)
 *   bucket = 'glp'     -> weekly_cap        (GLP posts per week)
 *   bucket = 'filler'  -> weekly_cap        (filler posts per week)
 * The dashboard treats them as one setting and writes them as a unit; the
 * bucket split is a storage detail, never shown to the user.
 *
 * `bypass_guards` and `only_content_types` are read off the bucket = null row,
 * which is the account-level row.
 */

export const OVERRIDE_SCOPE = "account";

export interface AccountOverride {
  /** false = saved but switched off; the scheduler uses its own defaults. */
  active: boolean;
  /** Skips the age ramp and the health throttle. Never the delivery brake. */
  bypassGuards: boolean;
  maxPostsPerDay: number | null;
  glpWeekCap: number | null;
  fillerWeekCap: number | null;
  /** null = every active content type for the character. */
  onlyContentTypes: string[] | null;
  note: string | null;
}

/** One selectable content type, with how much of it is actually sitting ready. */
export interface ContentTypeOption {
  contentType: string;
  displayName: string;
  /** 'glp' | 'filler' — filler is planned by a separate loop in the scheduler. */
  bucket: string | null;
  /** Placeable rows right now. Pinning an account to an empty pool posts nothing. */
  poolN: number;
}

/** What the scheduler resolves for an account today, before any new override. */
export interface EffectiveConfig {
  maxPostsPerDay: number;
  glpWeekCap: number;
  fillerWeekCap: number;
  ageDays: number | null;
  /** Why the caps were clamped ("ramp: under 9 days old", "health: collapsing"). */
  throttleReason: string | null;
  canDeliver: boolean;
  /** Highest posts/day the age ramp and health throttle will allow, ignoring any
   *  override already set. null = neither guard applies. This is what says which
   *  DIRECTION of a change is possible: maxPostsPerDay already folds the override
   *  in, so it can answer "what happens now" but not "how high could this go". */
  guardDayCap: number | null;
}

interface RawOverride {
  scope_key: string;
  bucket: string | null;
  weekly_cap: number | null;
  daily_cap: number | null;
  max_posts_per_day: number | null;
  bypass_guards: boolean;
  only_content_types: string[] | null;
  active: boolean;
  note: string | null;
}

const OVERRIDE_COLS =
  "scope_key,bucket,weekly_cap,daily_cap,max_posts_per_day,bypass_guards,only_content_types,active,note";

/** Collapse the per-bucket rows for one account back into a single setting. */
function foldRows(rows: RawOverride[]): AccountOverride {
  const acct = rows.find((r) => r.bucket === null);
  const glp = rows.find((r) => r.bucket === "glp");
  const fil = rows.find((r) => r.bucket === "filler");
  return {
    // Rows are written as a unit, so any active row means the override is on.
    active: rows.some((r) => r.active),
    bypassGuards: acct?.bypass_guards ?? false,
    maxPostsPerDay: acct?.max_posts_per_day ?? null,
    glpWeekCap: glp?.weekly_cap ?? null,
    fillerWeekCap: fil?.weekly_cap ?? null,
    onlyContentTypes: acct?.only_content_types ?? null,
    note: acct?.note ?? null,
  };
}

/** Un-cached read, for callers that already sit inside a cached fetcher. */
export async function fetchOverrides(): Promise<Record<string, AccountOverride>> {
  const rows = await sbRest<RawOverride[]>(
    `scheduler_overrides?select=${OVERRIDE_COLS}&scope=eq.${OVERRIDE_SCOPE}`,
  );
  const byProfile: Record<string, RawOverride[]> = {};
  for (const r of rows) (byProfile[r.scope_key] ??= []).push(r);

  const out: Record<string, AccountOverride> = {};
  for (const [profile, group] of Object.entries(byProfile)) out[profile] = foldRows(group);
  return out;
}

/**
 * Every account that has override rows, on or off.
 *
 * Its own cache KEY, the accounts TAG. The two are different jobs and this
 * used to conflate them: passing `ACCOUNTS_TAG` as the key meant this fetcher
 * and `getAccounts()` — which return completely different shapes — were asking
 * one cache entry for their answer. Raised by the 2026-09-09 external review.
 *
 * Keeping the tag preserves the reason the key was shared in the first place:
 * a save has to expire the accounts table and this together, or the row pill
 * and the posting modal end up disagreeing about what is set.
 *
 * No call sites today (the accounts page calls `fetchOverrides` directly from
 * inside its own cached fetcher). It is fixed now rather than when someone
 * wires it to a screen and meets the collision as a bug.
 */
export const getSchedulerOverrides = cachedFetcher(
  "scheduler-overrides-v1",
  TTL.supabase,
  fetchOverrides,
  { tags: [ACCOUNTS_TAG] },
);

async function fetchContentTypeOptions(): Promise<Record<string, ContentTypeOption[]>> {
  const [chars, registry, pool] = await Promise.all([
    sbRest<{ character: string; allowed_content_types: string[] | null }[]>(
      "characters?select=character,allowed_content_types&is_active=eq.true",
    ),
    sbRest<{ content_type: string; display_name: string | null; quota_bucket: string | null }[]>(
      "content_type_registry?select=content_type,display_name,quota_bucket&active=eq.true",
    ),
    sbRest<{ content_type: string; character: string; pool_n: number }[]>(
      "v_scheduler_pool?select=content_type,character,pool_n",
    ),
  ]);

  const reg = new Map(registry.map((r) => [r.content_type, r]));
  const poolKey = (ct: string, ch: string) => `${ct}|${ch}`;
  const poolBy = new Map(pool.map((p) => [poolKey(p.content_type, p.character), Number(p.pool_n)]));

  const out: Record<string, ContentTypeOption[]> = {};
  for (const c of chars) {
    // The character's list is the outer boundary: an override may only ever
    // narrow within it, never reach another character's content.
    const allowed = c.allowed_content_types ?? [];
    out[c.character] = allowed
      .filter((ct) => reg.has(ct))
      .map((ct) => {
        const r = reg.get(ct)!;
        return {
          contentType: ct,
          displayName: r.display_name ?? ct,
          bucket: r.quota_bucket,
          poolN: poolBy.get(poolKey(ct, c.character)) ?? 0,
        };
      })
      // Filler last — it is the generic one and the scheduler plans it separately.
      .sort((a, b) =>
        a.bucket === b.bucket
          ? a.displayName.localeCompare(b.displayName)
          : a.bucket === "filler"
            ? 1
            : -1,
      );
  }
  return out;
}

/** Selectable content types per character, with live pool depth. */
export const getContentTypeOptions = cachedFetcher(
  "scheduler-content-types",
  TTL.supabase,
  fetchContentTypeOptions,
);

/** Un-cached read, for callers that already sit inside a cached fetcher. */
export async function fetchEffectiveConfig(): Promise<Record<string, EffectiveConfig>> {
  const rows = await sbRest<
    {
      geelark_profile: string;
      max_posts_per_day: number;
      glp_week_cap: number;
      fil_week_cap: number;
      age_days: number | null;
      throttle_reason: string | null;
      can_deliver: boolean;
      guard_day_cap: number | null;
    }[]
  >(
    "v_scheduler_account_config_all?select=geelark_profile,max_posts_per_day,glp_week_cap," +
      "fil_week_cap,age_days,throttle_reason,can_deliver,guard_day_cap",
  );
  const out: Record<string, EffectiveConfig> = {};
  for (const r of rows) {
    out[r.geelark_profile] = {
      maxPostsPerDay: r.max_posts_per_day,
      glpWeekCap: r.glp_week_cap,
      fillerWeekCap: r.fil_week_cap,
      ageDays: r.age_days,
      throttleReason: r.throttle_reason,
      canDeliver: r.can_deliver,
      guardDayCap: r.guard_day_cap,
    };
  }
  return out;
}

/**
 * What the scheduler will actually do today, per account.
 *
 * Reads the _all view so PAUSED accounts resolve too. They used to be absent
 * (v_scheduler_account_config filters `posting_paused IS FALSE`), and the
 * posting-settings modal treated that absence as "no data": it fell back to
 * invented placeholders of 3/day, 10 GLP, 10 filler, and — worse — lost every
 * ceiling, because the stepper bounds are all derived from these numbers. That
 * showed on the one screen you open to UN-pause an account, so the numbers
 * were wrong exactly when someone was about to act on them. Paused-ness is
 * read from accounts.posting_paused, never from a row being missing here.
 */
export const getEffectiveConfig = cachedFetcher(
  "scheduler-effective-config",
  TTL.supabase,
  fetchEffectiveConfig,
);

/**
 * Re-read one account straight after a write, uncached.
 *
 * The point is to find out whether the number the user typed survived the age
 * ramp and the health throttle. Asking the database beats predicting it in the
 * client: the clamp rules live in the view, and a second copy of them here
 * would drift the first time either is tuned.
 */
export async function readEffectiveFor(profile: string): Promise<EffectiveConfig | null> {
  const rows = await sbRest<
    {
      max_posts_per_day: number;
      glp_week_cap: number;
      fil_week_cap: number;
      age_days: number | null;
      throttle_reason: string | null;
      can_deliver: boolean;
      guard_day_cap: number | null;
    }[]
  >(
    "v_scheduler_account_config_all?select=max_posts_per_day,glp_week_cap,fil_week_cap," +
      `age_days,throttle_reason,can_deliver,guard_day_cap&geelark_profile=eq.${encodeURIComponent(profile)}`,
  );
  const r = rows[0];
  if (!r) return null;
  return {
    maxPostsPerDay: r.max_posts_per_day,
    glpWeekCap: r.glp_week_cap,
    fillerWeekCap: r.fil_week_cap,
    ageDays: r.age_days,
    throttleReason: r.throttle_reason,
    canDeliver: r.can_deliver,
    guardDayCap: r.guard_day_cap,
  };
}

/**
 * One-line summary for the accounts table pill.
 *
 * Shows what the scheduler will DO, not what was asked for. A daily cap can be
 * clamped by the age ramp or the health throttle, and a pill reading "5/day"
 * over a scheduler doing 2 is worse than no pill at all — so when the two
 * disagree the effective number wins and `clamped` marks it.
 */
export function summarizeOverride(
  ov: AccountOverride | null,
  paused: boolean,
  effective?: EffectiveConfig | null,
): { label: string; tone: "paused" | "custom" | "default"; clamped: boolean } {
  if (paused) return { label: "Paused", tone: "paused", clamped: false };
  if (!ov?.active) return { label: "Default", tone: "default", clamped: false };

  const asked = ov.maxPostsPerDay;
  const real = effective?.maxPostsPerDay ?? null;
  const clamped = asked != null && real != null && real < asked;

  const bits: string[] = [];
  if (asked != null) bits.push(`${clamped ? real : asked}/day`);
  if (ov.glpWeekCap != null || ov.fillerWeekCap != null) {
    const wk = (ov.glpWeekCap ?? 0) + (ov.fillerWeekCap ?? 0);
    bits.push(`${wk}/wk`);
  }
  if (ov.onlyContentTypes?.length) {
    bits.push(
      ov.onlyContentTypes.length === 1
        ? "1 type"
        : `${ov.onlyContentTypes.length} types`,
    );
  }
  return { label: bits.length ? bits.join(", ") : "Custom", tone: "custom", clamped };
}
