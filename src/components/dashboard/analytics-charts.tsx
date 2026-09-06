"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowDownRight, ArrowUp, ArrowUpDown, ArrowUpRight, ExternalLink } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, DashCard } from "@/components/ui/card";
import { FilterPills } from "@/components/ui/filter-pills";
import { TopPostsCard } from "@/components/dashboard/top-posts-card";
import { InstagramIcon, TikTokIcon } from "@/components/ui/brand-icons";
import { formatEtDate } from "@/lib/data/format";
import { cn } from "@/lib/utils";
import {
  RANGES,
  type ContentTypeRow,
  type AccountPerfRow,
  type AnalyticsData,
  type PlatformKey,
  type RangeKey,
  type SeriesPoint,
} from "@/lib/data/analytics";

const nf = (v: number) => v.toLocaleString("en-US");
const compact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1000).toFixed(1)}k` : String(v);

const AXIS = { stroke: "var(--text-muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

const profileNumber = (p: string | null) => (p ? p.replace(/\D+/g, "") : "");
const platformUrl = (platform: string, account: string) =>
  platform === "instagram"
    ? `https://www.instagram.com/${account}/`
    : `https://www.tiktok.com/@${account}`;

function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  return platform === "instagram" ? (
    <InstagramIcon className={className} />
  ) : (
    <TikTokIcon className={className} />
  );
}

function Tip({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-nested border border-border bg-card px-3 py-2 shadow-card">
      <p className="mb-1 text-xs font-semibold">{title}</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-center gap-4 text-xs whitespace-nowrap">
          <span className="text-text-muted">{k}</span>
          <span className="ml-auto font-semibold tnum">{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────── Views trend ──────────────────────────────── */

type Metric = "avg" | "total";

function ViewsTrend({
  data,
  platform,
  metric,
}: {
  data: SeriesPoint[];
  platform: PlatformKey;
  metric: Metric;
}) {
  return (
    // -mb-5 only: the plot keeps its own left/right gutter so the axis labels
    // line up under the card title instead of running into the card edge.
    <div className="-mb-5 h-full min-h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ttG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="igG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--info)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--info)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={28} padding={{ left: 8, right: 8 }} />
          <YAxis
            {...AXIS}
            width={52}
            // Default ticks are right-aligned against the axis line, which
            // inset them from the card edge. Anchoring at x=0 lines the labels
            // up with the card title.
            tick={(props) => {
              const { y, payload } = props as { y: number; payload: { value: number } };
              return (
                <text x={0} y={y} dy={4} textAnchor="start" fill="var(--text-muted)" fontSize={11}>
                  {compact(payload.value)}
                </text>
              );
            }}
          />
          <Tooltip
            cursor={{ stroke: "var(--text-muted)", strokeDasharray: "3 3" }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as SeriesPoint;
              const rows: [string, string][] = [
                ["Views", nf(d.views)],
                ["Posts", nf(d.posts)],
                ["Avg views", nf(d.avgViews)],
              ];
              if (platform === "all") {
                rows.push(
                  [
                    "TikTok",
                    metric === "avg"
                      ? `${d.tiktokAvgViews == null ? "no posts" : nf(d.tiktokAvgViews)}${d.tiktokPosts ? ` (${d.tiktokPosts}p)` : ""}`
                      : nf(d.tiktokViews),
                  ],
                  [
                    "Instagram",
                    metric === "avg"
                      ? `${d.instagramAvgViews == null ? "no posts" : nf(d.instagramAvgViews)}${d.instagramPosts ? ` (${d.instagramPosts}p)` : ""}`
                      : nf(d.instagramViews),
                  ],
                );
              }
              return <Tip title={String(label)} rows={rows} />;
            }}
          />
          {metric === "avg" ? (
            // Not stacked: these are averages, and stacking two averages would
            // draw a number that means nothing.
            <>
              {platform !== "instagram" && (
                <Area
                  type="monotone"
                  dataKey="tiktokAvgViews"
                  connectNulls={false}
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#ttG)"
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
              {platform !== "tiktok" && (
                <Area
                  type="monotone"
                  dataKey="instagramAvgViews"
                  connectNulls={false}
                  stroke="var(--info)"
                  strokeWidth={2}
                  fill="url(#igG)"
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
            </>
          ) : (
            <>
              {platform !== "instagram" && (
                <Area
                  type="monotone"
                  dataKey="tiktokViews"
                  stackId="v"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#ttG)"
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
              {platform !== "tiktok" && (
                <Area
                  type="monotone"
                  dataKey="instagramViews"
                  stackId="v"
                  stroke="var(--info)"
                  strokeWidth={2}
                  fill="url(#igG)"
                  activeDot={{ r: 3, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
            </>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Legend + headline total, shown on the Views card header. */
function TrendLegend({
  data,
  platform,
  metric,
}: {
  data: SeriesPoint[];
  platform: PlatformKey;
  metric: Metric;
}) {
  // Weighted (sum views / sum posts), not a mean of the daily means — a 2-post
  // day must not count as much as a 40-post day.
  const avgOf = (views: number, posts: number) => (posts ? Math.round(views / posts) : 0);
  const ttViews = data.reduce((n2, d) => n2 + d.tiktokViews, 0);
  const ttPosts = data.reduce((n2, d) => n2 + d.tiktokPosts, 0);
  const igViews = data.reduce((n2, d) => n2 + d.instagramViews, 0);
  const igPosts = data.reduce((n2, d) => n2 + d.instagramPosts, 0);

  const items: [string, string, string][] = [
    ...(platform === "instagram"
      ? []
      : ([
          [
            "TikTok",
            "var(--accent)",
            metric === "avg" ? `${nf(avgOf(ttViews, ttPosts))} avg` : compact(ttViews),
          ],
        ] as [string, string, string][])),
    ...(platform === "tiktok"
      ? []
      : ([
          [
            "Instagram",
            "var(--info)",
            metric === "avg" ? `${nf(avgOf(igViews, igPosts))} avg` : compact(igViews),
          ],
        ] as [string, string, string][])),
  ];
  // Each platform now carries its own figure, so a combined headline only adds
  // something in Total mode, where the sum is meaningful.
  const total = data.reduce((sum, d) => sum + d.views, 0);
  const headline = metric === "avg" ? "" : `${compact(total)} views`;
  return (
    <div className="flex flex-wrap items-center gap-3">
      {headline && <span className="text-xs tnum text-text-muted">{headline}</span>}
      {items.map(([label, color, value]) => (
        <span key={label} className="inline-flex items-center gap-1.5 text-xs text-text-muted">
          <span className="size-2 rounded-full" style={{ background: color }} />
          {label}
          <span className="font-semibold tnum text-text-primary">{value}</span>
        </span>
      ))}
    </div>
  );
}

/* ──────────────────────────────── Headline tiles ──────────────────────────── */

/** A metric tile with its % change and a sparkline over the selected range. */
function MetricTile({
  label,
  value,
  spark,
  delta,
  id,
}: {
  label: string;
  value: string;
  spark: number[];
  delta: number | null;
  id: string;
}) {
  const data = spark.map((v, i) => ({ i, v }));
  // A single bucket has no shape to plot, so the sparkline is dropped rather
  // than drawn as a misleading flat line.
  const plottable = data.length > 1;
  const up = (delta ?? 0) > 0;
  const flat = delta === null || delta === 0;
  // Every metric here reads better when it rises, so up is green throughout.
  const tone = flat ? "var(--text-muted)" : up ? "var(--ok)" : "var(--danger)";
  const Icon = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="flex flex-col justify-between gap-2 overflow-hidden rounded-nested border border-border bg-card-raised px-4 py-3">
      <span className="text-xs text-text-muted">{label}</span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="font-display text-2xl leading-none font-semibold tnum text-text-primary">
          {value}
        </span>
        {!flat && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tnum",
              up ? "text-ok" : "text-danger",
            )}
          >
            <Icon className="size-3" />
            {Math.abs(delta as number)}%
          </span>
        )}
      </div>
      {/* -mx-4 cancels the tile's horizontal padding so the line runs edge to edge. */}
      <div className="-mx-4 h-7">
        {plottable && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={tone} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={tone}
                strokeWidth={1.5}
                fill={`url(#sp-${id})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function BestAccountTile({ data }: { data: AnalyticsData }) {
  const b = data.bestAccount;
  const num = profileNumber(b?.geelarkProfile ?? null);

  const inner = (
    <>
      {b?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- CDN host isn't in next.config images
        <img
          src={b.avatarUrl}
          alt=""
          className="size-10 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-text-muted">
          {b?.account.slice(0, 1).toUpperCase() ?? "—"}
        </span>
      )}
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          {b && <PlatformIcon platform={b.platform} className="size-3 shrink-0 text-text-muted" />}
          <span className="truncate text-sm font-semibold text-text-primary">@{b?.account}</span>
        </span>
        <span className="text-xs tnum text-text-muted">
          {b ? `${nf(b.views)} views · ${nf(b.posts)} posts` : ""}
        </span>
      </span>
    </>
  );

  return (
    <div className="flex flex-col gap-2.5 rounded-nested border border-border bg-card-raised px-4 py-3">
      <span className="text-xs text-text-muted">Best performing account</span>
      {!b ? (
        <span className="text-sm text-text-muted">No posts in range</span>
      ) : num ? (
        <Link href={`/accounts/${num}` as never} className="flex items-center gap-3 hover:opacity-80">
          {inner}
        </Link>
      ) : (
        <span className="flex items-center gap-3">{inner}</span>
      )}
    </div>
  );
}

/* ────────────────────── Avg views by character + types ────────────────────── */

function CharacterBars({ data }: { data: AnalyticsData }) {
  return (
    // h-full so the chart grows to match the taller card beside it instead of
    // leaving dead space under a fixed height.
    <div className="h-full min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data.characters}
          margin={{ top: 8, right: 4, bottom: 0, left: -14 }}
          barCategoryGap="18%"
        >
          <XAxis dataKey="character" {...AXIS} />
          <YAxis {...AXIS} width={40} />
          <Tooltip
            cursor={{ fill: "var(--card-raised)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as AnalyticsData["characters"][number];
              return (
                <Tip
                  title={d.character}
                  rows={[
                    ["Avg views", nf(d.avgViews)],
                    ["Posts", nf(d.posts)],
                    ["Accounts", nf(d.accounts)],
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="avgViews" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {data.characters.map((c) => (
              <Cell key={c.character} fill="var(--accent)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const TH = "pb-6 pr-6 font-medium whitespace-nowrap last:pr-0";
const TD = "py-2.5 pr-6 whitespace-nowrap last:pr-0";

function ContentTypes({ data, only }: { data: AnalyticsData; only: string }) {
  if (data.contentTypes.length === 0) {
    return <p className="text-sm text-text-muted">No posts could be attributed to a content type.</p>;
  }

  const shown = only === "all" ? data.contentTypes : data.contentTypes.filter((t) => t.character === only);
  // One scale across everything on screen, so bar lengths stay comparable
  // between characters rather than each group normalising to its own best row.
  const max = Math.max(...shown.map((t) => t.medianViews), 1);

  /** Best / worst within a character; the middle stays neutral. */
  const rankTone = (row: ContentTypeRow) => {
    const peers = data.contentTypes.filter((t) => t.character === row.character);
    if (peers.length < 2) return { bar: "var(--accent)", text: "text-text-primary" };
    const sorted = [...peers].sort((a, b) => b.medianViews - a.medianViews);
    if (sorted[0].contentType === row.contentType) return { bar: "var(--ok)", text: "text-ok" };
    if (sorted[sorted.length - 1].contentType === row.contentType)
      return { bar: "var(--danger)", text: "text-danger" };
    return { bar: "var(--accent)", text: "text-text-primary" };
  };

  return (
    <div className="h-[300px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className={cn(TH, "sticky top-0 z-10 bg-card")}>Content type</th>
              <th className={cn(TH, "sticky top-0 z-10 bg-card")}>Median views</th>
              <th className={cn(TH, "sticky top-0 z-10 bg-card text-right")}>Best</th>
              <th className={cn(TH, "sticky top-0 z-10 bg-card text-right")}>Posts</th>
              <th className={cn(TH, "sticky top-0 z-10 bg-card text-right")}>Total views</th>
              <th className={cn(TH, "sticky top-0 z-10 bg-card text-right")}>Eng. rate</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((t, i) => {
              const firstOfGroup = i === 0 || shown[i - 1].character !== t.character;
              const tone = rankTone(t);
              return [
                // A labelled divider row separates one character from the next.
                firstOfGroup && only === "all" ? (
                  <tr key={`${t.character}-head`}>
                    <td colSpan={6} className={cn("pb-1.5 text-xs font-medium text-text-muted", i > 0 && "border-t border-border pt-4")}>
                      {t.character}
                    </td>
                  </tr>
                ) : null,
                <tr key={`${t.character}-${t.contentType}`}>
                  <td className={cn(TD, "max-w-[168px] truncate")} title={t.displayName}>
                    {t.displayName}
                  </td>
                  <td className={cn(TD, "w-[38%] min-w-[140px]")}>
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-card-raised">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.max((t.medianViews / max) * 100, 2)}%`,
                            background: tone.bar,
                          }}
                        />
                      </span>
                      <span className={cn("w-10 text-right text-xs font-semibold tnum", tone.text)}>
                        {nf(t.medianViews)}
                      </span>
                    </span>
                  </td>
                  <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(t.bestViews)}</td>
                  <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(t.posts)}</td>
                  <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(t.views)}</td>
                  <td className={cn(TD, "text-right tnum text-text-muted")}>
                    {t.engRate == null ? "—" : `${t.engRate}%`}
                  </td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
    </div>
  );
}

/* ───────────────────────────── Account performance ────────────────────────── */

type SortKey = keyof Pick<
  AccountPerfRow,
  | "account"
  | "posts"
  | "views"
  | "medianViews"
  | "avgViews"
  | "suppressedPct"
  | "likes"
  | "comments"
  | "shares"
  | "saves"
  | "engRate"
  | "engagement"
>;
type Sort = { key: SortKey; dir: "asc" | "desc" };

/** Same three-state cycle the Accounts table uses: desc → asc → off. */
function cycleSort(cur: Sort | null, key: SortKey): Sort | null {
  if (cur?.key !== key) return { key, dir: "desc" };
  if (cur.dir === "desc") return { key, dir: "asc" };
  return null;
}

function AccountPerformance({ rows }: { rows: AccountPerfRow[] }) {
  const router = useRouter();
  // Median, not total: a per-post throttle inflates totals and averages while
  // leaving the median where it belongs (see zara_bloom_1, 2026-09-02).
  const [sort, setSort] = useState<Sort | null>({ key: "medianViews", dir: "desc" });

  const sorted = [...rows];
  if (sort) {
    sorted.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      let cmp: number;
      if (typeof av === "string" || typeof bv === "string") {
        cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      } else {
        // Nulls (an account with no views has no engagement rate) sort last.
        cmp = (av ?? -Infinity) < (bv ?? -Infinity) ? -1 : (av ?? -Infinity) > (bv ?? -Infinity) ? 1 : 0;
      }
      return sort.dir === "desc" ? -cmp : cmp;
    });
  }

  const head = (label: string, key: SortKey, align?: "right", hint?: string) => {
    const active = sort?.key === key;
    const Icon = active ? (sort!.dir === "desc" ? ArrowDown : ArrowUp) : ArrowUpDown;
    return (
      <th className={cn(TH, "sticky top-0 z-10 bg-card", align === "right" && "text-right")}>
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

  return (
    <div className="max-h-[520px] overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-text-muted">
            {head("Account", "account")}
            {head("Posts", "posts", "right")}
            {head("Median", "medianViews", "right")}
            {head("Avg", "avgViews", "right")}
            {head("Views", "views", "right")}
            {head(
              "Supp.",
              "suppressedPct",
              "right",
              "Posts that almost nobody saw (10 views or fewer) in the selected range — a high % means the platform is barely showing this account.",
            )}
            {head("Likes", "likes", "right")}
            {head("Comments", "comments", "right")}
            {head("Shares", "shares", "right")}
            {head("Saves", "saves", "right")}
            {head("Eng. rate", "engRate", "right")}
            {head("Total eng.", "engagement", "right")}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => {
            const num = profileNumber(r.geelarkProfile);
            return (
              <tr
                key={r.account}
                onClick={(e) => {
                  // Row opens the account page, but not when the click was meant
                  // for the username link or a text selection.
                  if ((e.target as HTMLElement).closest("a,button")) return;
                  if (window.getSelection()?.toString()) return;
                  if (num) router.push(`/accounts/${num}` as never);
                }}
                className={cn(
                  "border-t border-border",
                  num && "cursor-pointer hover:bg-card-raised/50",
                )}
              >
                <td className={TD}>
                  <a
                    href={platformUrl(r.platform, r.account)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 font-medium text-accent hover:opacity-80"
                  >
                    <PlatformIcon platform={r.platform} className="size-3 shrink-0" />
                    @{r.account}
                    <ExternalLink className="size-3 opacity-70" />
                  </a>
                  {/* Retired accounts keep their posts in the totals — those
                      views really happened — but must not read as live. */}
                  {!r.isActive && (
                    <span className="ml-2 rounded-full bg-card-raised px-2 py-0.5 text-[11px] text-text-muted">
                      retired
                    </span>
                  )}
                </td>
                <td className={cn(TD, "text-right tnum")}>{nf(r.posts)}</td>
                <td className={cn(TD, "text-right font-semibold tnum")}>{nf(r.medianViews)}</td>
                <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(r.avgViews)}</td>
                <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(r.views)}</td>
                {/* >=40% of posts under 10 views is the collapsing threshold. */}
                <td
                  className={cn(
                    TD,
                    "text-right tnum",
                    r.suppressedPct >= 40
                      ? "text-danger"
                      : r.suppressedPct >= 25
                        ? "text-orange"
                        : "text-text-muted",
                  )}
                >
                  {r.suppressedPct}%
                </td>
                <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(r.likes)}</td>
                <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(r.comments)}</td>
                <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(r.shares)}</td>
                <td className={cn(TD, "text-right tnum text-text-muted")}>{nf(r.saves)}</td>
                <td className={cn(TD, "text-right tnum")}>{r.engRate == null ? "—" : `${r.engRate}%`}</td>
                <td className={cn(TD, "text-right font-semibold tnum")}>{nf(r.engagement)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────── Page shell ──────────────────────────────── */

export function AnalyticsView({ initial }: { initial: AnalyticsData }) {
  const [platform, setPlatform] = useState<PlatformKey>("all");
  const [range, setRange] = useState<RangeKey>("7d");
  const [ctChar, setCtChar] = useState<string>("all");
  const [metric, setMetric] = useState<Metric>("avg");
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (r: RangeKey, p: PlatformKey) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${r}&platform=${p}`, { cache: "no-store" });
      const body = await res.json();
      if (body.data) setData(body.data as AnalyticsData);
    } catch {
      /* keep the last good numbers rather than blanking the page */
    }
    setLoading(false);
  }, []);

  // The server already rendered 7d/all, so skip the redundant first fetch.
  const isInitial = range === "7d" && platform === "all";
  useEffect(() => {
    if (!isInitial) load(range, platform);
  }, [range, platform, isInitial, load]);

  const s = data.summary;
  const series = data.series;
  const ctCharacters = [...new Set(data.contentTypes.map((t) => t.character))];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-4">
          <h1 className="text-xl font-semibold">Analytics</h1>
          <FilterPills
            value={platform}
            onChange={(v) => setPlatform(v as PlatformKey)}
            options={[
              { value: "all", label: "All" },
              { value: "tiktok", label: "TikTok" },
              { value: "instagram", label: "Instagram" },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Not real-time: both perf tables are filled by scheduled ingests. */}
          <span className={cn("text-xs whitespace-nowrap text-text-muted", loading && "animate-pulse")}>
            {loading ? "updating…" : `as of ${formatEtDate(data.lastIngest)}`}
          </span>
          <FilterPills
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
            options={RANGES.map((r) => ({ value: r.key, label: r.label }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {/* Bento: best account over a 2x2 of metrics, with the trend beside it. */}
        {/* 2:3 split — the trend needs more width than the bento beside it. */}
        <div className="grid gap-3 xl:grid-cols-5">
          <div className="flex flex-col gap-3 xl:col-span-2">
            <BestAccountTile data={data} />
            <div className="grid grid-cols-2 gap-3">
              <MetricTile
                id="posts"
                label="Posts"
                value={nf(s.posts)}
                delta={data.deltas.posts}
                spark={series.map((d) => d.posts)}
              />
              <MetricTile
                id="views"
                label="Total views"
                value={compact(s.views)}
                delta={data.deltas.views}
                spark={series.map((d) => d.views)}
              />
              <MetricTile
                id="avg"
                label="Avg views"
                value={nf(s.avgViews)}
                delta={data.deltas.avgViews}
                spark={series.map((d) => d.avgViews)}
              />
              <MetricTile
                id="eng"
                label="Engagement rate"
                value={`${s.engagementRate.toFixed(2)}%`}
                delta={data.deltas.engagementRate}
                spark={series.map((d) => d.engagementRate)}
              />
            </div>
          </div>

          <DashCard
            title="Views"
            className="min-h-full xl:col-span-3"
            toolbar={
              <FilterPills
                value={metric}
                onChange={(v) => setMetric(v as Metric)}
                options={[
                  { value: "avg", label: "Average" },
                  { value: "total", label: "Total" },
                ]}
              />
            }
            actions={<TrendLegend data={series} platform={platform} metric={metric} />}
          >
            <ViewsTrend data={series} platform={platform} metric={metric} />
          </DashCard>
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          <DashCard title="Avg views by character" className="xl:col-span-2">
            <CharacterBars data={data} />
          </DashCard>
          <DashCard
            className="xl:col-span-3"
            title="Top content types per character"
            toolbar={
              <FilterPills
                value={ctChar}
                onChange={setCtChar}
                options={[
                  { value: "all", label: "All" },
                  ...ctCharacters.map((c) => ({ value: c, label: c.replace("Character ", "Char ") })),
                ]}
              />
            }
          >
            <ContentTypes data={data} only={ctChar} />
          </DashCard>
        </div>

        <Card className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Account performance</h2>
            <span className="text-xs tnum text-text-muted">{data.accounts.length} accounts</span>
          </div>
          <AccountPerformance rows={data.accounts} />
        </Card>

        {/* Inside the view, not beside it on the page, so it can read the
            platform pills above rather than needing a second set. */}
        <TopPostsCard platform={platform} />
      </div>
    </div>
  );
}
