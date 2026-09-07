"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, Bell, CheckCircle2, RotateCw } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

const SECTION_NAMES: Record<string, string> = {
  "": "Dashboard",
  accounts: "Accounts",
  inventory: "Inventory",
  "content-calendar": "Content calendar",
  proxies: "Proxies & phones",
  automation: "Automation",
  analytics: "Analytics",
  settings: "Settings",
};

/**
 * Breadcrumb label for a route segment. Unlisted routes fall back to a
 * Title-Cased segment rather than "Dashboard" — /analytics was missing from
 * the map and silently read as "Dashboard" instead of looking wrong.
 */
function sectionName(segment: string): string {
  if (SECTION_NAMES[segment]) return SECTION_NAMES[segment];
  if (!segment) return "Dashboard";
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

interface NotificationItem {
  id: string;
  type: string;
  /** Where it came from, e.g. "Post-Ban". Rendered as the grey pill. */
  category: string;
  severity: "critical" | "warning" | "success" | "info";
  title: string;
  body: string | null;
  target: string | null;
  href?: string;
  at: string;
  read: boolean;
}

/**
 * Time-of-day greetings. Picked from the VIEWER's clock, so this has to run
 * after mount — computing it during SSR would render the server's hour and then
 * mismatch on hydration.
 */
const GREETINGS: { until: number; options: string[] }[] = [
  { until: 5, options: ["Night owl", "Burning the midnight oil", "Still up"] },
  { until: 9, options: ["Rise and shine", "Good morning", "Early start"] },
  { until: 12, options: ["Good morning"] },
  { until: 17, options: ["Good afternoon"] },
  { until: 21, options: ["Good evening"] },
  { until: 24, options: ["Good evening", "Winding down"] },
];

function greetingFor(now: Date): string {
  const hour = now.getHours();
  const band = GREETINGS.find((g) => hour < g.until) ?? GREETINGS[GREETINGS.length - 1];
  // Indexed by date rather than random so it stays put across re-renders but
  // still varies day to day.
  return band.options[now.getDate() % band.options.length];
}

/** "garreth@cryptomiami.net" -> "Garreth". Falls back to no name. */
function firstNameOf(email?: string): string | null {
  const local = (email ?? "").split("@")[0];
  const first = local.split(/[._+-]/)[0];
  if (!first) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/**
 * "14h", "3d", "2w". Runs on the viewer's clock, which is safe here because the
 * panel only ever renders after the feed has been fetched client-side — nothing
 * time-dependent reaches the server HTML.
 */
function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 90) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w`;
  return `${Math.floor(days / 30)}mo`;
}

export function Topbar({ userEmail }: { userEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  // Read state comes from the server, per person. It used to live in
  // localStorage, which is keyed by scheme+host+port — so opening the Network
  // URL `next dev` prints instead of localhost, or a port fallback to 3001, or
  // a second machine, made everything already seen come back unread. Still per
  // person, not fleet-wide: one of us clearing the bell must not clear it for
  // everyone. Held separately from `items` so an optimistic mark survives the
  // next 20s poll landing before the write does.
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [greeting, setGreeting] = useState<string | null>(null);
  const name = firstNameOf(userEmail);

  useEffect(() => {
    // Deliberate post-mount setState: the greeting comes from the VIEWER's
    // clock. Computing it during render would bake the server's hour into the
    // HTML, and React keeps server text through hydration even when the warning
    // is suppressed — so the greeting would be wrong for anyone not in the
    // server's timezone.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(greetingFor(new Date()));
    // Re-check every 10 min so a long-open tab crosses into the next band.
    const t = setInterval(() => setGreeting(greetingFor(new Date())), 600_000);
    return () => clearInterval(t);
  }, []);

  const panelRef = useRef<HTMLDivElement>(null);
  const section = sectionName(pathname.split("/")[1] ?? "");
  const initials = (userEmail ?? "?").slice(0, 2).toUpperCase();

  const markRead = useCallback((ids: string[]) => {
    let fresh: string[] = [];
    setReadIds((prev) => {
      fresh = ids.filter((id) => !prev.has(id));
      if (fresh.length === 0) return prev;
      const next = new Set(prev);
      fresh.forEach((id) => next.add(id));
      return next;
    });
    if (fresh.length === 0) return;
    // Optimistic: the dot clears on click and the write follows. A failed write
    // is not worth an error state — the next load simply shows it unread again,
    // which is the safe direction to be wrong in.
    void fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: fresh }),
      cache: "no-store",
    }).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { items?: NotificationItem[] };
      const next = data.items ?? [];
      setItems(next);
      // Union, not replace: a mark made moments ago may not be in this payload
      // yet, and dropping it would flash the dot back on.
      setReadIds((prev) => {
        const merged = new Set(prev);
        for (const i of next) if (i.read) merged.add(i.id);
        return merged.size === prev.size ? prev : merged;
      });
    } catch {
      /* ignore transient errors */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  /**
   * router.refresh() re-renders but still reads the same unstable_cache entry,
   * so on its own the button did nothing for up to 60s. Expire the tags first,
   * then re-render and re-pull the client-polled panels.
   */
  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetch("/api/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname }),
        cache: "no-store",
      });
    } catch {
      /* fall through — a plain re-render is still better than nothing */
    }
    router.refresh();
    await load();
    setRefreshing(false);
  }, [refreshing, pathname, router, load]);

  useEffect(() => {
    if (!open) return;
    load();
    const close = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open, load]);

  const unread = items.filter((i) => !readIds.has(i.id));
  const hasAlerts = unread.some((i) => i.severity === "critical" || i.severity === "warning");

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-bg/90 px-6 py-3 backdrop-blur">
      <div className="flex min-w-0 shrink items-baseline gap-1.5 text-sm">
        <span className="text-text-muted">Peptide Miracles</span>
        <span className="text-text-muted">/</span>
        <span className="font-medium">{section}</span>
      </div>

      <div className="flex flex-1 shrink-0 items-center justify-end gap-3">
        {greeting && (
          <span className="hidden truncate text-sm font-semibold text-text-primary sm:inline">
            {greeting}
            {name ? `, ${name}` : ""}
          </span>
        )}
        <button
          onClick={refresh}
          disabled={refreshing}
          title={refreshing ? "Refreshing…" : "Refresh data"}
          className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-text-muted transition-colors hover:text-text-primary disabled:opacity-60"
        >
          <RotateCw className={cn("size-4", refreshing && "animate-spin")} />
        </button>

        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((o) => !o)}
            title="Notifications"
            className="relative flex size-9 items-center justify-center rounded-full border border-border bg-card text-text-muted transition-colors hover:text-text-primary"
          >
            <Bell className="size-4" />
            {unread.length > 0 && (
              <span
                className={`absolute right-2 top-2 size-2 rounded-full ${hasAlerts ? "bg-danger" : "bg-info"}`}
              />
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full z-30 mt-2 max-h-[70vh] w-96 overflow-y-auto rounded-nested border border-border bg-card p-2 shadow-card">
              <div className="flex items-center justify-between px-3 pb-2 pt-1.5">
                <span className="text-sm font-semibold">Notifications</span>
                {unread.length > 0 ? (
                  <button
                    onClick={() => markRead(items.map((i) => i.id))}
                    className="text-xs font-medium text-accent hover:opacity-80"
                  >
                    Mark all read ({unread.length})
                  </button>
                ) : (
                  <span className="text-xs text-text-muted">All read</span>
                )}
              </div>
              {items.length > 0 ? (
                <div className="flex flex-col divide-y divide-border">
                  {items.map((item) => {
                    const isUnread = !readIds.has(item.id);
                    const inner = (
                      <div className="flex gap-2 py-2.5">
                        {/* Unread marker holds its column either way, so titles
                            stay aligned as items are read. */}
                        <span
                          aria-hidden
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            isUnread ? "bg-accent" : "bg-transparent",
                          )}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-start gap-2">
                            {/* The category pill sits inline so it trails the
                                last word of a title that wraps, rather than
                                holding a column of its own. */}
                            <span
                              className={cn(
                                "min-w-0 flex-1 text-sm",
                                isUnread ? "font-semibold" : "font-normal text-text-muted",
                              )}
                            >
                              {item.title}
                              <span className="ml-2 inline-block rounded-full bg-text-muted/10 px-2 py-0.5 align-[1px] text-[11px] font-medium whitespace-nowrap text-text-muted">
                                {item.category}
                              </span>
                            </span>
                            {item.href && (
                              <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-accent" />
                            )}
                          </div>
                          {item.body && <p className="text-xs text-text-muted">{item.body}</p>}
                          <span className="text-[11px] text-text-muted/70">{timeAgo(item.at)}</span>
                        </div>
                      </div>
                    );
                    return item.href ? (
                      <Link
                        key={item.id}
                        href={item.href as never}
                        onClick={() => {
                          markRead([item.id]);
                          setOpen(false);
                        }}
                        className="rounded-[10px] px-3 transition-colors hover:bg-card-raised"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => markRead([item.id])}
                        className="rounded-[10px] px-3 text-left transition-colors hover:bg-card-raised"
                      >
                        {inner}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-text-muted">
                  <CheckCircle2 className="size-4 text-ok" /> No notifications
                </p>
              )}
            </div>
          )}
        </div>

        <span
          title={userEmail}
          className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent"
        >
          {initials}
        </span>
      </div>
    </header>
  );
}
