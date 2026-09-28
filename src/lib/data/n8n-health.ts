import { TTL, cachedFetcher } from "@/lib/data/cache";

/**
 * Is n8n running workflows at all?
 *
 * Found the hard way (2026-09-28): n8n Cloud hit its plan's execution limit
 * at about 10 pm ET on 2026-09-25 and refused every scheduled run for more
 * than two days — the scheduler, the ingests, gatekeeping, the research
 * pipelines — and nothing in the dashboard said so. Garreth asked for the bell
 * to say it. This is the check behind that bell item; it reads n8n's own run
 * history, which is not itself a run and costs nothing against the limit.
 */

export interface N8nRun {
  id: string;
  status: string;
  mode: string;
  startedAt: string;
}

/** How many of the latest real runs must ALL have failed. One workflow
 *  failing on its own is that workflow's problem, and the automation page
 *  shows it; twenty in a row across everything is n8n's. */
export const OUTAGE_RUNS = 20;

/** How long without a single success before it counts. Long enough that a
 *  short blip clears itself before anyone is paged. */
export const OUTAGE_QUIET_MS = 60 * 60_000;

/**
 * Runs that say whether n8n is doing its job: scheduled, webhook and
 * sub-workflow runs. Left out: a person pressing Test ("manual"), and the
 * error-alert workflow ("error"), which kept succeeding all through the
 * 2026-09 outage — counting it would have hidden the very thing this looks for.
 */
export function isRealRun(run: N8nRun): boolean {
  return run.mode !== "manual" && run.mode !== "error";
}

export interface N8nOutage {
  /** The last real run that succeeded, or null when none was found. */
  lastSuccessAt: string | null;
  /** The newest failed run, whose error message says why. */
  latestFailureId: string;
}

/**
 * The rule, pure so it can be tested: the latest OUTAGE_RUNS real runs all
 * failed, and the last real success is more than OUTAGE_QUIET_MS ago.
 * `recent` and `successes` are newest first, as n8n returns them.
 */
export function detectOutage(recent: N8nRun[], successes: N8nRun[], now: Date): N8nOutage | null {
  const latest = recent.filter(isRealRun).slice(0, OUTAGE_RUNS);
  if (latest.length < OUTAGE_RUNS) return null;
  if (latest.some((r) => r.status === "success" || r.status === "running" || r.status === "waiting")) {
    return null;
  }
  const lastSuccess = successes.find(isRealRun)?.startedAt ?? null;
  if (lastSuccess && now.getTime() - Date.parse(lastSuccess) <= OUTAGE_QUIET_MS) return null;
  return { lastSuccessAt: lastSuccess, latestFailureId: latest[0]!.id };
}

/** n8n's error message as a sentence: its limit message arrives as HTML. */
export function plainReason(message: string | null | undefined): string | null {
  if (!message) return null;
  const text = message
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");
  return text ? text.slice(0, 160) : null;
}

async function n8nGet<T>(path: string): Promise<T> {
  const res = await fetch(`${process.env.N8N_BASE_URL}/api/v1/${path}`, {
    headers: { "X-N8N-API-KEY": process.env.N8N_API_KEY! },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`n8n HTTP ${res.status}`);
  return (await res.json()) as T;
}

export interface N8nHealth {
  outage: (N8nOutage & { reason: string | null }) | null;
}

/**
 * Cached for five minutes: the bell asks every 20 seconds per open tab, and
 * an outage measured in hours does not need finer than that.
 */
export const getN8nHealth = cachedFetcher<N8nHealth>("n8n-health", 5 * TTL.n8n, async () => {
  if (!process.env.N8N_BASE_URL || !process.env.N8N_API_KEY) return { outage: null };
  const [recent, successes] = await Promise.all([
    n8nGet<{ data: N8nRun[] }>("executions?limit=60"),
    n8nGet<{ data: N8nRun[] }>("executions?status=success&limit=60"),
  ]);
  const outage = detectOutage(recent.data ?? [], successes.data ?? [], new Date());
  if (!outage) return { outage: null };
  // Only the one failed run is opened, and only during an outage, to read why.
  const detail = await n8nGet<{ data?: { resultData?: { error?: { message?: string } } } }>(
    `executions/${outage.latestFailureId}?includeData=true`,
  ).catch(() => null);
  return { outage: { ...outage, reason: plainReason(detail?.data?.resultData?.error?.message) } };
});
