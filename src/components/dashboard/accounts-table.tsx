"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  ListChecks,
  Loader2,
  SlidersHorizontal,
} from "@/components/ui/icons";
import { Card, DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
import { FilterPills } from "@/components/ui/filter-pills";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { StatusPill } from "@/components/ui/pill";
import { cycleSort, type SortDir } from "@/components/ui/sort-button";
import { FilterChips } from "@/components/ui/filter-chips";
import { SearchInput } from "@/components/ui/search-input";
import { MultiProfileModal } from "@/components/dashboard/multi-profile-modal";
import { RetireModal } from "@/components/dashboard/retire-modal";
import { HealthReviewModal } from "@/components/dashboard/health-review-modal";
import { fleetTone, healthTone, needsAttention } from "@/lib/health";
import type { AccountRow } from "@/lib/data/accounts";
import type { ContentTypeOption } from "@/lib/data/scheduler-overrides";
import { summarizeOverride } from "@/lib/data/scheduler-overrides";
import { PostingSettingsModal } from "@/components/dashboard/posting-settings-modal";
import { cn } from "@/lib/utils";

type HealthFilter = "all" | "healthy" | "attention";
type PlatformFilter = "all" | "tiktok" | "instagram";
type CharFilter = "all" | "Character 2" | "Character 3" | "Character 4";
type SortKey = "views" | "suppressed" | "age" | "warmup" | "lastpost";

const TH = "sticky top-0 z-10 bg-card pb-2 font-medium whitespace-nowrap";

/** The count carries the tone; the pill has no status dot. */
const TONE_TEXT: Record<string, string> = {
  accent: "text-accent",
  warn: "text-warn",
  danger: "text-danger",
};

/**
 * Freshness label for the Warmup and Last post columns.
 *
 * Plain text, the same weight and colour as Character (Garreth 2026-09-07):
 * these are readings, not verdicts. Health already owns the severity colour in
 * this table, and tinting two more columns by their own scale meant three
 * competing colour systems in one row.
 */
function freshnessLabel(d: number | null): string {
  if (d === null) return "never";
  if (d <= 1) return d === 0 ? "today" : "1d";
  return `${d}d`;
}

/** Bare profile number ("Profile 29" → "29") for exact multi-select matching. */
function profileNumber(row: AccountRow): string {
  return row.profile.replace(/\D+/g, "");
}

function profileUrl(row: AccountRow): string | null {
  if (!row.username) return null;
  return row.platform === "instagram"
    ? `https://www.instagram.com/${row.username}/`
    : `https://www.tiktok.com/@${row.username}`;
}

/** Ban signals make the Retire button prominent (plan §4 / handover). */
function hasBanSignals(row: AccountRow): boolean {
  return (
    ["banned", "shadowbanned", "collapsing"].includes(row.healthStatus) ||
    (row.loginVerdict?.toLowerCase().includes("ban") ?? false) ||
    (row.healthStatus !== "tracking broken" && row.med5 === 0)
  );
}

/**
 * Hover text behind a health verdict, written for the person who has to decide.
 *
 * The verdict is a recommendation, not an instruction — someone opens the
 * account and confirms before anything is retired. So this says what the system
 * thinks, the single heaviest reason, and how far to trust it, rather than
 * listing raw metrics. An earlier version led with "best of last 8: 1,326
 * views" beside a `collapsing` pill and read as an argument against itself.
 */
function verdictEvidence(row: AccountRow): string | undefined {
  const r = row.review;
  // Deliberately just the fact and the observation — who reviewed it and when
  // live in the modal, and putting them here made the hover a wall of text.
  if (r && !r.needsRereview) {
    return r.note ? `Manually checked. ${r.note}` : "Manually checked.";
  }

  const parts: string[] = [];
  if (r?.needsRereview) {
    parts.push(
      `Needs another look. A person reviewed this when the system said "${r.verdict}", but it has changed to "${row.systemHealth}" since.`,
    );
  }
  if (row.healthReason) {
    parts.push(`Flagged ${row.systemHealth}: ${row.healthReason}.`);
  } else if (row.healthConfidence) {
    parts.push(`confidence: ${row.healthConfidence}`);
  }
  if (row.healthCaveat) {
    parts.push(`Treat with care: ${row.healthCaveat}.`);
  }
  if (needsAttention(row.healthStatus) && !r) {
    parts.push("Open the account to confirm before retiring.");
  }
  return parts.length ? parts.join(" ") : undefined;
}

export function AccountsTable({
  rows: allRows,
  fetchedAt,
  mode = "page",
  contentTypeOptions = {},
  className,
}: {
  rows: AccountRow[];
  fetchedAt: string;
  /** "page" = full detail table with action buttons; "card" = compact homepage card. */
  mode?: "page" | "card";
  /** Selectable content types per character. Page mode only. */
  contentTypeOptions?: Record<string, ContentTypeOption[]>;
  className?: string;
}) {
  const showActions = mode === "page";
  const fullColumns = mode === "page";
  const router = useRouter();
  const [health, setHealth] = useState<HealthFilter>("all");
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [character, setCharacter] = useState<CharFilter>("all");
  const [showBanned, setShowBanned] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir } | null>(null);
  // Multi-profile selection (modal): applied picks, and the modal's own state.
  const [picked, setPicked] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Posting settings (pause + per-account schedule) live in one modal — the
  // bare Pause button hid the fact that an account could also be throttled.
  const [settingsFor, setSettingsFor] = useState<AccountRow | null>(null);
  const [reviewing, setReviewing] = useState<AccountRow | null>(null);
  const [retiring, setRetiring] = useState<AccountRow | null>(null);
  // Profiles whose Live retire is running in the background → "Retiring…" spinner.
  const [retiringProfiles, setRetiringProfiles] = useState<Map<string, number>>(new Map());

  function handleLiveStarted(profile: string) {
    setRetiringProfiles((prev) => new Map(prev).set(profile, Date.now()));
    setRetiring(null); // close the modal
  }

  // While any retire is in flight, poll for the row to flip to "Retired";
  // drop entries that have run longer than 90s as a safety net.
  useEffect(() => {
    if (retiringProfiles.size === 0) return;
    const t = setInterval(() => {
      router.refresh();
      setRetiringProfiles((prev) => {
        const next = new Map(prev);
        for (const [p, started] of prev) if (Date.now() - started > 90_000) next.delete(p);
        return next.size === prev.size ? prev : next;
      });
    }, 3000);
    return () => clearInterval(t);
  }, [retiringProfiles.size, router]);

  // Clear the spinner once the account data shows the cleanup landed.
  useEffect(() => {
    setRetiringProfiles((prev) => {
      if (prev.size === 0) return prev;
      const next = new Map(prev);
      for (const p of prev.keys()) {
        const row = allRows.find((r) => r.profile === p);
        if (!row || row.cleanedUp) next.delete(p);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [allRows]);

  const activeCount = allRows.filter((r) => r.isActive).length;

  const activePill = (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card-raised px-[13px] py-[7px] text-xs whitespace-nowrap">
      <span className={cn("font-semibold tnum", TONE_TEXT[fleetTone(activeCount)])}>{activeCount}</span>
      <span className="text-text-muted">Active Accounts</span>
    </span>
  );

  const q = query.trim().toLowerCase();
  const base = allRows.filter((r) => (showBanned ? true : r.isActive));
  const rows = base.filter(
    (r) =>
      (health === "all" ||
        (health === "attention" ? needsAttention(r.healthStatus) : !needsAttention(r.healthStatus))) &&
      (platform === "all" || r.platform === platform) &&
      (character === "all" || r.character === character) &&
      // Multi-profile picks (from the modal) match the profile number EXACTLY,
      // so "1" never pulls in Profile 18/21. They override the text search.
      (picked.length === 0 || picked.includes(profileNumber(r))) &&
      (picked.length > 0 ||
        q === "" ||
        r.profile.toLowerCase().includes(q) ||
        (r.username?.toLowerCase().includes(q) ?? false) ||
        r.character.toLowerCase().includes(q) ||
        r.healthStatus.toLowerCase().includes(q)),
  );

  if (sort) {
    const freshnessKey = sort.key === "warmup" || sort.key === "lastpost";
    rows.sort((a, b) => {
      const val = (r: AccountRow) =>
        sort.key === "views"
          ? r.med7d
          : sort.key === "suppressed"
            ? r.suppressedPct
            : sort.key === "age"
            ? r.ageDays
            : sort.key === "warmup"
              ? r.daysSinceWarmup
              : r.daysSincePost;
      const av = val(a);
      const bv = val(b);
      // Freshness columns: null = "never" = most stale, so it sorts as largest.
      if (av === null && bv === null) return 0;
      if (av === null) return freshnessKey ? (sort.dir === "desc" ? -1 : 1) : 1;
      if (bv === null) return freshnessKey ? (sort.dir === "desc" ? 1 : -1) : -1;
      return sort.dir === "desc" ? bv - av : av - bv;
    });
  }

  const extraFilters = (platform !== "all" ? 1 : 0) + (character !== "all" ? 1 : 0);

  // The dropdown's current state, named beside it. Health has its own pill row
  // above and is already visible, so it is not repeated here.
  const filterChips = (
    <FilterChips
      chips={[
        ...(platform !== "all"
          ? [
              {
                key: "platform",
                label: platform === "tiktok" ? "TikTok" : "Instagram",
                onClear: () => setPlatform("all"),
              },
            ]
          : []),
        ...(character !== "all"
          ? [
              {
                key: "character",
                label: character.replace("Character ", "Char "),
                onClear: () => setCharacter("all"),
              },
            ]
          : []),
      ]}
      onClearAll={() => {
        setPlatform("all");
        setCharacter("all");
      }}
    />
  );

  const sortHeader = (label: string, key: SortKey, align?: "right", hint?: string) => {
    const active = sort?.key === key;
    const Icon = active ? (sort!.dir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
    return (
      <th className={cn(TH, align === "right" && "text-right")}>
        <button
          type="button"
          title={hint}
          onClick={() => setSort((s) => cycleSort(s, key))}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap transition-colors hover:text-text-primary",
            active && "text-accent",
            hint && "cursor-help decoration-dotted underline-offset-4 hover:underline",
          )}
        >
          {label}
          <Icon className={cn("size-3", !active && "opacity-50")} />
        </button>
      </th>
    );
  };

  // Split out so the pills can sit beside the section title while the
  // Filters dropdown and Show-retired toggle stay pinned right.
  const healthPills = (
    <FilterPills
      value={health}
      onChange={setHealth}
      options={[
        { value: "all", label: "All" },
        { value: "healthy", label: "Healthy" },
        { value: "attention", label: "Needs attention" },
      ]}
    />
  );

  const filtersDropdown = (
    <Dropdown
      label="Filters"
      icon={<SlidersHorizontal className="size-3.5" />}
      badge={extraFilters}
    >
      {() => (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Platform
            </span>
            <FilterPills
              value={platform}
              onChange={setPlatform}
              options={[
                { value: "all", label: "All" },
                { value: "tiktok", label: "TT" },
                { value: "instagram", label: "IG" },
              ]}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
              Character
            </span>
            <FilterPills
              value={character}
              onChange={setCharacter}
              options={[
                { value: "all", label: "All" },
                { value: "Character 2", label: "Char 2" },
                { value: "Character 3", label: "Char 3" },
                { value: "Character 4", label: "Char 4" },
              ]}
            />
          </div>
        </div>
      )}
    </Dropdown>
  );

  const showRetired = showActions && (
    <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text-muted">
      <input
        type="checkbox"
        checked={showBanned}
        onChange={(e) => setShowBanned(e.target.checked)}
        className="size-4 accent-accent"
      />
      Show retired
    </label>
  );

  const table = (
    <table className="w-full text-sm [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0 [&_td:nth-last-child(2)]:pr-1 [&_th:nth-last-child(2)]:pr-1 [&_td:last-child]:pl-1 [&_th:last-child]:pl-1">
      <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className={TH}>Profile</th>
                  <th className={TH}>Username</th>
                  <th className={TH}>Character</th>
                  {fullColumns && sortHeader("Age", "age")}
                  <th className={TH}>Health</th>
                  {fullColumns && sortHeader("Avg Views (7d)", "views")}
                  {fullColumns &&
                    sortHeader(
                      "Suppressed",
                    "suppressed",
                    undefined,
                      "Posts that almost nobody saw (10 views or fewer) in the last 7 days. A high % means the platform is barely showing this account.",
                    )}
                  {sortHeader("Warmup", "warmup")}
                  {sortHeader("Last Post", "lastpost")}
                  {showActions && <th className={TH}>Posting</th>}
                  {showActions && <th className={TH}>Retire</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const url = profileUrl(row);
                  const busy = settingsFor?.profile === row.profile;
                  const banSignals = hasBanSignals(row);
                  return (
                    <tr
                      key={row.profile}
                      onClick={(e) => {
                        // Row opens the account, but only when the click wasn't
                        // meant for something inside it — the username link, the
                        // Pause/Retire buttons, or a text selection.
                        if ((e.target as HTMLElement).closest("a,button,input,label")) return;
                        if (window.getSelection()?.toString()) return;
                        router.push(`/accounts/${profileNumber(row)}` as never);
                      }}
                      className="cursor-pointer border-t border-border hover:bg-card-raised/50"
                    >
                      <td className="py-2.5 font-medium whitespace-nowrap">
                        <Link
                          href={`/accounts/${profileNumber(row)}` as never}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-accent"
                        >
                          {row.profile}
                        </Link>
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:opacity-80"
                          >
                            {row.username} <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                        {/* Platform reads as a mark on the handle now that the
                            column it had is carrying suppression. */}
                        {row.platform === "instagram" ? (
                          <InstagramIcon className="size-3 shrink-0 text-text-muted" />
                        ) : (
                          <TikTokIcon className="size-3 shrink-0 text-text-muted" />
                        )}
                      </span>
                      </td>
                      <td className="py-2.5 text-text-muted whitespace-nowrap">
                        {row.character ? row.character.replace("Character ", "Char ") : "—"}
                      </td>
                      {fullColumns && (
                      <td className="py-2.5 whitespace-nowrap tnum">
                          {row.ageDays !== null ? (
                            <span className="inline-flex items-center gap-1.5">
                              {row.ageDays}d
                              <span className="rounded-full bg-card-raised px-1.5 py-0.5 text-[10px] text-text-muted">
                                {row.tier}
                              </span>
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                      )}
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          {/* The pill is the way into the review, so it has to
                              look pressable: it lifts, brightens and shows a
                              ring on hover. Without that nobody finds it. */}
                          <button
                            type="button"
                            onClick={() => setReviewing(row)}
                            title={verdictEvidence(row)}
                            aria-label={`Review health verdict for ${row.profile}`}
                            className="group cursor-pointer rounded-full outline-none transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-accent/70"
                          >
                            <StatusPill
                              tone={healthTone(row.healthStatus)}
                              className="ring-1 ring-transparent transition-all duration-150 group-hover:brightness-125 group-hover:ring-current/40"
                            >
                              {row.healthStatus}
                            </StatusPill>
                          </button>
                          {row.review?.needsRereview && (
                            <span
                              title={verdictEvidence(row)}
                              className="text-xs font-semibold text-warn"
                            >
                              re-check
                            </span>
                          )}
                        </span>
                      </td>
                      {fullColumns && (
                        <td className="py-2.5 tnum">
                          {row.med7d === null ? (
                            <span className="text-text-muted">-</span>
                          ) : (
                            Math.round(row.med7d).toLocaleString("en-US")
                          )}
                        </td>
                      )}
                      {/* >=40% of matured posts under 10 views is the exact line
                          that makes the health chain say `collapsing`. */}
                      {fullColumns && (
                        <td className="py-2.5 tnum">
                          {row.suppressedPct === null ? (
                            /* Blank rather than a number the sample cannot
                               support — a share over <4 posts prints 0% or 100%
                               by construction. The tooltip says why. */
                            /* Block + negative margin so the hover target is the
                               whole cell, not the ~6px dash. A bare "-" is
                               effectively unhoverable. */
                            <span
                              className="-my-2.5 inline-block w-full cursor-help py-2.5 text-text-muted underline decoration-dotted decoration-text-muted/40 underline-offset-4"
                              title={
                                row.sampleN !== null && row.sampleN < 4
                                  ? `${row.sampleN} post${row.sampleN === 1 ? "" : "s"} sampled, not enough to judge suppression`
                                  : "no suppression data"
                              }
                            >
                              -
                            </span>
                          ) : (
                            <span
                              className={cn(
                                row.suppressedPct >= 40
                                  ? "text-danger"
                                  : row.suppressedPct >= 25
                                    ? "text-orange"
                                    : "text-text-muted",
                              )}
                            >
                              {row.suppressedPct}%
                            </span>
                          )}
                        </td>
                      )}
                      <td className="py-2.5 whitespace-nowrap">
                        {(() => {
                          return (
                            <span
                              className="tnum"
                              title={row.lastWarmupAt ? `last warmup ${new Date(row.lastWarmupAt).toLocaleDateString("en-US")}` : "never warmed"}
                            >
                              {freshnessLabel(row.daysSinceWarmup)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        {(() => {
                          // An account still warming that has never posted hasn't
                          // missed anything — a red "never" reads as a fault and
                          // pulls the eye for no reason. Show "-" (not yet due).
                          // A paused account that HAS posted still shows its real
                          // recency, because that number is genuinely meaningful.
                          if (row.healthStatus === "warming" && row.daysSincePost === null) {
                            return (
                              <span className="text-text-muted" title="hasn't started posting yet">
                                -
                              </span>
                            );
                          }
                          return (
                            <span
                              className="tnum"
                              title={row.lastPostAt ? `last post ${new Date(row.lastPostAt).toLocaleDateString("en-US")}` : "never posted"}
                            >
                              {freshnessLabel(row.daysSincePost)}
                            </span>
                          );
                        })()}
                      </td>
                      {showActions && (
                        <>
                          {/* Posting column: one pill showing the EFFECTIVE state
                              (paused / hand-set / default). Opens the settings
                              modal, which is now the only place posting is
                              paused, throttled or restricted. */}
                          <td className="py-2.5">
                            {row.isActive && !retiringProfiles.has(row.profile) ? (
                              (() => {
                                const s = summarizeOverride(row.override, row.paused, row.effective);
                                return (
                                  <button
                                    onClick={() => setSettingsFor(row)}
                                    disabled={busy}
                                    title={
                                      s.tone === "paused"
                                        ? "Paused. The scheduler skips this account"
                                        : s.clamped
                                          ? `Set to ${row.override?.maxPostsPerDay}/day, but throttled to ${row.effective?.maxPostsPerDay}/day. ${row.effective?.throttleReason ?? "guard active"}`
                                          : s.tone === "custom"
                                            ? "Hand-set schedule. Click to change"
                                            : row.effective?.throttleReason
                                              ? `Scheduler defaults (${row.effective.throttleReason})`
                                              : "Scheduler defaults. Click to set a custom schedule"
                                    }
                                    className={cn(
                                      "inline-flex max-w-[11rem] items-center gap-1 truncate rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                                      s.tone === "paused" &&
                                        "bg-warn/15 text-warn hover:bg-warn/25",
                                      s.tone === "custom" &&
                                        "bg-accent-soft text-accent hover:opacity-80",
                                      s.tone === "default" &&
                                        "border border-border bg-card-raised text-text-muted hover:text-text-primary",
                                    )}
                                  >
                                    {busy && <Loader2 className="size-3 animate-spin" />}
                                    <span className="truncate">{s.label}</span>
                                    {s.clamped && <span title="throttled below the set value">*</span>}
                                  </button>
                                );
                              })()
                            ) : (
                              <span className="text-xs text-text-muted">—</span>
                            )}
                          </td>
                          {/* Retire column: retire button / progress / retired label */}
                          <td className="py-2.5">
                            {retiringProfiles.has(row.profile) ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-danger">
                                <Loader2 className="size-3.5 animate-spin" />
                                Retiring…
                              </span>
                            ) : row.isActive ? (
                              <button
                                onClick={() => setRetiring(row)}
                                title="Retire (Post-Ban cleanup)"
                                className={cn(
                                  "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                                  banSignals
                                    ? "bg-danger text-white hover:opacity-90"
                                    : "border border-border bg-card-raised text-text-muted hover:text-danger",
                                )}
                              >
                                Retire
                              </button>
                            ) : row.cleanedUp ? (
                              <span className="text-xs text-text-muted">Retired</span>
                            ) : (
                              <button
                                onClick={() => setRetiring(row)}
                                title="Retire (Post-Ban cleanup)"
                                className="rounded-full bg-danger px-2.5 py-1 text-xs font-medium text-white transition-colors hover:opacity-90"
                              >
                                Retire
                              </button>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
  );

  // Compact homepage card: no page header, no action columns, scrollable body.
  if (mode === "card") {
    return (
      <DashCard
        title="Accounts"
        toolbar={healthPills}
        actions={
          <>
            {activePill}
            {filtersDropdown}
          </>
        }
        viewAllHref="/accounts"
        className={className}
      >
        {/* The h-full/min-h-0 flex column is what gives the scroll area a bounded
            height — without it the inner flex-1 is inert and the full table
            renders, spilling out of the card. */}
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-auto pr-1 max-h-[560px] xl:max-h-none">
            {table}
          </div>
        </div>
      </DashCard>
    );
  }

  // Full detail page: header + search + action columns + retire modal.
  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex min-w-0 flex-wrap items-center gap-4">
            <h1 className="text-xl font-semibold">Accounts</h1>
            {healthPills}
            {filtersDropdown}
            {filterChips}
            {showRetired}
          </div>
          <div className="flex max-w-xl flex-1 items-center justify-end gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search profile, username, character…"
              className="w-full max-w-sm"
            />
            <button
              onClick={() => setPickerOpen(true)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
                picked.length > 0
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-card-raised text-text-muted hover:text-text-primary",
              )}
            >
              <ListChecks className="size-3.5" />
              {picked.length > 0 ? `${picked.length} profiles selected` : "Select multiple profiles"}
            </button>
          </div>
        </div>

        <Card className="flex flex-col gap-6">
          <div className="overflow-x-auto">{table}</div>
        </Card>
      </div>

      {pickerOpen && (
        <MultiProfileModal
          initial={picked}
          known={allRows.map(profileNumber)}
          onApply={setPicked}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {reviewing && (

        <HealthReviewModal account={reviewing} onClose={() => setReviewing(null)} />

      )}

      {retiring && (
        <RetireModal
          account={retiring}
          onClose={() => setRetiring(null)}
          onLiveStarted={handleLiveStarted}
        />
      )}

      {settingsFor && (
        <PostingSettingsModal
          account={settingsFor}
          override={settingsFor.override}
          effective={settingsFor.effective}
          options={contentTypeOptions[settingsFor.character] ?? []}
          onClose={() => setSettingsFor(null)}
          onSaved={() => {
            setSettingsFor(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
