"use client";

import { useMemo, useState } from "react";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterPills } from "@/components/ui/filter-pills";
import { ExternalLink, LayoutList } from "@/components/ui/icons";
import { SortButton, cycleSort, type SortDir } from "@/components/ui/sort-button";
import { ACCOUNT_RANGES, type AccountRangeKey } from "@/lib/data/account-analytics";
import type { AccountPostRow } from "@/lib/data/account-posts";
import { formatEtDate } from "@/lib/data/format";
import type { AnalyticsPlatform } from "@/lib/platform";

/**
 * Every post one account has made, with every number we hold for it (the
 * "All posts" tab, Czedrick 2026-10-09). The columns follow what the platform
 * measures; a cell the post has no number for shows a dash, never 0.
 */

interface Column {
  key: string;
  label: string;
  /** The number the column sorts by; null shows a dash. */
  value: (p: AccountPostRow) => number | null;
  format?: (v: number, p: AccountPostRow) => string;
  /** Skip rate: the useful end is the low one, so a fresh sort opens there. */
  first?: SortDir;
  /** Reads as words rather than a count, so the phone list puts the label first. */
  words?: boolean;
}

const nf = (v: number) => v.toLocaleString("en-US");
const col = (key: keyof AccountPostRow & string, label: string, extra: Partial<Column> = {}): Column => ({
  key,
  label,
  value: (p) => {
    const v = p[key];
    return typeof v === "number" ? v : null;
  },
  ...extra,
});

const BASE: Column[] = [col("views", "Views"), col("likes", "Likes"), col("comments", "Comments")];

/** From the newest screen reading (DA-08): TikTok's For You verdict. */
const FOR_YOU: Column = {
  key: "fypRestricted",
  label: "For You",
  value: (p) => (p.fypRestricted === null ? null : p.fypRestricted ? 0 : 1),
  format: (v) => (v ? "Eligible" : "Held back"),
  first: "asc",
  words: true,
};

/**
 * What each platform measures, in the order a person reads a post's story.
 * The API's numbers first, then the screen reading's. Twelve columns is the
 * most that fit at desktop width without sideways scrolling, so the reading's
 * words (where the views came from, the crosspost's Facebook views) go under
 * the caption, as the type goes under the date, and TikTok's total play time
 * is left out (it is views times watch time).
 */
const COLUMNS: Record<AnalyticsPlatform, Column[]> = {
  instagram: [
    ...BASE,
    col("shares", "Shares"),
    col("saves", "Saves"),
    col("reach", "Reach"),
    col("skipRate", "Skip rate", { format: (v) => `${v}%`, first: "asc" }),
    col("avgWatchSec", "Watch", { format: (v) => `${v}s` }),
    col("follows", "Follows"),
    col("profileVisits", "Visits"),
  ],
  tiktok: [
    ...BASE,
    col("shares", "Shares"),
    col("saves", "Saves"),
    col("avgWatchSec", "Watch", { format: (v) => `${v}s` }),
    col("fullPct", "Full", { format: (v) => `${v}%` }),
    col("newFollowers", "Follows"),
    FOR_YOU,
  ],
  // Facebook's reads carry no shares or saves, so those columns would only ever be empty.
  facebook: [...BASE, col("reach", "Reach")],
};

/** The reading's words for the line under the caption; null when the post has none. */
function readingLine(p: AccountPostRow): string | null {
  const parts = [
    p.topSourceName !== null && p.topSourcePct !== null ? `${p.topSourceName} ${p.topSourcePct}%` : null,
    p.fbViews !== null ? `${nf(p.fbViews)} views on Facebook` : null,
  ].filter((x): x is string => x !== null);
  return parts.length ? parts.join(" · ") : null;
}

function typeLabel(platform: AnalyticsPlatform, format: string | null): string {
  if (format === "carousel") return "Carousel";
  if (format === "photo") return platform === "tiktok" ? "Carousel" : "Photo";
  if (format === "video") return platform === "tiktok" ? "Video" : "Reel";
  return "—";
}

export function AccountPostsView({ posts, platform }: { posts: AccountPostRow[]; platform: AnalyticsPlatform }) {
  const [range, setRange] = useState<AccountRangeKey>("all");
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);
  const columns = COLUMNS[platform];
  // Read the clock once, when the list first shows, not on every render.
  const [now] = useState(() => Date.now());

  const rows = useMemo(() => {
    const days = ACCOUNT_RANGES.find((r) => r.key === range)?.days ?? null;
    const since = days === null ? -Infinity : now - days * 86_400_000;
    const inRange = posts.filter((p) => new Date(p.postedAt).getTime() >= since);
    if (!sort) return inRange; // already newest first
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return inRange;
    const sign = sort.dir === "desc" ? -1 : 1;
    // Posts without the number go to the bottom whichever way the column sorts.
    return [...inRange].sort((a, b) => {
      const x = column.value(a);
      const y = column.value(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return sign * (x - y);
    });
  }, [posts, range, sort, now, columns]);

  const shown = (p: AccountPostRow, c: Column): string | null => {
    const v = c.value(p);
    return v === null ? null : (c.format ?? nf)(v, p);
  };
  const cell = (p: AccountPostRow, c: Column) => {
    const text = shown(p, c);
    return text === null ? <span className="text-text-muted">—</span> : text;
  };

  return (
    <DashCard
      title="All posts"
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs whitespace-nowrap text-text-muted tnum">
            {rows.length} {rows.length === 1 ? "post" : "posts"}
          </span>
          <FilterPills
            value={range}
            onChange={(r) => setRange(r as AccountRangeKey)}
            options={ACCOUNT_RANGES.map((r) => ({ value: r.key, label: r.label }))}
          />
        </div>
      }
    >
      {rows.length === 0 ? (
        <EmptyState icon={LayoutList}>No posts in this range</EmptyState>
      ) : (
        <>
          {/* Phone: one block per post, numbers wrapping under the caption. */}
          <ul className="flex flex-col sm:hidden">
            {rows.map((p) => (
              <li key={p.postId} className="flex flex-col gap-1.5 border-t border-border py-3 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-3 text-xs text-text-muted">
                  <span className="tnum">
                    {formatEtDate(p.postedAt)} · {typeLabel(platform, p.format)}
                  </span>
                  {p.postUrl && (
                    <a href={p.postUrl} target="_blank" rel="noreferrer" aria-label="Open post">
                      <ExternalLink className="size-3.5" />
                    </a>
                  )}
                </div>
                <p className="line-clamp-2 text-sm">{p.caption?.trim() || <span className="text-text-muted">No caption</span>}</p>
                {readingLine(p) && <p className="text-xs text-text-muted">{readingLine(p)}</p>}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
                  {columns
                    .map((c) => [c, shown(p, c)] as const)
                    .filter(([, text]) => text !== null)
                    .map(([c, text]) => (
                      <span key={c.key} className="tnum">
                        {c.words ? `${c.label} ${text}` : `${text} ${c.label.toLowerCase()}`}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>

          {/* Wider screens: the table, every column sortable. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm [&_td]:pr-2 [&_th]:pr-2 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="pb-2 font-medium whitespace-nowrap">Posted</th>
                  <th className="pb-2 font-medium">Post</th>
                  {columns.map((c) => (
                    <th key={c.key} className="pb-2 text-right font-medium">
                      <SortButton
                        label={c.label}
                        active={sort?.key === c.key}
                        dir={sort?.key === c.key ? sort.dir : (c.first ?? "desc")}
                        onClick={() => setSort((cur) => cycleSort(cur, c.key, c.first))}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.postId} className="border-t border-border align-top">
                    {/* The type sits under the date rather than in its own
                        column, so ten number columns still fit without sideways
                        scrolling at desktop width. */}
                    <td className="py-2.5 whitespace-nowrap text-text-muted tnum">
                      <span className="block">{formatEtDate(p.postedAt)}</span>
                      <span className="block text-xs">{typeLabel(platform, p.format)}</span>
                    </td>
                    <td className="max-w-64 min-w-40 py-2.5">
                      {p.postUrl ? (
                        <a
                          href={p.postUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-2 hover:text-accent"
                        >
                          {p.caption?.trim() || "No caption"}
                        </a>
                      ) : (
                        <span className="line-clamp-2">{p.caption?.trim() || "No caption"}</span>
                      )}
                      {readingLine(p) && <span className="block text-xs text-text-muted">{readingLine(p)}</span>}
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className="py-2.5 text-right whitespace-nowrap tnum">
                        {cell(p, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashCard>
  );
}
