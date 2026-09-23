import { createHash } from "node:crypto";
import { sbRest } from "@/lib/data/supabase";
import { getOpenDeliveries } from "@/lib/data/post-deliveries";
import { OVERDUE_HOURS, getTodoBoard } from "@/lib/data/todo";
import { dayRangeET } from "@/lib/data/warmup-sessions";
import { fleetOfEntity, getPhysicalProfiles } from "@/lib/data/fleet-accounts";
import type { Fleet } from "@/lib/fleet";
import {
  categoryLabel,
  joinList,
  parseLegacyRetireBody,
  retireBody,
  retireTitle,
} from "@/lib/data/notification-copy";

/** A single bell item. Retire completions are stored; warmup fails are recomputed. */
export interface NotificationItem {
  id: string;
  /**
   * The stored type. Deliberately open: the bell gains kinds over time
   * (proxy_replace joined retire and warmup_fail on 2026-09-12) and a union
   * here would have to be widened for each one, in a file that does not
   * otherwise care what the kind is.
   */
  type: string;
  severity: "critical" | "warning" | "success" | "info";
  /** Which part of the system it came from, e.g. "Post-Ban". Shown as a pill. */
  category: string;
  title: string;
  body: string | null;
  target: string | null;
  href?: string;
  at: string;
  /**
   * Which fleet this item is about, named on the row (PF-20).
   *
   * The bell shows BOTH fleets whatever the switch is set to (Garreth,
   * 2026-09-22) — it is the one surface that does, because a ban or a stuck
   * post is news to whoever is looking, not only to whoever happens to have
   * the right fleet selected. That only works if each row says which fleet it
   * came from, which is what this is.
   *
   * `undefined` means the item is about no single account — an n8n workflow, a
   * dead data feed, a scheduled job — and names no fleet, because inventing one
   * for it would be a guess.
   */
  fleet?: Fleet;
  /** Whether THIS viewer has seen it. Per person, not fleet-wide. */
  read: boolean;
  /**
   * What to write to `notification_reads` when this is marked read, and what
   * is looked up to decide `read`. Usually just `[id]`.
   *
   * It exists for the recomputed alerts, whose id carries a hash of the
   * accounts involved. Keying read state on that id meant any change to the
   * set — one account recovering, one more starting to fail — produced a new
   * id and the alert came back unread, which is the "I read it and it came
   * back" complaint (Garreth, 2026-09-12). Marking one key per account instead
   * makes the group read once every account in it has been seen, so a
   * *shrinking* cohort stays read and only a genuinely new account re-alerts.
   */
  markKeys: string[];
}

interface StoredRow {
  id: number;
  at: string;
  type: string;
  severity: string;
  title: string;
  body: string | null;
  target: string | null;
  read: boolean;
}

interface WarmupFailRow {
  geelark_profile: string;
  last_resolved_fail_code: string | null;
  last_resolved_fail_desc: string | null;
  recent_resolved_failures: number;
  days_since_success: number | null;
}

const FAIL_REASON: Record<string, string> = {
  "29996": "proxy detection failed",
  "29997": "insufficient GeeLark balance",
  "29998": "cloud phone deleted",
  "40020": "unknown GeeLark error",
};

/**
 * Warmup-failing accounts (handover): active, last 2 resolved warmups both
 * failed, and no recent success. Grouped by fail_code so a shared cause is
 * obvious (e.g. a cluster of 29997 = empty wallet). Stateless recompute.
 *
 * Grouped by FLEET as well as by fail code (PF-20), so every item can name one
 * fleet. A cohort can genuinely straddle the two: only Geelark warmups can
 * fail — there is no such thing as a failed manual session — but an account
 * that moved to a real phone keeps the Geelark failures behind it, and the
 * rule for every per-fleet number is that an account's history follows the
 * account (Garreth, 2026-09-18). Read state is unaffected by the split, because
 * it is keyed per account rather than per cohort.
 */
async function warmupFailNotifications(
  physical: ReadonlySet<string>,
): Promise<NotificationItem[]> {
  // Pull active-account warmup health; the view already resolves outcomes.
  const rows = await sbRest<WarmupFailRow[]>(
    "v_account_warmup_health?select=geelark_profile,last_resolved_fail_code,last_resolved_fail_desc,recent_resolved_failures,days_since_success&recent_resolved_failures=gte.2",
  );
  // Keep only accounts that are active AND haven't succeeded recently.
  // No character filter: a newly-recorded account has a blank character until
  // someone assigns one, and silently skipping its warmup failures is exactly
  // the window where a broken setup goes unnoticed. Same bug class as the
  // Active-accounts pulse pill (fixed 2026-09-03).
  const active = await sbRest<{ geelark_profile: string }[]>(
    "accounts?select=geelark_profile&is_active=eq.true",
  );
  const activeSet = new Set(active.map((a) => a.geelark_profile));

  const failing = rows.filter(
    (r) =>
      activeSet.has(r.geelark_profile) &&
      (r.days_since_success === null || r.days_since_success >= 3),
  );

  // Group by fail_code, then by the fleet the account sits in today.
  const byCode = new Map<string, WarmupFailRow[]>();
  for (const r of failing) {
    const code = r.last_resolved_fail_code ?? "unknown";
    const fleet = fleetOfEntity(r.geelark_profile, physical) ?? "cloud";
    const key = `${code}|${fleet}`;
    (byCode.get(key) ?? byCode.set(key, []).get(key)!).push(r);
  }

  const items: NotificationItem[] = [];
  for (const [key, group] of byCode) {
    const [code, fleet] = key.split("|") as [string, Fleet];
    const reason = FAIL_REASON[code] ?? group[0]?.last_resolved_fail_desc ?? "warmup failing";
    const profiles = group.map((g) => g.geelark_profile.replace("Profile ", "P")).sort();
    const fleetWide = group.length >= 3;
    items.push({
      fleet,
      // The cohort is part of the identity, not just the payload. These alerts
      // are recomputed rather than stored, so a bare `warmup_fail:29997` would
      // stay read forever once dismissed — including when a different set of
      // accounts starts failing for the same reason. That was survivable while
      // read state was per-browser and easily lost; now that it is durable, a
      // changed cohort has to read as a new alert.
      id: `warmup_fail:${code}:${fleet}:${createHash("sha1").update(profiles.join(",")).digest("hex").slice(0, 8)}`,
      // One key per account, not one per cohort — see markKeys on the
      // interface. The id stays cohort-shaped because React needs a key that
      // changes when the row's content does.
      markKeys: group.map((g) => `warmup_fail:${code}:${g.geelark_profile}`),
      type: "warmup_fail",
      category: categoryLabel("warmup_fail"),
      severity: fleetWide ? "critical" : "warning",
      title: `${group.length} account${group.length === 1 ? "" : "s"} failing warmup`,
      // The reason IS the status here, so it leads the sentence rather than
      // sitting in a pill. Six names then a count: past that the list stops
      // being readable and the shared-cause note is the useful part anyway.
      body:
        `${reason.charAt(0).toUpperCase()}${reason.slice(1)} on ` +
        joinList(
          profiles.length > 6 ? [...profiles.slice(0, 6), `${profiles.length - 6} more`] : profiles,
        ) +
        (fleetWide ? ", likely one shared cause" : ""),
      target: code,
      href: "/accounts",
      at: new Date().toISOString(),
      read: false,
    });
  }
  return items;
}

/** The New York calendar date of an instant, as YYYY-MM-DD. */
function etDayOf(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The phone farm's two bell items — PF-12.
 *
 * PF-12 was written as an n8n job that emailed a morning reminder and a
 * stuck-post alert. Garreth replaced the email with the bell (2026-09-22), and
 * that turned out to suit the work better: both of these are CONDITIONS rather
 * than events, so they belong with the recomputed half of this file, next to
 * the warmup failures, not in `dashboard_notifications`. Neither needs a row
 * written at midnight, and both clear themselves the moment the work is done —
 * there is nothing to tidy up when Yurie finishes her list.
 *
 * ONE — today's work. A single item for the whole day (Garreth, 2026-09-22),
 * not one per phone, counting posts and warmups together because that is the
 * number she sees when the page opens. Its key carries the New York date, so
 * marking it read clears it for today and tomorrow's arrives as a new item.
 *
 * TWO — posts gone stale. Its own item, in red, because "here is today's work"
 * is routine and "this has sat for a day" is a fault, and folding the second
 * into the first is how a fault gets skimmed past. Keyed per delivery like the
 * warmup cohort, so a newly stuck post reopens it and one that gets posted
 * does not drag the others back.
 *
 * ABOUT Physical, SHOWN in both (Garreth, 2026-09-22, settling PF-20). These
 * were built Physical-only that morning and hidden from anyone with the switch
 * on Cloud. PF-20 asked whether the bell should follow the switch at all, and
 * he chose the other way: the bell shows both fleets and names which. So the
 * work still only ever happens on real phones — these two items are always
 * `fleet: "physical"` — but sitting in Cloud no longer hides a stuck post from
 * you, which was the risk the Physical-only version carried.
 *
 * The cost is that both reads now run for every viewer rather than only for
 * Physical ones. Both are already guarded, and they run alongside the other
 * sources rather than after them, so a slow to-do read delays nobody's bell.
 */
async function todoNotifications(): Promise<NotificationItem[]> {
  const now = new Date();
  const { from: dayStart } = dayRangeET(0, now);
  const day = etDayOf(dayStart);

  const [board, open] = await Promise.all([
    getTodoBoard(0, now),
    getOpenDeliveries().catch(() => []),
  ]);

  const items: NotificationItem[] = [];

  // --- One: what is still outstanding today -------------------------------
  // Counted off the list itself, so whatever the list asks for is what this
  // counts — including a paused account's hand warmups (Garreth, 2026-09-23).
  let posts = 0;
  let warmups = 0;
  const phones = new Set<string>();
  // Every delivery the list is actually showing today, so the overdue item
  // below can tell a stuck post apart from a stranded one.
  const onList = new Set<string>();

  for (const device of board.devices) {
    for (const account of device.accounts) {
      for (const item of account.items) {
        if (item.kind === "post") onList.add(item.id);
        if (item.status !== "todo") continue;
        // An Automated account's warmups sit on the list as items nobody can
        // tick (P4). They are the script's work, not a person's, so counting
        // them here would ask Yurie for something she cannot do.
        if (item.automated) continue;
        if (item.kind === "post") posts += 1;
        else warmups += 1;
        phones.add(device.id);
      }
    }
  }

  const total = posts + warmups;
  if (total > 0) {
    // The count is one number because that is what the page shows; the
    // breakdown goes in the body, where it explains the number without
    // splitting the item in two.
    const parts: string[] = [];
    if (posts > 0) parts.push(plural(posts, "post"));
    if (warmups > 0) parts.push(plural(warmups, "warmup"));
    items.push({
      // The work itself is only ever on real phones, whoever is looking.
      fleet: "physical",
      id: `todo_today:${day}`,
      // Dated, so today's can be dismissed and tomorrow's still arrives.
      markKeys: [`todo_today:${day}`],
      type: "todo_today",
      category: categoryLabel("todo_today"),
      severity: "info",
      title: `${plural(total, "thing")} to do today`,
      body: `${joinList(parts)}, across ${plural(phones.size, "phone")}`,
      target: null,
      href: "/todo",
      // The start of the New York day rather than the moment this ran: a
      // timestamp that moved on every read would reshuffle the feed under
      // somebody reading it.
      at: dayStart.toISOString(),
      read: false,
    });
  }

  // --- Two: posts that have gone stale ------------------------------------
  const cutoff = now.getTime() - OVERDUE_HOURS * 3_600_000;
  const overdue = open
    .filter((d) => Date.parse(d.createdAt) <= cutoff)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (overdue.length > 0) {
    const oldest = overdue[0]!;
    const hours = Math.floor((now.getTime() - Date.parse(oldest.createdAt)) / 3_600_000);
    const waited = hours >= 48 ? plural(Math.floor(hours / 24), "day") : plural(hours, "hour");
    // A post stops carrying over after three days (todo.ts), so it can be
    // queued, overdue, and no longer on the list at all. That is the worst
    // case, not an edge case — nothing else in the app would show it — so the
    // body says so rather than sending somebody to a page it is missing from.
    const stranded = overdue.filter((d) => !onList.has(`d${d.id}`)).length;
    const waiting = `The oldest has been waiting ${waited}`;
    let body: string;
    if (stranded === 0) {
      body = waiting;
    } else if (stranded < overdue.length) {
      body =
        `${waiting}. ${stranded} of them ${stranded === 1 ? "is" : "are"} past the ` +
        "three-day carry-over and no longer on the to-do list";
    } else if (overdue.length === 1) {
      body = `Waiting ${waited}, and past the three-day carry-over, so it is no longer on the to-do list`;
    } else {
      body = `${waiting}, and all are past the three-day carry-over, so the to-do list no longer shows them`;
    }
    const ids = overdue.map((d) => String(d.id)).sort();
    items.push({
      fleet: "physical",
      id: `todo_overdue:${createHash("sha1").update(ids.join(",")).digest("hex").slice(0, 8)}`,
      // One key per delivery, the same reasoning as the warmup cohort above:
      // a shrinking set stays read, a genuinely new stuck post re-alerts.
      markKeys: overdue.map((d) => `todo_overdue:${d.id}`),
      type: "todo_overdue",
      category: categoryLabel("todo_overdue"),
      severity: "critical",
      title: `${plural(overdue.length, "post")} overdue`,
      body,
      target: null,
      href: "/todo",
      at: oldest.createdAt,
      read: false,
    });
  }

  return items;
}

/** "Profile 34" -> "34". Empty when the target is not a numbered profile. */
function profileNum(target: string | null): string {
  return String(target ?? "").replace(/\D/g, "");
}

async function storedNotifications(
  physical: ReadonlySet<string>,
): Promise<NotificationItem[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const rows = await sbRest<StoredRow[]>(
    `dashboard_notifications?select=id,at,type,severity,title,body,target,read&at=gte.${since}&order=at.desc&limit=50`,
  );
  return rows.map((r) => {
    const base = {
      id: `stored:${r.id}`,
      markKeys: [`stored:${r.id}`],
      type: r.type,
      category: categoryLabel(r.type),
      severity: (r.severity as NotificationItem["severity"]) ?? "info",
      target: r.target,
      at: r.at,
      // A retire or a proxy swap is about one account, and `target` names it,
      // so the row can say which fleet it happened on. A row whose target is
      // not a profile names nothing (PF-20).
      fleet: fleetOfEntity(r.target, physical),
      read: false,
    };

    // Only Post-Ban rows get re-worded. Everything else carries the copy it was
    // written with — running a proxy swap through retireTitle() would announce
    // it as a retirement, which is worse than no notification at all.
    if (r.type !== "retire") {
      return {
        ...base,
        title: r.title,
        body: r.body,
        href: r.type === "proxy_replace" ? "/proxies" : "/accounts",
      };
    }

    // Rows written before 2026-09-07 stored a middot fragment list and a title
    // with an em dash. Re-word those from their parts rather than migrating the
    // table: the copy is presentation, and a rewrite would rewrite history.
    const legacy = r.body ? parseLegacyRetireBody(r.body, r.severity) : null;
    const failedOutright = r.severity === "critical";
    const needsAttention = r.severity === "warning" || failedOutright;
    return {
      ...base,
      title: r.target ? retireTitle(r.target, failedOutright) : r.title,
      body: legacy ? retireBody(legacy) : r.body,
      // A cleanup that needs a human opens the incident feed on its own row.
      // A clean one has no incident row to open — successes are deliberately
      // kept out of the feed — so it goes to the account itself rather than
      // dumping you on the unfiltered list.
      href: needsAttention
        ? `/incidents?focus=cleanup:${r.id}`
        : profileNum(r.target)
          ? `/accounts/${profileNum(r.target)}`
          : "/accounts",
    };
  });
}

const SEV_RANK: Record<NotificationItem["severity"], number> = {
  critical: 0,
  warning: 1,
  success: 2,
  info: 3,
};

/** The keys this person has already dismissed. */
async function readKeys(userEmail: string): Promise<Set<string>> {
  const rows = await sbRest<{ notification_key: string }[]>(
    `notification_reads?select=notification_key&user_email=eq.${encodeURIComponent(userEmail)}`,
  );
  return new Set(rows.map((r) => r.notification_key));
}

/**
 * Combined bell feed: stored retire completions, recomputed warmup failures and
 * the phone farm's day (PF-12), each flagged with whether THIS person has seen
 * it and which fleet it is about.
 *
 * THE BELL DOES NOT FOLLOW THE FLEET SWITCH (Garreth, 2026-09-22, settling
 * PF-20). Every other screen shows one fleet at a time; this one shows both and
 * names which on each row. A ban on a real phone is news to whoever is looking,
 * and hiding it behind a switch is how it goes unseen. So there is no fleet
 * argument here any more — the same person sees the same bell whichever side
 * they are on.
 *
 * The profiles on real phones are read once and handed to every source, so the
 * whole feed agrees on which fleet an account is in even if somebody moves one
 * while this is running.
 *
 * A failed read of the read-state is not a failed feed — the bell still shows
 * the items, just all unread. Louder than the truth beats an empty bell. A
 * failed read of the fleet list is treated the same way: an empty set reads
 * every account as Cloud, which mislabels rather than hides.
 */
export async function getNotifications(userEmail: string): Promise<NotificationItem[]> {
  const physical = new Set(
    await getPhysicalProfiles()
      .then((r) => r.data)
      .catch(() => [] as string[]),
  );
  const [stored, warmup, todo, seen] = await Promise.all([
    storedNotifications(physical).catch(() => [] as NotificationItem[]),
    warmupFailNotifications(physical).catch(() => [] as NotificationItem[]),
    todoNotifications().catch(() => [] as NotificationItem[]),
    readKeys(userEmail).catch(() => new Set<string>()),
  ]);
  return (
    [...stored, ...warmup, ...todo]
      // Read once every key behind it has been seen. For a single-key item that
      // is the old behaviour exactly; for a grouped warmup alert it means a new
      // failing account reopens it and a recovering one does not.
      .map((i) => ({ ...i, read: i.markKeys.every((k) => seen.has(k)) }))
      .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.at.localeCompare(a.at))
  );
}

/** Upper bound on one mark-read call. "Mark all" sends the whole panel, which
 *  the feed itself caps at 50 stored rows plus a handful of warmup groups. */
const MAX_MARK_READ = 200;

/**
 * Record that this person has seen these notifications.
 *
 * Upsert rather than insert: marking an already-read item is a no-op the UI
 * can and does trigger (clicking a read row), and it should not 409.
 */
export async function markNotificationsRead(userEmail: string, keys: string[]): Promise<number> {
  const unique = [...new Set(keys.filter((k) => typeof k === "string" && k.length > 0))].slice(
    0,
    MAX_MARK_READ,
  );
  if (unique.length === 0) return 0;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Supabase service key is not configured");

  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/notification_reads?on_conflict=user_email,notification_key`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(
        unique.map((notification_key) => ({ user_email: userEmail, notification_key })),
      ),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`mark-read failed: ${res.status} ${await res.text()}`);
  return unique.length;
}

/** Insert a stored notification (used by the post-ban after() hook). */
export async function insertNotification(entry: {
  type: string;
  severity: string;
  title: string;
  body?: string;
  target?: string;
  meta?: unknown;
}): Promise<void> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return;
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/dashboard_notifications`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      type: entry.type,
      severity: entry.severity,
      title: entry.title,
      body: entry.body ?? null,
      target: entry.target ?? null,
      meta: entry.meta ?? null,
    }),
    cache: "no-store",
  });
  // Same trap as auditLog(): a 4xx/5xx resolves rather than throwing, so an
  // unwritten notification was silent. It stays non-throwing -- the post-ban
  // after() hook must not fail because the bell entry did -- but it no longer
  // pretends the row landed.
  if (!res.ok) {
    console.error(
      `notification insert rejected (HTTP ${res.status}) for ${entry.type}/${entry.target ?? "-"}:`,
      await res.text().catch(() => "<no body>"),
    );
  }
}
