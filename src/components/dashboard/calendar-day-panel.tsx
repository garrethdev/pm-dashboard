"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2, X } from "@/components/ui/icons";
import type { CalendarDayAccount, CalendarDayDetail, CalendarPost } from "@/lib/data/calendar";
import { PlatformIcon } from "@/components/ui/platform-icon";
import { isPlatform } from "@/lib/platform";
import { StatusPill, type PillTone } from "@/components/ui/pill";
import { StaleNotice } from "@/components/ui/stale-notice";
import { healthTone } from "@/lib/health";
import { cn } from "@/lib/utils";

/**
 * One day of the Content Calendar, expanded.
 *
 * Reads through /api/calendar?day= rather than a navigation so the month grid
 * behind it keeps its state — the panel is a lens on the cell, not a new page.
 * Works the same for a past day as a future one: the rows are whatever the
 * scheduler laid down, and history is never rewritten.
 */

/**
 * The status a person should read, which is not always the one in the column.
 *
 * posting_status says what the poster INTENDED; geelark_tasks says what
 * happened. Those disagree routinely — on 2026-09-05, 14 rows had failed while
 * ten of them still read "Posted" and four read "Hold", because the 14:00 ET
 * reconcile runs hours before the posting window closes. Geelark wins here.
 *
 * "Scheduled" is the resting state: the scheduler assigned the content and
 * nothing has been attempted yet.
 */
function resolveStatus(p: CalendarPost): {
  label: string;
  tone: PillTone;
  title?: string;
} {
  if (p.delivery === "failed") {
    return {
      label: "Failed",
      tone: "danger",
      title: "Geelark could not post this. Click for the error",
    };
  }
  if (p.delivery === "posted") return { label: "Posted", tone: "ok" };
  if (p.status === "Hold") return { label: "Hold", tone: "warn" };
  if (p.delivery === "pending") {
    return { label: "Posting", tone: "info", title: "Geelark has the task but has not finished it" };
  }
  if (p.status === "Ready") return { label: "Scheduled", tone: "accent" };
  // Marked posted, but no Geelark task exists to confirm it. Said plainly
  // rather than shown in green.
  if (p.status === "Posted") {
    return { label: "Posted", tone: "neutral", title: "No Geelark task found, unverified" };
  }
  return { label: p.status, tone: "gray" };
}

/** posting_time is stored as both "21:38:00" and "2:30 PM"; the RPC already
 *  normalised it to minutes, so format from that and keep one shape. */
function clock(post: CalendarPost) {
  if (post.minuteOfDay === null) return post.time ?? "—";
  const h24 = Math.floor(post.minuteOfDay / 60) % 24;
  const m = post.minuteOfDay % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h24 < 12 ? "AM" : "PM"}`;
}

function longDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function shortType(t: string) {
  return t.replace(/_/g, " ");
}

export function CalendarDayPanel({
  date,
  today,
  onClose,
  onStep,
}: {
  date: string;
  today: string;
  onClose: () => void;
  /** Move a day without closing — the panel is how you scan a week. */
  onStep: (delta: number) => void;
}) {
  // State carries the date it describes so "still loading the day you just
  // stepped to" is derived, not a second flag set synchronously in the effect.
  const [state, setState] = useState<{
    date: string;
    detail: CalendarDayDetail | null;
    error: string | null;
    /** Set when the day came from the last-known-good copy, not from Supabase. */
    staleAt: string | null;
  }>({ date, detail: null, error: null, staleAt: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/calendar?day=${date}`);
        const body = (await res.json()) as {
          data?: CalendarDayDetail;
          fetchedAt?: string;
          stale?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !body.data) throw new Error(body.error ?? "Could not load that day");
        setState({
          date,
          detail: body.data,
          error: null,
          staleAt: body.stale && body.fetchedAt ? body.fetchedAt : null,
        });
      } catch (err) {
        if (cancelled) return;
        setState({
          date,
          detail: null,
          error: err instanceof Error ? err.message : "Could not load that day",
          staleAt: null,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [date]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onStep(-1);
      if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  const fresh = state.date === date ? state : null;
  const detail = fresh?.detail ?? null;
  const error = fresh?.error ?? null;
  const staleAt = fresh?.staleAt ?? null;
  const loading = !detail && !error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={`Posts for ${longDate(date)}`}
        className="my-auto w-full max-w-3xl rounded-card border border-border glass-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-semibold">{longDate(date)}</h2>
              {date === today && <StatusPill tone="accent">Today</StatusPill>}
              {loading && <Loader2 className="size-3.5 animate-spin text-text-muted" />}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => onStep(-1)}
              aria-label="Previous day"
              className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-card-raised hover:text-text-primary"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() => onStep(1)}
              aria-label="Next day"
              className="rounded-full p-1.5 text-text-muted transition-colors hover:bg-card-raised hover:text-text-primary"
            >
              <ChevronRight className="size-4" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-1 text-text-muted hover:text-text-primary"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error && (
            <p className="rounded-nested bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}

          {staleAt && <StaleNotice fetchedAt={staleAt} />}

          {loading && !error && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-nested bg-bg/60" />
              ))}
            </div>
          )}

          {detail && (
            <div className="flex flex-col gap-5">
              {detail.shortfalls.length > 0 && <ShortfallTable rows={detail.shortfalls} />}

              {detail.accounts.length === 0 ? (
                <p className="text-sm text-text-muted">
                  No posts this day.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {detail.accounts.map((a) => (
                    <AccountRow key={a.profile} account={a} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Slots the scheduler wanted but could not fill.
 *
 * The reason column is the scheduler's own text, which packs several outcomes
 * into one string ("pool empty", "substituted with filler", "soft day-rule
 * broken..."). A substitution is the one a person acts on differently — content
 * still went out, just not the lane that was due — so it is split into its own
 * column instead of being buried in prose.
 */
function ShortfallTable({
  rows,
}: {
  rows: { character: string; contentType: string; slotsMissed: number; reason: string }[];
}) {
  const parsed = rows
    .map((r) => {
      // One row can carry several substitutions — the scheduler appends each
      // distinct one — so collect them all rather than showing only the first.
      const subs = [...r.reason.matchAll(/substituted with ([a-z0-9_]+)/gi)].map((m) => m[1]!);
      const why = r.reason
        .split(";")
        .map((x) => x.trim())
        .filter((x) => x && !/^substituted with /i.test(x))
        .join(", ");
      return { ...r, subs, why };
    })
    .sort(
      (a, b) =>
        a.character.localeCompare(b.character) ||
        b.slotsMissed - a.slotsMissed ||
        a.contentType.localeCompare(b.contentType),
    );

  const total = parsed.reduce((n, r) => n + r.slotsMissed, 0);

  return (
    <div className="rounded-nested border border-warn/30 bg-warn/5 p-3">
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <StatusPill tone="warn">
          {total} slot{total === 1 ? "" : "s"} unfilled
        </StatusPill>
        <span className="text-xs text-text-muted">the scheduler wanted these and came up short</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-text-muted">
              <th className="pb-1.5 pr-3 font-medium">Character</th>
              <th className="pb-1.5 pr-3 font-medium">Content type</th>
              <th className="pb-1.5 pr-3 text-right font-medium">Missed</th>
              <th className="pb-1.5 font-medium">What happened</th>
            </tr>
          </thead>
          <tbody>
            {parsed.map((r, i) => (
              <tr key={`${r.character}-${r.contentType}-${i}`} className="border-t border-warn/20">
                <td className="py-1.5 pr-3 whitespace-nowrap">
                  {r.character.replace("Character ", "Char ")}
                </td>
                <td className="py-1.5 pr-3 font-medium whitespace-nowrap">
                  {shortType(r.contentType)}
                </td>
                <td className="py-1.5 pr-3 text-right font-semibold tnum">{r.slotsMissed}</td>
                <td className="py-1.5">
                  {r.subs.length > 0 ? (
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="text-text-muted">posted instead:</span>
                      {r.subs.map((sub) => (
                        <span
                          key={sub}
                          className="rounded-full border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent"
                        >
                          {shortType(sub)}
                        </span>
                      ))}
                      {r.why && <span className="text-text-muted">{r.why}</span>}
                    </span>
                  ) : (
                    <span className="text-text-muted">{r.why || "—"}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AccountRow({ account }: { account: CalendarDayAccount }) {
  return (
    <div
      className={cn(
        "rounded-nested border border-border/70 bg-bg/60 p-3",
        account.live === 0 && "opacity-70",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-medium">{account.profile}</span>
        <PlatformGlyph platform={account.platform} />
        {account.username && (
          <span className="truncate text-xs text-text-muted">@{account.username}</span>
        )}
        <span className="text-xs text-text-muted">{account.character}</span>
        {account.health && (
          <StatusPill tone={healthTone(account.health)} className="ml-1">
            {account.health}
          </StatusPill>
        )}
        {account.paused && <StatusPill tone="gray">paused</StatusPill>}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {account.posts.map((p, i) => (
          <PostRow key={`${p.contentId ?? "row"}-${i}`} post={p} />
        ))}
      </div>
    </div>
  );
}

function PostRow({ post: p }: { post: CalendarPost }) {
  const [showError, setShowError] = useState(false);
  const { label, tone, title } = resolveStatus(p);
  // Only a failure has anything behind the pill, so only a failure is a button.
  const hasError = p.delivery === "failed" && (p.failDesc !== null || p.failCode !== null);

  return (
    <div className={cn("text-xs", p.delivery === "failed" ? "" : !p.live && "opacity-55")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="w-[4.75rem] shrink-0 text-text-muted tnum">{clock(p)}</span>
        <span className={cn("font-medium", !p.registryLane && "text-warn")}>
          {shortType(p.contentType)}
        </span>
        {!p.registryLane && (
          <span
            className="text-warn"
            title="Not an active registry lane"
          >
            off-registry
          </span>
        )}
        {hasError ? (
          <button
            type="button"
            onClick={() => setShowError((v) => !v)}
            title={title}
            aria-expanded={showError}
            className="ml-auto rounded-full transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-danger focus-visible:outline-none"
          >
            {/* Two children, so this one keeps a gap the dot-less default drops. */}
            <StatusPill tone={tone} className="gap-1.5">
              {label}
              <ChevronDown
                className={cn("size-3 transition-transform", showError && "rotate-180")}
              />
            </StatusPill>
          </button>
        ) : (
          <StatusPill tone={tone} className="ml-auto" {...(title ? { title } : {})}>
            {label}
          </StatusPill>
        )}
      </div>

      {showError && (
        <div className="mt-1 ml-[4.75rem] rounded-nested border border-danger/30 bg-danger/5 px-2.5 py-1.5">
          <p className="text-danger">{p.failDesc ?? "Geelark reported a failure with no message."}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {p.failCode && <>Geelark code {p.failCode}. </>}
            posting_status says &ldquo;{p.status}&rdquo;
            {p.status === "Posted" && ". The 14:00 ET reconcile has not corrected it yet"}
          </p>
        </div>
      )}
    </div>
  );
}

/** Platform as a glyph. The word "tiktok" beside a profile is a label nobody
 *  reads twice; the mark is recognised without being read at all. */
function PlatformGlyph({ platform }: { platform: string }) {
  // An unrecognised value shows no mark here rather than guessing TikTok.
  return isPlatform(platform) ? <PlatformIcon platform={platform} /> : null;
}
