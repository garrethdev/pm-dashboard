/**
 * The Warmups page's reads (Garreth, 2026-10-28): the robot's reports of the
 * last fourteen days, the warmups running now, and the accounts it works.
 *
 * Service-role reads, like the rest of the robot's tables, and never cached:
 * the page is looked at to see what is happening now. Never reads a diary or a
 * screenshot; those are fetched one report at a time when a report is opened.
 */

import { ACCOUNT_FK_COL, ACCOUNT_ID_COL, type AccountId } from "@/lib/data/account-id";
import {
  buildOverview,
  OVERVIEW_DAYS,
  type OverviewAccount,
  type OverviewReport,
  type OverviewRun,
  type WarmupOverview,
} from "@/lib/data/warmup-overview-rules";
import { RUN_QUIET_AFTER_MS } from "@/lib/data/warmup-run-state";
import { LIST_COLS, toReport, type RawReport } from "@/lib/data/warmup-reports";
import { ELIGIBLE } from "@/lib/data/warmup-runs";
import { dayRangeET, sbFetch } from "@/lib/data/warmup-sessions";

async function readJson<T>(path: string, what: string): Promise<T> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

interface RawAccount {
  id: AccountId;
  username: string | null;
  display_name: string | null;
  geelark_profile: string | null;
  platform: string | null;
  device: { name: string | null } | null;
}

const ACCOUNT_COLS = `${ACCOUNT_ID_COL},username,display_name,geelark_profile,platform,device:devices(name)`;

function toAccount(r: RawAccount): OverviewAccount {
  return {
    id: r.id,
    username: r.username,
    displayName: r.display_name,
    profile: r.geelark_profile,
    platform: r.platform,
    deviceName: r.device?.name ?? null,
  };
}

export async function getWarmupOverview(now: Date = new Date()): Promise<WarmupOverview> {
  const since = dayRangeET(-(OVERVIEW_DAYS - 1), now).from.toISOString();
  // A run counts as running while it is still checking in: the same rule the
  // To-do list's Running pill uses (warmup-run-state.ts).
  const quiet = new Date(now.getTime() - RUN_QUIET_AFTER_MS).toISOString();

  const [rawReports, rawRuns, eligible] = await Promise.all([
    readJson<(RawReport & { review_summary: string | null })[]>(
      `warmup_reports?select=${LIST_COLS},review_summary` +
        `&started_at=gte.${encodeURIComponent(since)}&order=started_at.desc&limit=2000`,
      "the warmup reports",
    ),
    readJson<{ account_id: AccountId; session_no: number; started_at: string }[]>(
      `warmup_runs?select=${ACCOUNT_FK_COL},session_no,started_at` +
        `&ended_at=is.null&last_seen_at=gte.${encodeURIComponent(quiet)}&order=started_at.asc`,
      "the running warmups",
    ),
    readJson<RawAccount[]>(`accounts?select=${ACCOUNT_COLS}&${ELIGIBLE}&order=id.asc`, "the robot's accounts"),
  ]);

  const reports: OverviewReport[] = rawReports.map((r) => ({ ...toReport(r), reviewSummary: r.review_summary }));
  const runs: OverviewRun[] = rawRuns.map((r) => ({
    accountId: r.account_id,
    sessionNo: r.session_no,
    startedAt: r.started_at,
  }));

  // Accounts that reported or are running but are no longer on the robot's
  // list (moved to Manual, banned): still named on the page.
  const known = new Set(eligible.map((a) => a.id));
  const missing = [...new Set([...reports.map((r) => r.accountId), ...runs.map((r) => r.accountId)])].filter(
    (id) => !known.has(id),
  );
  const others = missing.length
    ? await readJson<RawAccount[]>(`accounts?select=${ACCOUNT_COLS}&id=in.(${missing.join(",")})`, "the accounts")
    : [];

  return buildOverview({ reports, runs, accounts: [...eligible, ...others].map(toAccount), now });
}
