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

type NumKey = "views" | "likes" | "comments" | "shares" | "saves" | "reach" | "skipRate" | "avgWatchSec" | "follows" | "profileVisits";

interface Column {
  key: NumKey;
  label: string;
  format?: (v: number) => string;
  /** Skip rate: the useful end is the low one, so a fresh sort opens there. */
  first?: SortDir;
}

const nf = (v: number) => v.toLocaleString("en-US");

const BASE: Column[] = [
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
];

/** What each platform measures, in the order a person reads a post's story. */
const COLUMNS: Record<AnalyticsPlatform, Column[]> = {
  instagram: [
    ...BASE,
    { key: "shares", label: "Shares" },
    { key: "saves", label: "Saves" },
    { key: "reach", label: "Reach" },
    { key: "skipRate", label: "Skip rate", format: (v) => `${v}%`, first: "asc" },
    { key: "avgWatchSec", label: "Watch", format: (v) => `${v}s` },
    { key: "follows", label: "Follows" },
    // Short headings so all ten columns fit at desktop width.
    { key: "profileVisits", label: "Visits" },
  ],
  tiktok: [...BASE, { key: "shares", label: "Shares" }, { key: "saves", label: "Saves" }],
  // Facebook's reads carry no shares or saves, so the columns would only ever be empty.
  facebook: BASE,
};

function typeLabel(platform: AnalyticsPlatform, format: string | null): string {
  if (format === "carousel") return "Carousel";
  if (format === "photo") return platform === "tiktok" ? "Carousel" : "Photo";
  if (format === "video") return platform === "tiktok" ? "Video" : "Reel";
  return "—";
}

export function AccountPostsView({ posts, platform }: { posts: AccountPostRow[]; platform: AnalyticsPlatform }) {
  const [range, setRange] = useState<AccountRangeKey>("all");
  const [sort, setSort] = useState<{ key: NumKey; dir: SortDir } | null>(null);
  const columns = COLUMNS[platform];
  // Read the clock once, when the list first shows, not on every render.
  const [now] = useState(() => Date.now());

  const rows = useMemo(() => {
    const days = ACCOUNT_RANGES.find((r) => r.key === range)?.days ?? null;
    const since = days === null ? -Infinity : now - days * 86_400_000;
    const inRange = posts.filter((p) => new Date(p.postedAt).getTime() >= since);
    if (!sort) return inRange; // already newest first
    const sign = sort.dir === "desc" ? -1 : 1;
    // Posts without the number go to the bottom whichever way the column sorts.
    return [...inRange].sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return sign * (x - y);
    });
  }, [posts, range, sort, now]);

  const cell = (p: AccountPostRow, c: Column) => {
    const v = p[c.key];
    return v === null ? <span className="text-text-muted">—</span> : (c.format ?? nf)(v);
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
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
                  {columns
                    .filter((c) => p[c.key] !== null)
                    .map((c) => (
                      <span key={c.key} className="tnum">
                        {(c.format ?? nf)(p[c.key] as number)} {c.label.toLowerCase()}
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
