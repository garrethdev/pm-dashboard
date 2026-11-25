/**
 * The two automatic account rules, applied (Garreth, 2026-11-25). The rules
 * themselves, and why, are in src/lib/data/auto-hold-rules.ts.
 *
 * Run once a day by the schedule in vercel.json, early in the New York
 * morning, and again for one account whenever somebody logs a warmup by hand,
 * so an account goes back the moment its last warmup is ticked rather than
 * the next morning.
 *
 * The robot on the Air needs nothing from this. It only ever warms accounts
 * set to Automated, so switching an account to Manual takes it off the
 * robot's list and switching it back puts it on again. A paused Manual
 * account shows its warmups on the To-do list and no posts (workFor in
 * todo.ts), which is what a zero-views hold needs.
 *
 * Every change is written to the account's history under "system:auto-hold"
 * and goes to the bell, where everyone sees it.
 */
import { revalidateTag } from "next/cache";
import { ACCOUNTS_TAG, NOTIFICATIONS_TAG, TODO_TAG } from "@/lib/data/cache";
import { accountDetailTag } from "@/lib/data/account-detail";
import { ACCOUNT_FK_COL, ACCOUNT_ID_COL, type AccountId } from "@/lib/data/account-id";
import { sbRestAll } from "@/lib/data/supabase";
import { sbFetch } from "@/lib/data/warmup-sessions";
import { getLastFinishedWarmups } from "@/lib/data/warmup-runs";
import { getDaysOff } from "@/lib/data/work-week";
import { auditLog, setPostingPaused, setWarmupMode } from "@/lib/data/writes";
import { insertNotification } from "@/lib/data/notifications";
import {
  ROBOT_FAILING_HOLD_DAYS,
  ROBOT_FAILING_MISSED_DAYS,
  ZERO_VIEWS_HOLD_DAYS,
  accountName,
  etDay,
  hasZeroStreak,
  isWorkingDay,
  missedWarmupDays,
  restoreCopy,
  settleOpenHold,
  startCopy,
  type HoldOutcome,
  type HoldRule,
  type PostRead,
  type SessionLite,
} from "@/lib/data/auto-hold-rules";

/** Who the account's history says made the change. */
export const AUTO_HOLD_ACTOR = "system:auto-hold";

interface AccountRow {
  id: AccountId;
  geelark_profile: string;
  username: string | null;
  platform: string | null;
  is_active: boolean;
  posting_paused: boolean | null;
  warmup_mode: string | null;
  moved_to_device_at: string | null;
}

interface HoldRow {
  id: number;
  account_id: AccountId;
  geelark_profile: string;
  rule: HoldRule;
  start_day: string;
  days_needed: number | null;
  prev_posting_paused: boolean | null;
  prev_warmup_mode: string | null;
  started_at: string;
  ended_at: string | null;
  outcome: HoldOutcome | null;
}

export interface AutoHoldReport {
  dry: boolean;
  at: string;
  started: { profile: string; name: string; rule: HoldRule; why: string }[];
  ended: { profile: string; name: string; rule: HoldRule; outcome: HoldOutcome }[];
  errors: string[];
}

const ACCOUNT_COLS =
  `${ACCOUNT_ID_COL},geelark_profile,username,platform,is_active,posting_paused,warmup_mode,moved_to_device_at`;
const HOLD_COLS =
  `id,${ACCOUNT_FK_COL},geelark_profile,rule,start_day,days_needed,prev_posting_paused,prev_warmup_mode,started_at,ended_at,outcome`;

/** Accounts on a real phone that a person posts for: the only ones either rule touches. */
const ON_A_PHONE =
  "is_active=eq.true&delivery_mode=eq.manual&device_id=not.is.null&banned_at=is.null" +
  "&geelark_profile=not.is.null";

async function read<T>(path: string, what: string): Promise<T> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

function inList(values: string[]): string {
  return `(${values.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")})`;
}

function mode(m: string | null): "manual" | "script" {
  return m === "script" ? "script" : "manual";
}

async function sessionsFor(accountIds: AccountId[], fromDay: string): Promise<Map<AccountId, SessionLite[]>> {
  const out = new Map<AccountId, SessionLite[]>();
  if (accountIds.length === 0) return out;
  // A day early: start_day is a New York date and started_at is UTC.
  const from = new Date(Date.parse(`${fromDay}T00:00:00Z`) - 86_400_000).toISOString();
  const rows = await read<
    { account_id: AccountId; started_at: string; minutes: number; session_no: number; mode: string }[]
  >(
    `warmup_sessions?select=${ACCOUNT_FK_COL},started_at,minutes,session_no,mode` +
      `&account_id=in.(${accountIds.join(",")})&started_at=gte.${from}`,
    "the warmups",
  );
  for (const r of rows) {
    const list = out.get(r.account_id) ?? [];
    list.push({ startedAt: r.started_at, minutes: r.minutes, sessionNo: r.session_no, mode: mode(r.mode) });
    out.set(r.account_id, list);
  }
  return out;
}

function touched(profile: string): void {
  revalidateTag(accountDetailTag(profile), { expire: 0 });
}

function revalidateAll(): void {
  revalidateTag(ACCOUNTS_TAG, { expire: 0 });
  revalidateTag(TODO_TAG, { expire: 0 });
  revalidateTag(NOTIFICATIONS_TAG, { expire: 0 });
}

// ------------------------------------------------------------ ending holds

async function endHold(
  hold: HoldRow,
  account: AccountRow | null,
  outcome: HoldOutcome,
): Promise<void> {
  const profile = hold.geelark_profile;
  if (outcome === "restored") {
    if (hold.rule === "zero_views" && hold.prev_posting_paused !== true) {
      await setPostingPaused(profile, false, AUTO_HOLD_ACTOR);
    }
    const back = mode(hold.prev_warmup_mode);
    if (account && mode(account.warmup_mode) !== back) await setWarmupMode(profile, back);
  }
  const res = await sbFetch(`account_auto_holds?id=eq.${hold.id}&ended_at=is.null`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ ended_at: new Date().toISOString(), outcome }),
  });
  if (!res.ok) throw new Error(`Couldn't close the hold on ${profile} (HTTP ${res.status})`);

  await auditLog({
    userEmail: AUTO_HOLD_ACTOR,
    action: "auto_hold_end",
    target: profile,
    oldValue: { rule: hold.rule, posting_paused: account?.posting_paused, warmup_mode: account?.warmup_mode },
    newValue: { outcome, warmup_mode: outcome === "restored" ? mode(hold.prev_warmup_mode) : account?.warmup_mode },
  });
  // Only a restore is news. "Somebody changed it by hand" was that person's
  // own doing, and a retirement has its own bell item.
  if (outcome === "restored") {
    const copy = restoreCopy(hold.rule, accountName(account?.username ?? null, profile), hold.prev_warmup_mode);
    await insertNotification({ type: "auto_hold", ...copy, target: profile, meta: { rule: hold.rule, outcome } });
  }
  touched(profile);
}

/**
 * Settle the open holds, optionally for one account only. Returns what ended.
 */
async function settleHolds(
  holds: HoldRow[],
  dry: boolean,
  report: AutoHoldReport,
): Promise<void> {
  const open = holds.filter((h) => !h.ended_at);
  if (open.length === 0) return;

  const ids = open.map((h) => h.account_id);
  const [accounts, sessions] = await Promise.all([
    read<AccountRow[]>(`accounts?select=${ACCOUNT_COLS}&id=in.(${ids.join(",")})`, "the held accounts"),
    sessionsFor(ids, open.map((h) => h.start_day).sort()[0]!),
  ]);
  const byId = new Map(accounts.map((a) => [a.id, a]));

  for (const hold of open) {
    const account = byId.get(hold.account_id) ?? null;
    const outcome = settleOpenHold(
      { rule: hold.rule, startDay: hold.start_day, daysNeeded: hold.days_needed },
      account
        ? { isActive: account.is_active, postingPaused: account.posting_paused === true, warmupMode: mode(account.warmup_mode) }
        : null,
      sessions.get(hold.account_id) ?? [],
    );
    if (!outcome) continue;
    report.ended.push({
      profile: hold.geelark_profile,
      name: accountName(account?.username ?? null, hold.geelark_profile),
      rule: hold.rule,
      outcome,
    });
    if (dry) continue;
    try {
      await endHold(hold, account, outcome);
    } catch (err) {
      report.errors.push(`${hold.geelark_profile}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

// ----------------------------------------------------------- starting holds

async function startHold(
  account: AccountRow,
  rule: HoldRule,
  why: string,
  evidence: Record<string, unknown>,
  missedDays?: number,
): Promise<void> {
  const profile = account.geelark_profile;
  const res = await sbFetch("account_auto_holds", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      account_id: account.id,
      geelark_profile: profile,
      rule,
      start_day: etDay(new Date()),
      days_needed:
        rule === "zero_views" ? ZERO_VIEWS_HOLD_DAYS : rule === "robot_failing" ? ROBOT_FAILING_HOLD_DAYS : null,
      prev_posting_paused: account.posting_paused === true,
      prev_warmup_mode: mode(account.warmup_mode),
      evidence: { why, ...evidence },
    }),
  });
  // 409 = an open hold already exists (the one-open-hold index). Another run
  // got there first; nothing to do.
  if (res.status === 409) return;
  if (!res.ok) throw new Error(`Couldn't record the hold (HTTP ${res.status}: ${await res.text()})`);
  const [created] = (await res.json()) as { id: number }[];

  try {
    if (rule !== "robot_failing" && account.posting_paused !== true) {
      await setPostingPaused(profile, true, AUTO_HOLD_ACTOR);
    }
    if (rule !== "zero_views_again" && mode(account.warmup_mode) !== "manual") {
      await setWarmupMode(profile, "manual");
    }
  } catch (err) {
    // The account could not be changed, so the hold must not stand: close it
    // rather than leave a record of a change that did not happen.
    await sbFetch(`account_auto_holds?id=eq.${created!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ ended_at: new Date().toISOString(), outcome: "overridden" }),
    }).catch(() => undefined);
    throw err;
  }

  await auditLog({
    userEmail: AUTO_HOLD_ACTOR,
    action: "auto_hold_start",
    target: profile,
    oldValue: { posting_paused: account.posting_paused, warmup_mode: account.warmup_mode },
    newValue: {
      rule,
      why,
      posting_paused: rule === "robot_failing" ? account.posting_paused : true,
      warmup_mode: rule === "zero_views_again" ? account.warmup_mode : "manual",
    },
  });
  const copy = startCopy(rule, accountName(account.username, profile), missedDays);
  await insertNotification({ type: "auto_hold", ...copy, target: profile, meta: { rule, why } });
  touched(profile);
}

async function zeroViewCandidates(
  accounts: AccountRow[],
  holds: HoldRow[],
): Promise<{ account: AccountRow; rule: HoldRule; why: string; since: string | null }[]> {
  const held = new Set(holds.filter((h) => !h.ended_at).map((h) => h.account_id));
  // Already paused by somebody: that was a decision, and it is left alone.
  const tiktok = accounts.filter(
    (a) => a.platform === "tiktok" && a.username && !held.has(a.id) && a.posting_paused !== true,
  );
  if (tiktok.length === 0) return [];

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const reads = await sbRestAll<{ account: string; post_id: string; posted_at: string; views: number | null; ingested_at: string }>(
    `tt_post_performance?select=account,post_id,posted_at,views,ingested_at` +
      `&account=in.${encodeURIComponent(inList(tiktok.map((a) => a.username!)))}` +
      `&posted_at=gte.${since}&order=posted_at.desc`,
  );
  const byName = new Map<string, PostRead[]>();
  for (const r of reads) {
    const list = byName.get(r.account) ?? [];
    list.push({ postId: r.post_id, postedAt: r.posted_at, views: r.views, readAt: r.ingested_at });
    byName.set(r.account, list);
  }

  const out: { account: AccountRow; rule: HoldRule; why: string; since: string | null }[] = [];
  for (const account of tiktok) {
    const past = holds
      .filter((h) => h.account_id === account.id && h.ended_at && h.rule !== "robot_failing")
      .sort((a, b) => b.ended_at!.localeCompare(a.ended_at!));
    const last = past[0];
    // The zeros that set the last hold off must not set it off again.
    const after = last?.ended_at ?? null;
    if (!hasZeroStreak(byName.get(account.username!) ?? [], after)) continue;
    // Again, after the hand warmups ran their course: ask for a retirement.
    // A hold somebody cut short by hand does not count as having had them.
    const hadWarmups = past.some((h) => h.rule === "zero_views" && h.outcome === "restored");
    out.push({
      account,
      rule: hadWarmups ? "zero_views_again" : "zero_views",
      why: "last 3 posts got 0 views",
      since: after,
    });
  }
  return out;
}

async function robotFailingCandidates(
  accounts: AccountRow[],
  holds: HoldRow[],
  now: Date,
  daysOff: readonly number[],
): Promise<{ account: AccountRow; missed: number }[]> {
  const held = new Set(holds.filter((h) => !h.ended_at).map((h) => h.account_id));
  const automated = accounts.filter(
    (a) =>
      mode(a.warmup_mode) === "script" &&
      (a.platform === "tiktok" || a.platform === "instagram") &&
      !held.has(a.id),
  );
  if (automated.length === 0) return [];
  const last = await getLastFinishedWarmups(automated.map((a) => a.geelark_profile));
  const out: { account: AccountRow; missed: number }[] = [];
  for (const a of automated) {
    const missed = missedWarmupDays(last.get(a.geelark_profile) ?? null, a.moved_to_device_at, now, daysOff);
    if (missed !== null && missed >= ROBOT_FAILING_MISSED_DAYS) out.push({ account: a, missed });
  }
  return out;
}

// --------------------------------------------------------------------- runs

async function readHolds(accountId?: AccountId): Promise<HoldRow[]> {
  return read<HoldRow[]>(
    `account_auto_holds?select=${HOLD_COLS}` +
      (accountId ? `&account_id=eq.${accountId}` : "") +
      "&order=started_at.desc&limit=1000",
    "the account holds",
  );
}

/** The daily run: settle open holds, then start new ones. */
export async function runAutoHolds(opts: { dry?: boolean; now?: Date } = {}): Promise<AutoHoldReport> {
  const dry = opts.dry === true;
  const now = opts.now ?? new Date();
  const report: AutoHoldReport = { dry, at: now.toISOString(), started: [], ended: [], errors: [] };

  // Settle first, so an account that finished its hold can be judged afresh.
  await settleHolds(await readHolds(), dry, report);

  const [holds, accounts, daysOff] = await Promise.all([
    readHolds(),
    read<AccountRow[]>(`accounts?select=${ACCOUNT_COLS}&${ON_A_PHONE}&order=id.asc`, "the accounts"),
    getDaysOff(),
  ]);
  for (const c of await zeroViewCandidates(accounts, holds)) {
    const name = accountName(c.account.username, c.account.geelark_profile);
    report.started.push({ profile: c.account.geelark_profile, name, rule: c.rule, why: c.why });
    if (dry) continue;
    try {
      await startHold(c.account, c.rule, c.why, { posts_after: c.since });
    } catch (err) {
      report.errors.push(`${c.account.geelark_profile}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Not on a day off: nobody is there to take the warmups over.
  if (isWorkingDay(etDay(now), daysOff)) {
    const zeroHeld = new Set(report.started.map((s) => s.profile));
    for (const c of await robotFailingCandidates(accounts, holds, now, daysOff)) {
      if (zeroHeld.has(c.account.geelark_profile)) continue;
      const name = accountName(c.account.username, c.account.geelark_profile);
      const why = `no finished robot warmup in ${c.missed} working days`;
      report.started.push({ profile: c.account.geelark_profile, name, rule: "robot_failing", why });
      if (dry) continue;
      try {
        await startHold(c.account, "robot_failing", why, { missed_days: c.missed }, c.missed);
      } catch (err) {
        report.errors.push(`${c.account.geelark_profile}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (!dry && (report.started.length > 0 || report.ended.length > 0)) revalidateAll();
  return report;
}

/**
 * After a warmup is logged by hand: if that account is on hold and this was
 * the last warmup it needed, put it back now rather than tomorrow morning.
 * Never throws; a failure here must not undo the warmup that was just saved.
 */
export async function settleAccountHold(accountId: AccountId): Promise<void> {
  try {
    const holds = await readHolds(accountId);
    if (!holds.some((h) => !h.ended_at)) return;
    const report: AutoHoldReport = { dry: false, at: new Date().toISOString(), started: [], ended: [], errors: [] };
    await settleHolds(holds, false, report);
    for (const e of report.errors) console.error("[auto-hold]", e);
    if (report.ended.length > 0) revalidateAll();
  } catch (err) {
    console.error("[auto-hold] could not check the hold after a warmup", err);
  }
}
