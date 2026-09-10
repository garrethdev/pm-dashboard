import { TTL, cachedFetcher } from "@/lib/data/cache";
import { sbRest, sbRpc } from "@/lib/data/supabase";
import { TRACKED_WORKFLOWS } from "@/lib/data/automation";
import {
  factsFromSummary,
  parseLegacyRetireBody,
  retireDetail,
  type PostBanSummary,
} from "@/lib/data/notification-copy";
import type { PillTone } from "@/components/ui/pill";

/**
 * Incident feed (plan §5) — bans, failed deliveries, scheduler shortfalls,
 * n8n workflow failures and dead analytics feeds. Newest first.
 *
 * Nothing is snapshotted into an "incidents" table: four of the five sources
 * are already durable in Postgres, so the window is a display choice rather
 * than a storage limit. A snapshot table would duplicate those rows and could
 * silently drift from them. The dashboard card asks for 48h; the /incidents
 * page asks for a longer range over the same code path.
 *
 * The exception is analytics staleness, which analytics_freshness_check()
 * computes live and never persists — see analyticsFeeds() below.
 */
export interface Incident {
  /**
   * Stable across reloads, because the bell deep-links to a row: a notification
   * for a half-finished cleanup opens /incidents?focus=<id> and that row is
   * flashed. An array index would point at a different incident as soon as a
   * newer one landed.
   */
  id: string;
  at: string;
  tone: PillTone;
  type: string;
  entity: string;
  detail: string;
  href: string;
}

export type IncidentRange = "7d" | "30d" | "90d" | "all";

export const INCIDENT_RANGES: { key: IncidentRange; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

/** `null` days = all time; the epoch is simpler than branching every query. */
function sinceIso(days: number | null): string {
  if (days === null) return "1970-01-01T00:00:00Z";
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** "Profile 45" -> "45". Empty when the label isn't a numbered profile. */
function profileNum(profile: string): string {
  return String(profile ?? "").replace(/\D/g, "");
}

/* ── Bans ──────────────────────────────────────────────────────────────────
 * Two sources, because neither is sufficient alone:
 *
 *   accounts.banned_at   — the precise ban timestamp, but current state only.
 *                          Cleared on recovery and overwritten on re-ban, so
 *                          it holds 23 rows against 37 profiles ever banned.
 *   account_events       — the durable log (44 `banned` events since Jul 3),
 *                          but written by a daily batch, so every row in a day
 *                          carries the same 12:00 UTC stamp and lags up to 24h.
 *
 * So: take accounts.banned_at where it exists (precise, and covers today's
 * bans the batch hasn't seen yet), and fill in from account_events for
 * profiles/dates it no longer represents. Keying the dedupe on profile + day
 * keeps a genuine re-ban on a later date rather than collapsing the history.
 */
async function bans(since: string, limit: number): Promise<Incident[]> {
  // Always the forensics route, even before an investigation exists. Gating it
  // on a stored report made the feature invisible: the table only fills when
  // someone runs the workflow, so nothing ever linked there and there was no
  // way in. The forensics page's empty state names the workflow to run.
  const href = (profile: string) => {
    const n = profileNum(profile);
    return n ? `/accounts/${n}/forensics` : "/accounts";
  };

  const [current, events] = await Promise.all([
    sbRest<{ geelark_profile: string; banned_at: string; character: string | null }[]>(
      `accounts?select=geelark_profile,banned_at,character&banned_at=gte.${since}&order=banned_at.desc&limit=${limit}`,
    ).catch(() => []),
    sbRest<
      {
        geelark_profile: string;
        platform: string | null;
        source: string | null;
        event_date: string;
      }[]
    >(
      `account_events?select=geelark_profile,platform,source,event_date&event_type=eq.banned&event_date=gte.${since}&order=event_date.desc&limit=${limit}`,
    ).catch(() => []),
  ]);

  const seen = new Set<string>();
  const out: Incident[] = [];

  for (const r of current) {
    seen.add(`${r.geelark_profile}|${r.banned_at.slice(0, 10)}`);
    out.push({
      id: `ban:${r.geelark_profile}:${r.banned_at.slice(0, 10)}`,
      at: r.banned_at,
      tone: "danger",
      type: "Ban",
      entity: r.geelark_profile,
      detail: `${r.character || "shell"}, banned_at set; Post-Ban SOP pending`,
      href: href(r.geelark_profile),
    });
  }

  for (const e of events) {
    if (seen.has(`${e.geelark_profile}|${e.event_date.slice(0, 10)}`)) continue;
    seen.add(`${e.geelark_profile}|${e.event_date.slice(0, 10)}`);
    out.push({
      id: `ban:${e.geelark_profile}:${e.event_date.slice(0, 10)}`,
      at: e.event_date,
      tone: "danger",
      type: "Ban",
      entity: e.geelark_profile,
      // account_events.detail is a detector debug string ("(new) -> banned
      // (med7d= ... conf=low)"), so it is deliberately not surfaced raw.
      detail: `${e.platform ?? "account"}, recorded by ${e.source ?? "detector"}`,
      href: href(e.geelark_profile),
    });
  }

  return out;
}

async function failedDeliveries(since: string, limit: number): Promise<Incident[]> {
  // v_dashboard_failed_deliveries, not v_failed_deliveries: Smart Scheduler
  // 1.0.1's reconcile moves Failed rows to 'Hold'/NULL, which emptied the old
  // view (0 rows against 1,932 real failures). The new source is built on
  // v_geelark_failed_tasks — the scheduler team's list of tasks safe to treat
  // as genuine failures — and excludes `unverifiable` codes, which must never
  // be shown as failures (they caused the 2026-06-26 duplicate-posting incident).
  const rows = await sbRest<
    {
      profile: string;
      fail_code: string | null;
      fail_desc: string | null;
      meaning: string | null;
      task_created_at: string;
    }[]
  >(
    `v_dashboard_failed_deliveries?select=profile,fail_code,fail_desc,meaning,task_created_at&task_created_at=gte.${since}&order=task_created_at.desc&limit=${limit}`,
  );
  return rows.map((r) => ({
    id: `delivery:${r.profile}:${r.task_created_at}`,
    at: r.task_created_at,
    tone: "danger",
    type: "Failed delivery",
    entity: r.profile ?? "—",
    detail: `${r.meaning ?? `fail_code ${r.fail_code ?? "?"}`}${r.fail_desc ? `: ${r.fail_desc}` : ""}`,
    href: "/automation",
  }));
}

async function shortfalls(since: string, limit: number): Promise<Incident[]> {
  const rows = await sbRest<
    {
      character: string;
      content_type: string;
      slots_missed: number;
      reason: string | null;
      created_at: string;
    }[]
  >(
    `scheduler_shortfalls?select=character,content_type,slots_missed,reason,created_at&created_at=gte.${since}&order=created_at.desc&limit=${limit}`,
  );
  return rows.map((r) => ({
    id: `shortfall:${r.character}:${r.content_type}:${r.created_at}`,
    at: r.created_at,
    tone: "warn",
    type: "Shortfall",
    entity: r.character,
    detail: `${r.content_type}: ${r.slots_missed} unfilled${r.reason ? `: ${r.reason}` : ""}`,
    href: "/inventory",
  }));
}

async function workflowFailures(since: string, limit: number): Promise<Incident[]> {
  const base = process.env.N8N_BASE_URL;
  const key = process.env.N8N_API_KEY;
  if (!base || !key) return [];
  const nameById = new Map(TRACKED_WORKFLOWS.map((w) => [w.id, w.name]));
  // Deliberately unguarded: a fetch, HTTP or parse failure must reach
  // readSource() so it becomes a visible "could not be read" row. It used to be
  // caught here and returned as [], which is indistinguishable from "no
  // workflow has failed" -- the most dangerous thing this source could say.
  //
  // n8n prunes executions on its own retention schedule, so this source
  // cannot reach as far back as the Postgres-backed ones.
  const res = await fetch(
    `${base}/api/v1/executions?status=error&limit=${Math.min(limit, 250)}`,
    {
      headers: { "X-N8N-API-KEY": key },
      signal: AbortSignal.timeout(8_000),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`n8n HTTP ${res.status}`);
  const body = (await res.json()) as {
    data: { workflowId: string; startedAt: string; id: string }[];
  };
  return body.data
    .filter((e) => e.startedAt >= since && nameById.has(e.workflowId))
    .map((e) => ({
      id: `workflow:${e.id}`,
      at: e.startedAt,
      tone: "danger" as const,
      type: "Workflow",
      entity: nameById.get(e.workflowId) ?? e.workflowId,
      detail: "execution errored",
      href: "/automation",
    }));
}

/**
 * Analytics feed staleness — surfaces a dead ingestion pipeline (e.g. expired
 * Meta Graph tokens silently killing Instagram analytics) as an incident.
 * Reuses analytics_freshness_check(), which already encodes each feed's
 * expected cadence, so the dashboard and the n8n Freshness Alarm agree.
 *
 * Stamped with checked_at (now) rather than last_write: a stale feed is an
 * ONGOING condition, and last_write is by definition old — using it would sort
 * the incident off the bottom of a 48h feed exactly when it matters most.
 *
 * This is the one source with no history: it describes the state at the moment
 * of the check and is never written down, so it always appears at the top of a
 * historical view rather than at the date it began.
 */
interface FreshnessFeed {
  feed: string;
  source: string;
  stale: boolean;
  age_hours: number | null;
  max_age_hours: number | null;
  last_write: string | null;
}

async function analyticsFeeds(): Promise<Incident[]> {
  const r = await sbRpc<{
    feeds?: FreshnessFeed[];
    checked_at?: string;
    cron_failures?: { jobname?: string; detail?: string }[];
  }>("analytics_freshness_check");
  const at = r.checked_at ?? new Date().toISOString();

  const stale = (r.feeds ?? [])
    .filter((f) => f.stale)
    .map((f): Incident => {
      const age =
        f.age_hours === null || f.age_hours === undefined
          ? "never"
          : f.age_hours >= 48
            ? `${Math.floor(f.age_hours / 24)}d`
            : `${Math.round(f.age_hours)}h`;
      return {
        id: `analytics:${f.feed}`,
        at,
        tone: "danger",
        type: "Analytics stale",
        entity: f.feed,
        detail: `no data for ${age}${f.max_age_hours ? ` (limit ${f.max_age_hours}h)` : ""}, ${f.source}`,
        href: "/automation",
      };
    });

  const crons = (r.cron_failures ?? []).map((c): Incident => ({
    id: `cron:${c.jobname ?? "pg_cron"}`,
    at,
    tone: "danger",
    type: "Cron failed",
    entity: c.jobname ?? "pg_cron job",
    detail: c.detail ?? "scheduled job reported a failure",
    href: "/automation",
  }));

  return [...stale, ...crons];
}

/**
 * Post-Ban cleanups that did not finish cleanly.
 *
 * The run itself is fire-and-forget — it reports into the bell — but a cleanup
 * that half-failed leaves something real behind: a proxy still auto-renewing,
 * a number still on subscription. Those cost money until someone acts, so they
 * belong in the durable feed rather than only in a notification that ages out
 * after seven days.
 *
 * Successes are deliberately excluded: a clean retire is routine, not an
 * incident, and 13 of the 15 rows on file are clean.
 */
async function postBanCleanups(since: string, limit: number): Promise<Incident[]> {
  const rows = await sbRest<
    {
      id: number;
      at: string;
      severity: string;
      body: string | null;
      target: string | null;
      meta: { summary?: PostBanSummary } | null;
    }[]
  >(
    `dashboard_notifications?select=id,at,severity,body,target,meta&type=eq.retire&severity=in.(warning,critical)` +
      `&at=gte.${since}&order=at.desc&limit=${limit}`,
  );
  return rows.map((r) => {
    const n = profileNum(r.target ?? "");
    // The bell's sentence drops the per-resource detail to stay one line; this
    // is where it comes back. Runs from 2026-09-07 keep the whole summary, so
    // they can also name the step that failed. Older rows are rebuilt from the
    // middot body they stored, which carries every step but not which errored.
    const facts = r.meta?.summary
      ? factsFromSummary(r.meta.summary)
      : r.body
        ? parseLegacyRetireBody(r.body, r.severity)
        : null;
    return {
      id: `cleanup:${r.id}`,
      at: r.at,
      tone: (r.severity === "critical" ? "danger" : "warn") as PillTone,
      type: "Cleanup",
      entity: r.target ?? "—",
      detail: facts ? retireDetail(facts) : (r.body ?? "cleanup reported a problem"),
      // The account page, not forensics: what needs checking is the account's
      // live proxy and number, which is what that page shows.
      href: n ? `/accounts/${n}` : "/accounts",
    };
  });
}

/**
 * A source that could not be READ becomes an incident in its own right.
 *
 * Every source used to be wrapped in `.catch(() => [])`, which had one very
 * bad property: if all six failed, aggregation still succeeded and the page
 * rendered a clean, empty, reassuring feed. A monitoring surface that goes
 * quiet when its own plumbing breaks is worse than no monitoring surface,
 * because silence is the same shape as good news.
 *
 * Turning the failure into a row rather than a thrown error is deliberate. One
 * dead source must not blank the other five -- the rest of the feed is still
 * true and still worth showing. So the read failure travels as data, in the
 * same list, sorted to the top by its `at`, where it cannot be missed.
 *
 * The id is stable per source (not per occurrence) so the bell's deep-link
 * contract holds and a flapping source does not spawn a new row every minute.
 */
async function readSource(
  label: string,
  href: string,
  run: () => Promise<Incident[]>,
): Promise<Incident[]> {
  try {
    return await run();
  } catch (err) {
    console.error(`incident source "${label}" could not be read`, err);
    return [
      {
        id: `source-unreadable:${label}`,
        at: new Date().toISOString(),
        tone: "danger" as PillTone,
        type: "Monitoring",
        entity: label,
        detail:
          `${label} could not be read just now, so this feed is incomplete. ` +
          `Anything from that source is MISSING, not absent -- do not read the ` +
          `rest of this list as an all-clear until it comes back.`,
        href,
      },
    ];
  }
}

async function fetchIncidents(
  days: number | null,
  perSource: number,
  cap: number,
): Promise<Incident[]> {
  const since = sinceIso(days);
  const groups = await Promise.all([
    readSource("Bans", "/accounts", () => bans(since, perSource)),
    readSource("Failed deliveries", "/calendar", () => failedDeliveries(since, perSource)),
    readSource("Scheduler shortfalls", "/calendar", () => shortfalls(since, perSource)),
    readSource("Workflow failures", "/automation", () => workflowFailures(since, perSource)),
    readSource("Analytics feeds", "/analytics", () => analyticsFeeds()),
    readSource("Post-ban cleanups", "/accounts", () => postBanCleanups(since, perSource)),
  ]);
  return groups
    .flat()
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, cap);
}

/** Dashboard card: last 48h, trimmed to what the card can show. */
export const getIncidents = cachedFetcher("incidents", TTL.supabase, () =>
  fetchIncidents(2, 15, 20),
);

/**
 * /incidents page. Per-source limit stays under PostgREST's 1000-row response
 * cap; the whole history is ~1,000 incidents, so nothing needs paginating yet.
 */
export function getIncidentHistory(range: IncidentRange = "30d") {
  const entry = INCIDENT_RANGES.find((r) => r.key === range);
  const days = entry ? entry.days : 30;
  return cachedFetcher(`incident-history:${range}`, TTL.supabase, () =>
    fetchIncidents(days, 500, 1000),
  )();
}
