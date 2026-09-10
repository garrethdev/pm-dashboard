import { createHash } from "node:crypto";
import { sbRest } from "@/lib/data/supabase";
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
  type: "retire" | "warmup_fail";
  severity: "critical" | "warning" | "success" | "info";
  /** Which part of the system it came from, e.g. "Post-Ban". Shown as a pill. */
  category: string;
  title: string;
  body: string | null;
  target: string | null;
  href?: string;
  at: string;
  /** Whether THIS viewer has seen it. Per person, not fleet-wide. */
  read: boolean;
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
 * failed, and no recent success. Grouped by fail_code so a fleet-wide cause is
 * obvious (e.g. a cluster of 29997 = empty wallet). Stateless recompute.
 */
async function warmupFailNotifications(): Promise<NotificationItem[]> {
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

  // Group by fail_code.
  const byCode = new Map<string, WarmupFailRow[]>();
  for (const r of failing) {
    const code = r.last_resolved_fail_code ?? "unknown";
    (byCode.get(code) ?? byCode.set(code, []).get(code)!).push(r);
  }

  const items: NotificationItem[] = [];
  for (const [code, group] of byCode) {
    const reason = FAIL_REASON[code] ?? group[0]?.last_resolved_fail_desc ?? "warmup failing";
    const profiles = group.map((g) => g.geelark_profile.replace("Profile ", "P")).sort();
    const fleetWide = group.length >= 3;
    items.push({
      // The cohort is part of the identity, not just the payload. These alerts
      // are recomputed rather than stored, so a bare `warmup_fail:29997` would
      // stay read forever once dismissed — including when a different set of
      // accounts starts failing for the same reason. That was survivable while
      // read state was per-browser and easily lost; now that it is durable, a
      // changed cohort has to read as a new alert.
      id: `warmup_fail:${code}:${createHash("sha1").update(profiles.join(",")).digest("hex").slice(0, 8)}`,
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

/** "Profile 34" -> "34". Empty when the target is not a numbered profile. */
function profileNum(target: string | null): string {
  return String(target ?? "").replace(/\D/g, "");
}

async function storedNotifications(): Promise<NotificationItem[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const rows = await sbRest<StoredRow[]>(
    `dashboard_notifications?select=id,at,type,severity,title,body,target,read&at=gte.${since}&order=at.desc&limit=50`,
  );
  return rows.map((r) => {
    // Rows written before 2026-09-07 stored a middot fragment list and a title
    // with an em dash. Re-word those from their parts rather than migrating the
    // table: the copy is presentation, and a rewrite would rewrite history.
    const legacy = r.body ? parseLegacyRetireBody(r.body, r.severity) : null;
    const failedOutright = r.severity === "critical";
    const needsAttention = r.severity === "warning" || failedOutright;
    return {
      id: `stored:${r.id}`,
      type: "retire" as const,
      category: categoryLabel(r.type),
      severity: (r.severity as NotificationItem["severity"]) ?? "info",
      title: r.target ? retireTitle(r.target, failedOutright) : r.title,
      body: legacy ? retireBody(legacy) : r.body,
      target: r.target,
      // A cleanup that needs a human opens the incident feed on its own row.
      // A clean one has no incident row to open — successes are deliberately
      // kept out of the feed — so it goes to the account itself rather than
      // dumping you on the unfiltered list.
      href: needsAttention
        ? `/incidents?focus=cleanup:${r.id}`
        : profileNum(r.target)
          ? `/accounts/${profileNum(r.target)}`
          : "/accounts",
      at: r.at,
      read: false,
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
 * Combined bell feed: stored retire completions + recomputed warmup failures,
 * each flagged with whether THIS person has seen it.
 *
 * A failed read of the read-state is not a failed feed — the bell still shows
 * the items, just all unread. Louder than the truth beats an empty bell.
 */
export async function getNotifications(userEmail: string): Promise<NotificationItem[]> {
  const [stored, warmup, seen] = await Promise.all([
    storedNotifications().catch(() => [] as NotificationItem[]),
    warmupFailNotifications().catch(() => [] as NotificationItem[]),
    readKeys(userEmail).catch(() => new Set<string>()),
  ]);
  return [...stored, ...warmup]
    .map((i) => ({ ...i, read: seen.has(i.id) }))
    .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.at.localeCompare(a.at));
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
