import { ACCOUNTS_TAG, TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";
import { healthRank } from "@/lib/health";
import {
  type AccountOverride,
  type EffectiveConfig,
  fetchEffectiveConfig,
  fetchOverrides,
} from "@/lib/data/scheduler-overrides";

/**
 * Accounts assembly (plan §4). One row per account (incl. banned/retired —
 * the detail page toggles them). Median views come from v_dashboard_last5_views
 * (created 2026-08-31, keyed username+platform); errors from
 * v_dashboard_task_errors_7d; device login from v_dashboard_latest_login.
 */
export interface AccountRow {
  profile: string;
  username: string | null;
  character: string; // "Character 3"
  platform: "tiktok" | "instagram";
  isActive: boolean;
  paused: boolean;
  healthStatus: string;
  healthConfidence: string | null;
  ageDays: number | null;
  tier: string; // new / warming / ramp / full / —
  /** null when analytics can't be trusted (tracking broken / no rows). */
  med5: number | null;
  med5Posts: number;
  med7d: number | null;
  /** % of matured posts in the last 7d that got <=10 views. >=40% is what the
   *  health chain calls `collapsing`, so this is the number behind the verdict. */
  suppressedPct: number | null;
  /** Posts the 7-day suppression share was computed over. Drives the "why is
   *  this blank" tooltip; null when the view has no row for the account. */
  sampleN: number | null;
  med28d: number | null;
  /** The heaviest single driver behind the verdict, phrased by the view.
   *  Raw evidence read as a contradiction: Profile 8 showed "best of last 8:
   *  1,326 views" beside a `collapsing` pill, while the number that actually
   *  drove it — 60% of posts under 10 views — was nowhere on screen. */
  healthReason: string | null;
  /** How much to trust that reason: thin sample, broken deliveries. */
  healthCaveat: string | null;
  /** The machine's verdict, kept separate from what a human concluded. */
  systemHealth: string;
  /** A person's recorded read, or null if nobody has looked yet. */
  review: {
    verdict: string;
    by: string;
    at: string;
    note: string | null;
    /** The system changed its mind after this review — look again. */
    needsRereview: boolean;
  } | null;
  postingErrors: number;
  warmupErrors: number;
  latestFailCode: string | null;
  latestFailMeaning: string | null;
  loginVerdict: string | null;
  loginCheckedAt: string | null;
  bannedAt: string | null;
  statusNote: string | null;
  /** true once the Post-Ban workflow has stamped its cleanup note. */
  cleanedUp: boolean;
  /** Days since the last SUCCEEDED (type-42) warmup; null = never warmed.
   *  A warmup that ran and failed leaves the account as unwarmed as one that
   *  never ran, so both columns count only status-3 tasks. */
  daysSinceWarmup: number | null;
  lastWarmupAt: string | null;
  /** Days since the last post that actually LANDED; null = never posted.
   *  A task Geelark accepted and then failed is not a post. */
  daysSincePost: number | null;
  lastPostAt: string | null;
  /** Hand-set schedule for this account, or null if it has never had one. */
  override: AccountOverride | null;
  /** What the scheduler resolves today. Null when paused — a paused account is
   *  filtered out of v_scheduler_account_config, so it has no caps at all. */
  effective: EffectiveConfig | null;
}

interface RawAccount {
  geelark_profile: string;
  username: string | null;
  character: string;
  platform: string;
  is_active: boolean;
  posting_paused: boolean | null;
  health_status: string | null;
  health_confidence: string | null;
  median_views_7d: number | null;
  median_views_28d: number | null;
  account_created_on: string | null;
  banned_at: string | null;
  status_note: string | null;
}

function tierOf(ageDays: number | null): string {
  if (ageDays === null) return "—";
  if (ageDays < 9) return "new";
  if (ageDays <= 15) return "warming";
  if (ageDays <= 22) return "ramp";
  return "full";
}

async function fetchAccounts(): Promise<AccountRow[]> {
  // Explicit column list on accounts — the table also holds credentials.
  // Include character-assigned accounts PLUS any inactive rows (blank-character
  // banned shells like Profile 66) so half-retired accounts can be cleaned up.
  const [
    accounts,
    medians,
    errors,
    logins,
    failCodes,
    warmups,
    lastPosts,
    liveHealth,
    reviews,
    overrides,
    effective,
  ] = await Promise.all([
    sbRest<RawAccount[]>(
      "accounts?select=geelark_profile,username,character,platform,is_active,posting_paused,health_status,health_confidence,median_views_7d,median_views_28d,account_created_on,banned_at,status_note&or=(character.like.Character*,username.not.is.null,is_active.eq.false)",
    ),
    sbRest<{ platform: string; account: string; median_views_last5: number; posts_counted: number }[]>(
      "v_dashboard_last5_views?select=platform,account,median_views_last5,posts_counted",
    ),
    sbRest<{ serial_name: string; posting_errors: number; warmup_errors: number; latest_fail_code: string | null }[]>(
      "v_dashboard_task_errors_7d?select=serial_name,posting_errors,warmup_errors,latest_fail_code",
    ),
    sbRest<{ profile_name: string; verdict: string; checked_at: string }[]>(
      "v_dashboard_latest_login?select=profile_name,verdict,checked_at",
    ),
    sbRest<{ code: string; meaning: string | null }[]>("geelark_fail_codes?select=code,meaning"),
    // days_since_success / last_success_at, NOT days_since_warmup /
    // last_warmup_at: the latter pair counts a warmup that errored out, which
    // makes a stalled account look freshly warmed. The notification feed
    // already reads the success columns, so this keeps the two in step.
    sbRest<{ geelark_profile: string; days_since_success: number | null; last_success_at: string | null }[]>(
      "v_account_warmup_health?select=geelark_profile,days_since_success,last_success_at",
    ),
    // days_since_success / last_success_at again, for the same reason: the
    // days_since_post / last_post_at pair counts a task that errored out, so a
    // failed upload read as a fresh post. v_account_health_v3 still reads the
    // any-outcome pair on purpose -- see the 09-10 migration.
    sbRest<{ geelark_profile: string; days_since_success: number | null; last_success_at: string | null }[]>(
      "v_account_last_post?select=geelark_profile,days_since_success,last_success_at",
    ),
    // v_account_health_v3 is THE shared verdict — the same row the n8n
    // View-Collapse Detector emails. The vocabulary rules (banned split on
    // evidence, shadowbanned, muted->collapsing, ramping resolved, warming,
    // system error) live there and nowhere else, so the app and the email
    // cannot drift apart. Both columns are live-computed on every read.
    sbRest<
      {
        geelark_profile: string;
        health: string | null;
        median_7d_r: number | null;
        suppressed_share_7d: string | number | null;
        mat_posts_7d: number | null;
        health_reason: string | null;
        health_caveat: string | null;
      }[]
    >(
      "v_account_health_v3?select=geelark_profile,health,median_7d_r,suppressed_share_7d," +
        "mat_posts_7d,health_reason,health_caveat",
    ),
    // A human's read of the verdict. Latest per profile; `needs_rereview` marks
    // the ones the machine has re-judged since a person last looked.
    sbRest<
      {
        geelark_profile: string;
        human_verdict: string;
        reviewed_by: string;
        reviewed_at: string;
        note: string | null;
        needs_rereview: boolean;
        effective_health: string | null;
      }[]
    >(
      "v_account_health_review_latest?select=geelark_profile,human_verdict,reviewed_by," +
        "reviewed_at,note,needs_rereview,effective_health",
    ).catch(() => []),
    // Hand-set schedules, and what the scheduler currently resolves. Both are
    // read here rather than by the table so the pill and the modal can never
    // disagree with the row they sit on. Empty on failure: an unreadable
    // override must not blank the accounts page.
    fetchOverrides().catch((): Record<string, AccountOverride> => ({})),
    fetchEffectiveConfig().catch((): Record<string, EffectiveConfig> => ({})),
  ]);

  const medianByKey = new Map(medians.map((m) => [`${m.account}|${m.platform}`, m]));
  const errorsByProfile = new Map(errors.map((e) => [e.serial_name, e]));
  const loginByProfile = new Map(logins.map((l) => [l.profile_name, l]));
  const failMeaning = new Map(failCodes.map((f) => [f.code, f.meaning]));
  const warmupByProfile = new Map(warmups.map((w) => [w.geelark_profile, w]));
  const lastPostByProfile = new Map(lastPosts.map((p) => [p.geelark_profile, p]));
  const liveByProfile = new Map(liveHealth.map((m) => [m.geelark_profile, m]));
  const reviewByProfile = new Map(reviews.map((r) => [r.geelark_profile, r]));

  const rows = accounts.map((a): AccountRow => {
    const live = liveByProfile.get(a.geelark_profile);
    const err = errorsByProfile.get(a.geelark_profile);
    const warmup = warmupByProfile.get(a.geelark_profile);
    const lastPost = lastPostByProfile.get(a.geelark_profile);
    // Verdict comes straight from the shared view. accounts.health_status is
    // only a fallback: the RPC rewrites it Tue/Fri in the OLD vocabulary, so it
    // is stale by design and used only if the live read fails.
    const systemHealth = live?.health ?? a.health_status ?? "no data";
    const review = reviewByProfile.get(a.geelark_profile);
    // A human's read overrides the machine — but only while it still applies to
    // the verdict they actually reviewed. Once the system changes its mind the
    // review is stale, and the machine's newer verdict is shown again.
    const health =
      review && !review.needs_rereview && review.human_verdict !== "confirmed"
        ? review.human_verdict
        : systemHealth;
    const median = a.username ? medianByKey.get(`${a.username}|${a.platform}`) : undefined;
    const login = loginByProfile.get(a.geelark_profile);
    const ageDays = a.account_created_on
      ? Math.floor((Date.now() - new Date(a.account_created_on).getTime()) / 86_400_000)
      : null;
    // Honesty rule (plan §10.2): a tracking-broken account's stale median must
    // never render as a number — the analytics feed is blind, not the account.
    const analyticsTrustworthy = health !== "tracking broken";

    // Same honesty rule, applied to the sample size. A suppression share taken
    // over 1-3 posts converges on 0% or 100% by construction, and 100% is what
    // it prints precisely when ingest is thinnest — which is how Profiles
    // 59/60/62 read "100% suppressed" off a single post while live TikTok showed
    // 200+ views. 4 matches the view's own "too thin to judge" line
    // (mat_posts_7d < 4 AND posts_7d > 0 -> watch).
    const sampleN = live?.mat_posts_7d ?? null;
    const sampleUsable = sampleN !== null && sampleN >= 4;

    return {
      profile: a.geelark_profile,
      username: a.username,
      character: a.character,
      platform: a.platform === "instagram" ? "instagram" : "tiktok",
      isActive: a.is_active,
      paused: a.posting_paused === true,
      healthStatus: health,
      healthConfidence: a.health_confidence,
      ageDays,
      tier: tierOf(ageDays),
      med5: analyticsTrustworthy && median ? Math.round(median.median_views_last5) : null,
      med5Posts: median?.posts_counted ?? 0,
      med7d: analyticsTrustworthy ? (live?.median_7d_r ?? a.median_views_7d) : null,
      // Stored 0-1 in the view; shown as a percentage.
      suppressedPct:
        analyticsTrustworthy && sampleUsable && live?.suppressed_share_7d != null
          ? Math.round(Number(live.suppressed_share_7d) * 100)
          : null,
      sampleN,
      med28d: analyticsTrustworthy ? a.median_views_28d : null,
      healthReason: live?.health_reason ?? null,
      healthCaveat: live?.health_caveat ?? null,
      systemHealth,
      review: review
        ? {
            verdict: review.human_verdict,
            by: review.reviewed_by,
            at: review.reviewed_at,
            note: review.note,
            needsRereview: review.needs_rereview === true,
          }
        : null,
      postingErrors: err?.posting_errors ?? 0,
      warmupErrors: err?.warmup_errors ?? 0,
      latestFailCode: err?.latest_fail_code ?? null,
      latestFailMeaning: err?.latest_fail_code
        ? (failMeaning.get(err.latest_fail_code) ?? null)
        : null,
      loginVerdict: login?.verdict ?? null,
      loginCheckedAt: login?.checked_at ?? null,
      bannedAt: a.banned_at,
      statusNote: a.status_note,
      cleanedUp: /post-ban cleanup/i.test(a.status_note ?? ""),
      daysSinceWarmup: warmup?.days_since_success ?? null,
      lastWarmupAt: warmup?.last_success_at ?? null,
      daysSincePost: lastPost?.days_since_success ?? null,
      lastPostAt: lastPost?.last_success_at ?? null,
      override: overrides[a.geelark_profile] ?? null,
      effective: effective[a.geelark_profile] ?? null,
    };
  });

  rows.sort(
    (a, b) => healthRank(a.healthStatus) - healthRank(b.healthStatus) || a.profile.localeCompare(b.profile),
  );
  return rows;
}

export const getAccounts = cachedFetcher(ACCOUNTS_TAG, TTL.supabase, fetchAccounts);
