import { getCleanupsByDevice } from "@/lib/data/ban-cleanups";
import { sbRest } from "@/lib/data/supabase";
import { toPlatform } from "@/lib/platform";
import {
  SESSIONS_PER_DAY,
  SESSION_TARGET_MINUTES,
  dayRangeET,
  getSessionsOnDay,
  progressToday,
  type WarmupSession,
} from "@/lib/data/warmup-sessions";
import type {
  TodoAccount,
  TodoDevice,
  TodoItem,
  TodoItemStatus,
} from "@/lib/data/todo-placeholder";

/**
 * The day's work on the real phones — PF-07.
 *
 * This is the live answer to the question `todo-placeholder.ts` has been
 * answering with invented phones since design ticket P2. It returns exactly
 * the shape that file returns, so the dashboard card and the To-do page draw
 * it without knowing which they were handed.
 *
 * WHERE EACH HALF COMES FROM.
 *  - POSTS are rows of `post_deliveries` (PF-05), handed out by the Posting
 *    Agent fork (PF-06). Everything the row does not hold — the caption to
 *    copy, the media to download, the time it was meant to go out — comes from
 *    `unified_posts`, the view that already flattens every content table into
 *    one shape for the poster.
 *  - WARMUPS are not stored as to-do rows at all. Every account gets two a day
 *    (Garreth, 2026-09-19) and a session is done once its minutes reach the
 *    target, so the two items are DERIVED from `warmup_sessions` (PF-04) each
 *    time this runs. Nothing has to be created at midnight, and a day nobody
 *    looked at still reads correctly afterwards.
 *
 * THE RULES IT ENFORCES, all Garreth's:
 *  - A paused account is given no posts (2026-09-19), but a paused account
 *    with Manual warmup still gets its two warmups (2026-09-23) — see
 *    `workFor` below.
 *  - An unfinished post carries over for three days and then stops (2026-09-19).
 *  - A FAILED post is dumped: it is finished, it never carries over, and it is
 *    never handed out again (2026-09-22).
 *  - An account set to Automated still puts its warmups on the list, as items
 *    nobody can tick, so a script that has stopped shows up as work that never
 *    completes rather than as silence (2026-09-22).
 *
 * Not cached, the same rule `post-deliveries.ts` gives: this list is written
 * to while it is being looked at, and a cached copy would show an item
 * somebody has just ticked as still outstanding.
 */

/** How many days an unfinished post keeps appearing (Garreth, 2026-09-19). */
export const CARRY_OVER_DAYS = 3;

/**
 * How long a post may sit `queued` before it is overdue.
 *
 * A day, measured from the hand-out (Garreth, 2026-09-22). The Posting Agent
 * hands the day's posts out at 10:00 ET, so anything still untouched at the
 * same hour tomorrow has had a full working day pass it by.
 *
 * One number for both places that say so — the bell's overdue item and the
 * red Overdue pill on the list (P12, Garreth 2026-09-23) — so the two can
 * never disagree about the same post.
 */
export const OVERDUE_HOURS = 24;

/**
 * How long an open post has waited, once it is overdue: "26 h" under two
 * days, "3 days" after. Null while it is not overdue yet. The space is a
 * non-breaking one so a phone never splits the number from its unit.
 */
export function overdueFor(createdAt: string, now: Date): string | null {
  const hours = Math.floor((now.getTime() - Date.parse(createdAt)) / 3_600_000);
  if (hours < OVERDUE_HOURS) return null;
  return hours >= 48 ? `${Math.floor(hours / 24)}\u00a0days` : `${hours}\u00a0h`;
}

/** When each of the day's two warmups is expected. Times rather than a rule:
 *  the list is read at a glance and "morning" and "evening" need an hour
 *  beside them to sort against the day's posts. */
const WARMUP_DUE = ["08:30", "19:00"];
const WARMUP_LABEL = ["Warmup, morning", "Warmup, evening"];

/**
 * A warmup item's id.
 *
 * Warmups are derived, not stored, so an item needs an id that says what it
 * IS rather than which row it came from: the account, the New York day and
 * which of that day's two sessions. The sheet reads it back to know what to
 * write. Spelled in one place so the two directions cannot drift.
 */
export function warmupItemId(accountId: number, day: string, sessionNo: number): string {
  return `w${accountId}-${day}-${sessionNo}`;
}

export function parseWarmupItemId(
  id: string,
): { accountId: number; day: string; sessionNo: number } | null {
  const m = /^w(\d+)-(\d{4}-\d{2}-\d{2})-([12])$/.exec(id);
  if (!m) return null;
  return { accountId: Number(m[1]), day: m[2]!, sessionNo: Number(m[3]) };
}

/**
 * What the list asks of one account: posts, warmups, both or neither.
 *
 * Decision 6 (Garreth, 2026-09-19) hid a paused account entirely — it keeps
 * its phone and simply does no work. He narrowed it on 2026-09-23: an account
 * that has just moved onto a phone stays paused for three to five days while
 * it is warmed back up BY HAND, and those warmups are real work that belongs
 * on the list. So pausing still stops the POSTS, always, and it stops the
 * warmups only for an account set to Automated, whose sessions a script logs
 * and nobody on the phones is asked for.
 *
 * One function, because the list, the phone's own page, the dashboard card and
 * the bell's count all read the board this feeds, and the rule for a paused
 * account has to be the same in every one of them.
 */
export function workFor(account: {
  posting_paused: boolean | null;
  warmup_mode: string | null;
}): { posts: boolean; warmups: boolean } {
  if (account.posting_paused !== true) return { posts: true, warmups: true };
  return { posts: false, warmups: account.warmup_mode !== "script" };
}

interface RawAccount {
  id: number;
  geelark_profile: string | null;
  username: string | null;
  character: string | null;
  platform: string | null;
  device_id: number | null;
  warmup_mode: string | null;
  posting_paused: boolean | null;
}

interface RawDevice {
  id: number;
  name: string;
  model: string | null;
  is_active: boolean;
}

interface RawDelivery {
  id: number;
  content_type: string;
  source_id: string;
  account_id: number;
  status: string;
  post_url: string | null;
  note: string | null;
  done_at: string | null;
  created_at: string;
}

interface RawUnified {
  content_type: string;
  content_id: string;
  posting_date: string | null;
  posting_time: string | null;
  media_url: string | null;
  media_urls: string[] | null;
  caption: string | null;
}

/** The New York calendar date of an instant, as YYYY-MM-DD. */
function etDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(iso));
}

/** "HH:MM" in New York, for the due time a row shows. */
function etTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/** How a delivery row reads on the list. `postedNoLink` is not a status in the
 *  database: it is `posted` with no link yet, which is what decision 7 asks
 *  for — done, but still owing the thing attribution needs. */
function statusOf(row: RawDelivery): TodoItemStatus {
  if (row.status === "posted") return row.post_url ? "posted" : "postedNoLink";
  if (row.status === "failed") return "failed";
  if (row.status === "skipped") return "skipped";
  return "todo";
}

export interface TodoPost {
  /** The delivery row, which is what a tick writes back to. */
  deliveryId: number;
  caption: string | null;
  /** Everything there is to download: one video, or a carousel's slides. */
  media: string[];
}

/** What the screens need beyond the item itself: the caption to copy and the
 *  media to fetch, keyed by item id so the row can offer both without the
 *  board carrying captions through every component. */
export type TodoExtras = Record<string, TodoPost>;

export interface TodoBoard {
  devices: TodoDevice[];
  extras: TodoExtras;
  /** True when there are no phones at all, which the empty state words
   *  differently from a phone with nothing due. */
  noPhones: boolean;
}

/**
 * Read one day's work, `dayOffset` days from today (0 is today, -1 yesterday).
 *
 * `only.deviceId` narrows the read to one phone, for that phone's own page
 * (P5). It is the same list, read by the same rules, with the phones and
 * accounts it starts from filtered to one — so a phone's page and the To-do
 * page can never disagree about what that phone owes.
 */
export async function getTodoBoard(
  dayOffset = 0,
  now: Date = new Date(),
  only: { deviceId?: number } = {},
): Promise<TodoBoard> {
  const { from, to } = dayRangeET(dayOffset, now);
  const day = etDay(from.toISOString());

  const onePhone = only.deviceId !== undefined;
  const [devices, accounts] = await Promise.all([
    sbRest<RawDevice[]>(
      "devices?select=id,name,model,is_active&order=name.asc" +
        (onePhone ? `&id=eq.${only.deviceId}` : ""),
    ),
    sbRest<RawAccount[]>(
      "accounts?select=id,geelark_profile,username,character,platform,device_id," +
        "warmup_mode,posting_paused&is_active=eq.true&order=id.asc" +
        (onePhone ? `&device_id=eq.${only.deviceId}` : "&device_id=not.is.null"),
    ),
  ]);
  // So a post's row can be named rather than showing its content_type slug.
  // Loaded once per process, not once per read.
  await loadContentLabels();

  if (devices.length === 0) {
    return { devices: [], extras: {}, noPhones: true };
  }

  // Decision 6 as it now stands (Garreth, 2026-09-23): a paused account is
  // given no posts, but one warmed by hand keeps its warmups. An account with
  // nothing asked of it is left off the list altogether.
  const working = accounts.filter((a) => workFor(a).posts || workFor(a).warmups);
  const posting = new Map(working.filter((a) => workFor(a).posts).map((a) => [a.id, a]));

  // A ban's clean-up is read without a fallback, unlike the warmups: a list
  // that quietly dropped a banned account's sign-out would look finished when
  // it is not, and a list that says it could not load is the honest failure.
  const [deliveries, sessions, cleanups] = await Promise.all([
    readDeliveries([...posting.keys()], from),
    getSessionsOnDay({}, dayOffset, now).catch(() => [] as WarmupSession[]),
    getCleanupsByDevice(from, to),
  ]);

  // Only the content rows we actually need, one request, keyed for the join.
  const unified = await readUnified(deliveries);

  const extras: TodoExtras = {};
  const itemsByAccount = new Map<number, TodoItem[]>();

  for (const row of deliveries) {
    const account = posting.get(row.account_id);
    if (!account) continue;

    const content = unified.get(`${row.content_type}\u0000${row.source_id}`);
    // THE DAY A POST BELONGS TO IS THE DAY IT WAS HANDED OUT, which is what
    // the delivery row's own `created_at` records. Not the content row's
    // `posting_date`: that is the scheduler's plan, and a content row written
    // months ago still carries the date it was planned for — so reading the
    // day from there hid a post from the very list it had just been handed to.
    // The TIME still comes from the plan, because that is the hour it should
    // go out at.
    const postDay = etDay(row.created_at);
    const status = statusOf(row);
    const finished = status !== "todo";

    // WHICH DAY THIS POST BELONGS TO.
    //
    // A FINISHED one belongs to the day it was FINISHED, not the day it was
    // handed out. That matters for a post carried over from Monday and ticked
    // off on Wednesday: it has to stay on Wednesday's list, struck through
    // with the time, for the rest of that day — "a finished item stays" (P2).
    // Reading its day from the hand-out date instead made it vanish from the
    // list the instant it was ticked, which reads exactly like a save that
    // did not work.
    //
    // An OPEN one belongs to the day it was handed out and carries over from
    // there for three days, then stops (decision 5, Garreth 2026-09-19). A
    // failed post never carries over at all, because failed is finished —
    // it is dumped (Garreth, 2026-09-22).
    if (finished) {
      if (!row.done_at || etDay(row.done_at) !== day) continue;
    } else {
      if (postDay > day) continue; // not yet its day
      if (postDay !== day && daysBetween(postDay, day) > CARRY_OVER_DAYS) continue;
    }

    // Overdue is about NOW, so only today's list says it (P12). A day stepped
    // back to is a record of that day, and a day ahead has nothing late yet.
    const waited = !finished && dayOffset === 0 ? overdueFor(row.created_at, now) : null;
    const lastDay =
      !finished && dayOffset === 0 && postDay !== day && daysBetween(postDay, day) === CARRY_OVER_DAYS;

    const id = `d${row.id}`;
    const item: TodoItem = {
      id,
      kind: "post",
      label: content ? labelFor(row.content_type) : row.content_type,
      due: content?.posting_time?.slice(0, 5) ?? etTime(row.created_at),
      status,
      // In words, as the approved design reads ("Due yesterday", "Due 3 days
      // ago"), not the raw date the row stores.
      ...(postDay !== day ? { carriedOverFrom: daysAgo(daysBetween(postDay, day)) } : {}),
      ...(waited ? { overdueFor: waited } : {}),
      ...(lastDay ? { lastDay: true } : {}),
      ...(row.done_at ? { doneAt: etTime(row.done_at) } : {}),
      ...(row.note ? { reason: row.note } : {}),
      // Nothing to download means the render has not landed, and the button
      // cannot work — which the row says rather than offering a dead press.
      videoReady: (content?.media_urls?.length ?? 0) > 0 || Boolean(content?.media_url),
    };
    push(itemsByAccount, row.account_id, item);
    extras[id] = {
      deliveryId: row.id,
      caption: content?.caption ?? null,
      media: content?.media_urls?.length ? content.media_urls : content?.media_url ? [content.media_url] : [],
    };
  }

  // The two warmups every account owes that day, worked out from what was
  // logged rather than stored as rows of their own.
  for (const account of working) {
    if (!workFor(account).warmups) continue;
    const mine = sessions.filter((s) => s.accountId === account.id);
    const progress = progressToday(mine);
    const automated = account.warmup_mode === "script";

    for (let i = 0; i < SESSIONS_PER_DAY; i++) {
      const p = progress[i]!;
      const last = mine.filter((s) => s.sessionNo === p.sessionNo).at(-1);
      push(itemsByAccount, account.id, {
        id: warmupItemId(account.id, day, p.sessionNo),
        kind: "warmup",
        label: WARMUP_LABEL[i] ?? `Warmup ${p.sessionNo}`,
        due: WARMUP_DUE[i] ?? "12:00",
        status: p.done ? "logged" : "todo",
        ...(p.done && last ? { doneAt: etTime(last.finishedAt ?? last.startedAt) } : {}),
        targetMinutes: SESSION_TARGET_MINUTES,
        loggedMinutes: p.minutes,
        // An Automated account's warmups stay on the list and cannot be
        // ticked, so a script that has stopped reads as work that never
        // completes (Garreth, 2026-09-22, overturning P4's original rule).
        ...(automated ? { automated: true } : {}),
      });
    }
  }

  const board = devices.map<TodoDevice>((d) => ({
    id: String(d.id),
    name: d.name,
    ...(d.model ? { model: d.model } : {}),
    isActive: d.is_active,
    accounts: working
      .filter((a) => a.device_id === d.id)
      .map<TodoAccount>((a) => ({
        id: String(a.id),
        handle: a.username ? `@${a.username}` : (a.geelark_profile ?? `Account ${a.id}`),
        platform: toPlatform(a.platform),
        character: a.character ?? "—",
        items: itemsByAccount.get(a.id) ?? [],
      })),
    // The clean-up after a ban on this phone (PF-11). The banned account is
    // retired, so it is not among `accounts` above; its steps stand alone.
    ...(cleanups.has(d.id) ? { cleanups: cleanups.get(d.id) } : {}),
  }));

  return { devices: board, extras, noPhones: false };
}

function push<T>(map: Map<number, T[]>, key: number, value: T) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** "yesterday", "2 days ago": how far back a carried-over post was due. */
function daysAgo(days: number): string {
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/** Whole days between two YYYY-MM-DD dates. Both are already New York dates,
 *  so they are compared as calendar dates and never as instants. */
function daysBetween(from: string, to: string): number {
  const a = Date.UTC(...(from.split("-").map(Number) as [number, number, number]));
  const b = Date.UTC(...(to.split("-").map(Number) as [number, number, number]));
  return Math.round((b - a) / 86_400_000);
}

/**
 * The deliveries that could possibly belong to this day: everything still
 * open, plus everything finished since the start of it. Open rows are read
 * without a date bound because a carried-over post was handed out days ago;
 * the carry-over window is applied per row above, where the content's own day
 * is known.
 */
async function readDeliveries(accountIds: number[], from: Date): Promise<RawDelivery[]> {
  if (accountIds.length === 0) return [];
  const cols = "id,content_type,source_id,account_id,status,post_url,note,done_at,created_at";
  const inList = `(${accountIds.join(",")})`;
  const [open, done] = await Promise.all([
    sbRest<RawDelivery[]>(
      `post_deliveries?select=${cols}&account_id=in.${inList}&status=eq.queued&order=created_at.asc`,
    ),
    sbRest<RawDelivery[]>(
      `post_deliveries?select=${cols}&account_id=in.${inList}` +
        `&done_at=gte.${from.toISOString()}&order=created_at.asc`,
    ),
  ]);
  return [...open, ...done];
}

/** The content rows behind those deliveries, in one request per content type. */
async function readUnified(deliveries: RawDelivery[]): Promise<Map<string, RawUnified>> {
  const out = new Map<string, RawUnified>();
  if (deliveries.length === 0) return out;

  const ids = [...new Set(deliveries.map((d) => d.source_id))];
  const cols = "content_type,content_id,posting_date,posting_time,media_url,media_urls,caption";
  const quoted = ids.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
  let rows: RawUnified[] = [];
  try {
    rows = await sbRest<RawUnified[]>(
      `unified_posts?select=${cols}&content_id=in.(${encodeURIComponent(quoted)})`,
    );
  } catch {
    // A to-do list with no captions is still a usable to-do list; one that
    // fails to load is not. The rows fall back to their content type as a
    // label and offer nothing to copy.
    return out;
  }
  for (const r of rows) out.set(`${r.content_type}\u0000${r.content_id}`, r);
  return out;
}

/** Display names for content types, read once and kept for the process. The
 *  registry is small and changes when somebody adds a content type, which is
 *  not something a to-do list needs to notice within the minute. */
let labels: Map<string, string> | null = null;

export async function loadContentLabels(): Promise<void> {
  if (labels) return;
  try {
    const rows = await sbRest<{ content_type: string; display_name: string | null }[]>(
      "content_type_registry?select=content_type,display_name",
    );
    labels = new Map(rows.map((r) => [r.content_type, r.display_name ?? r.content_type]));
  } catch {
    labels = new Map();
  }
}

function labelFor(contentType: string): string {
  return labels?.get(contentType) ?? contentType;
}
