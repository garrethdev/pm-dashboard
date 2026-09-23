/**
 * Moving accounts onto real phones — design ticket P10, for PF-03 and PF-15.
 *
 * Today a move is two steps in two places: flip the account to Physical in
 * Settings, then go to the phone and add the account to it. Nothing joins them,
 * so an account can sit on the Physical fleet with no phone to be worked on,
 * which is the state the To-do list cannot show and nobody would think to look
 * for. P10 makes it one action.
 *
 * The rules live here, apart from the screens, for the same reason
 * `device-rules.ts` does: they are the part worth testing without a database,
 * and the single move and the batch move have to agree about what a full phone
 * is. `assignRefusal` in device-rules stays the authority on whether one
 * account may go on one phone; this file is about CHOOSING the phone, and about
 * spreading a batch of accounts across the phones that have room.
 */

import { ACCOUNTS_PER_PHONE, parseRowId } from "@/lib/data/device-rules";

/** A phone as the move screens see it: enough to pick it, or say why not. */
export interface MoveTarget {
  id: number;
  name: string;
  model: string | null;
  isActive: boolean;
  /** How many accounts it holds right now. */
  held: number;
}

/**
 * An account as the move screens see it.
 *
 * Keyed on the Geelark profile rather than `accounts.id`, because that is what
 * `/api/accounts/delivery-mode` already takes and what Settings already lists.
 * The day an account exists with no profile at all — one created straight onto
 * a real phone — this needs the row id instead, and so does that route.
 */
export interface MoveCandidate {
  profile: string;
  username: string | null;
  character: string | null;
}

/**
 * How a phone is described in a list: "2 accounts".
 *
 * A count, not "2 of 3". A phone has no maximum (Garreth, 2026-09-22), so a
 * fraction would keep asserting one — and would read as an error the first
 * time somebody puts a fourth account on.
 */
export function roomLabel(target: MoveTarget): string {
  return `${target.held} account${target.held === 1 ? "" : "s"}`;
}

/**
 * How many more this phone would take before the batch moves on to the next.
 *
 * A filling ORDER, not a limit: it is what keeps a character's accounts
 * together on one phone rather than dealing them out across the box. Once
 * every phone has reached it, the batch keeps going round rather than running
 * out of room — there is no room to run out of.
 */
export function roomBeforeNext(target: MoveTarget): number {
  if (!target.isActive) return 0;
  return Math.max(0, ACCOUNTS_PER_PHONE - target.held);
}

/**
 * Why this phone cannot take another account, as a sentence — or null when it
 * can. The wording matches `assignRefusal`, which is what the save will
 * actually run into; saying it differently here would mean the screen and the
 * refusal describe the same phone two ways.
 *
 * Being switched off is the only reason left. "Full" is gone: nothing caps a
 * phone any more.
 */
export function targetRefusal(target: MoveTarget): string | null {
  if (!target.isActive) return `${target.name} is switched off`;
  return null;
}

export function canTake(target: MoveTarget): boolean {
  return targetRefusal(target) === null;
}

/** One line of a batch move: this account onto this phone, or onto nothing. */
export interface BatchRow {
  account: MoveCandidate;
  /** The phone chosen for it, or null when there was no room left. */
  targetId: number | null;
}

export interface BatchPlan {
  rows: BatchRow[];
  /** Accounts with a phone, in the order they were given. */
  moving: number;
  /** Accounts with nowhere to go. */
  stranded: number;
  /** Distinct phones the plan touches. */
  phonesUsed: number;
}

/**
 * Spread a batch of accounts across the phones that are switched on.
 *
 * FILLS EACH PHONE BEFORE STARTING THE NEXT, rather than dealing them out one
 * per phone. On the day a box of phones arrives the accounts go on in
 * character order, and a character's accounts belong together — one phone
 * carries one character's Instagram and Facebook and another character's
 * TikTok. Dealing round-robin would scatter a character across every phone in
 * the box, which is the arrangement the whole farm is set up to avoid.
 *
 * NOTHING RUNS OUT OF ROOM. A phone has no maximum (Garreth, 2026-09-22), so
 * once every phone has taken its usual three the loop starts again at the
 * first. The only account that gets no phone is one with no phone to go on at
 * all, because every phone is switched off or there are none.
 */
export function planBatch(accounts: MoveCandidate[], targets: MoveTarget[]): BatchPlan {
  const usable = targets.filter(canTake);
  if (usable.length === 0) {
    return {
      rows: accounts.map((account) => ({ account, targetId: null })),
      moving: 0,
      stranded: accounts.length,
      phonesUsed: 0,
    };
  }

  // Each phone's remaining share of this pass. Refilled when they all reach
  // their usual number, so a long batch keeps going instead of stopping.
  const room = new Map(usable.map((t) => [t.id, roomBeforeNext(t)]));
  const rows: BatchRow[] = [];
  const touched = new Set<number>();

  for (const account of accounts) {
    let next = usable.find((t) => (room.get(t.id) ?? 0) > 0);
    if (!next) {
      // Everyone is at their usual number; go round again.
      usable.forEach((t) => room.set(t.id, ACCOUNTS_PER_PHONE));
      next = usable[0]!;
    }
    room.set(next.id, (room.get(next.id) ?? 0) - 1);
    touched.add(next.id);
    rows.push({ account, targetId: next.id });
  }

  const moving = rows.filter((r) => r.targetId !== null).length;
  return { rows, moving, stranded: rows.length - moving, phonesUsed: touched.size };
}

/**
 * Re-count a plan after someone has changed a row by hand.
 *
 * The plan is a starting point, not a decision: the person moving the accounts
 * knows things the app does not, such as which phone is sitting on which desk.
 * So every row's phone can be changed, and the counts have to follow.
 *
 * `unusable` names a phone that cannot take an account at all — switched off —
 * so the screen can refuse the move rather than let the save fail one row at a
 * time. Putting five accounts on one phone is no longer a reason to refuse.
 */
export function tallyPlan(rows: BatchRow[], targets: MoveTarget[]): BatchPlan & {
  unusable: MoveTarget[];
} {
  const byId = new Map(targets.map((t) => [t.id, t]));
  const chosen = new Map<number, number>();
  for (const r of rows) {
    if (r.targetId === null) continue;
    chosen.set(r.targetId, (chosen.get(r.targetId) ?? 0) + 1);
  }

  const unusable: MoveTarget[] = [];
  for (const id of chosen.keys()) {
    const t = byId.get(id);
    if (t && !canTake(t)) unusable.push(t);
  }

  const moving = rows.filter((r) => r.targetId !== null).length;
  return {
    rows,
    moving,
    stranded: rows.length - moving,
    phonesUsed: chosen.size,
    unusable,
  };
}

/**
 * The sentence under a batch, saying what is about to happen and what is not.
 *
 * One sentence rather than a count beside a label, because the interesting case
 * is the one where the numbers disagree — six accounts selected, four phones'
 * worth of room — and two numbers side by side do not say which of them is the
 * problem.
 */
export function batchSummary(plan: { moving: number; stranded: number; phonesUsed: number }): string {
  const acct = (n: number) => `${n} account${n === 1 ? "" : "s"}`;
  if (plan.moving === 0) {
    // The only way to get here now is no phone switched on at all.
    return `No phone is switched on, so ${acct(plan.stranded)} cannot move.`;
  }
  const head = `${acct(plan.moving)} onto ${plan.phonesUsed} phone${plan.phonesUsed === 1 ? "" : "s"}`;
  if (plan.stranded === 0) return `${head}.`;
  return `${head}. ${acct(plan.stranded)} ${plan.stranded === 1 ? "is" : "are"} set to not move.`;
}

/** One account and the phone it is going onto, as the batch save sends it. */
export interface BatchMove {
  profile: string;
  deviceId: number;
}

/**
 * The rows of a plan that actually move (PF-15). A row set to "Not moving" is
 * left out here rather than sent and skipped by the server, so what the button
 * counts and what the save sends are the same list.
 */
export function batchMoves(rows: BatchRow[]): BatchMove[] {
  return rows.flatMap((r) =>
    r.targetId === null ? [] : [{ profile: r.account.profile, deviceId: r.targetId }],
  );
}

const PROFILE_RE = /^Profile \d+$/;

/**
 * Check a batch save request before it goes near the database, and say what is
 * wrong with it in a sentence. Only the SHAPE is checked here — whether each
 * account and phone can take the move is the database function's job, under
 * lock, so the answer cannot go stale between the check and the write.
 *
 * No count limit: nothing caps a phone (Garreth, 2026-09-22), and the whole
 * fleet is a few dozen accounts.
 */
export function parseBatchMoves(raw: unknown): { moves: BatchMove[] } | { error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: "No accounts to move." };
  const moves: BatchMove[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const { profile, deviceId } = (item ?? {}) as { profile?: unknown; deviceId?: unknown };
    if (typeof profile !== "string" || !PROFILE_RE.test(profile)) {
      return { error: "invalid profile" };
    }
    const id = parseRowId(deviceId);
    if (id === null) return { error: `Choose a phone for ${profile} first.` };
    if (seen.has(profile)) return { error: `${profile} is listed more than once.` };
    seen.add(profile);
    moves.push({ profile, deviceId: id });
  }
  return { moves };
}

/** How an account is named on screen. */
export function candidateLabel(a: MoveCandidate): string {
  return a.profile;
}

/**
 * The sentence a move function refused with, or null when the failure was not
 * a refusal. A RAISE from the database arrives with code P0001 and the
 * sentence in `message`; any other error is a fault, and must not be shown as
 * though the account were the problem.
 */
export function moveRefusal(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { code?: unknown; message?: unknown };
    if (parsed.code === "P0001" && typeof parsed.message === "string" && parsed.message) {
      return parsed.message;
    }
  } catch {
    // not JSON: an outage, not a refusal
  }
  return null;
}
