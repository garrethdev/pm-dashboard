import { sbRest } from "@/lib/data/supabase";

/** A single bell item. Retire completions are stored; warmup fails are recomputed. */
export interface NotificationItem {
  id: string;
  type: "retire" | "warmup_fail";
  severity: "critical" | "warning" | "success" | "info";
  title: string;
  body: string | null;
  target: string | null;
  href?: string;
  at: string;
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
      id: `warmup_fail:${code}`,
      type: "warmup_fail",
      severity: fleetWide ? "critical" : "warning",
      title: `${group.length} account${group.length === 1 ? "" : "s"} warming up failing — ${reason}`,
      body:
        (fleetWide ? `Likely a shared cause (${code}). ` : "") +
        `Affected: ${profiles.slice(0, 10).join(", ")}${profiles.length > 10 ? "…" : ""}`,
      target: code,
      href: "/accounts",
      at: new Date().toISOString(),
    });
  }
  return items;
}

async function storedNotifications(): Promise<NotificationItem[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const rows = await sbRest<StoredRow[]>(
    `dashboard_notifications?select=id,at,type,severity,title,body,target,read&at=gte.${since}&order=at.desc&limit=50`,
  );
  return rows.map((r) => ({
    id: `stored:${r.id}`,
    type: "retire" as const,
    severity: (r.severity as NotificationItem["severity"]) ?? "info",
    title: r.title,
    body: r.body,
    target: r.target,
    href: "/accounts",
    at: r.at,
  }));
}

const SEV_RANK: Record<NotificationItem["severity"], number> = {
  critical: 0,
  warning: 1,
  success: 2,
  info: 3,
};

/** Combined bell feed: stored retire completions + recomputed warmup failures. */
export async function getNotifications(): Promise<NotificationItem[]> {
  const [stored, warmup] = await Promise.all([
    storedNotifications().catch(() => [] as NotificationItem[]),
    warmupFailNotifications().catch(() => [] as NotificationItem[]),
  ]);
  return [...stored, ...warmup].sort(
    (a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || b.at.localeCompare(a.at),
  );
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
  await fetch(`${process.env.SUPABASE_URL}/rest/v1/dashboard_notifications`, {
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
}
