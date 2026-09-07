"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Play } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { FilterPills } from "@/components/ui/filter-pills";
import {
  ACCOUNT_RANGES,
  type AccountAnalytics,
  type AccountPost,
  type AccountRangeKey,
} from "@/lib/data/account-analytics";
import { formatEtDate } from "@/lib/data/format";
import { cn } from "@/lib/utils";

/**
 * One account's performance. Deliberately none of the fleet page's comparison
 * sections — this exists to answer "is this account healthy, collapsing or
 * shadowbanned", and a leaderboard does not help with that.
 *
 * The recent list is the point of the right-hand column: the top five flatter
 * an account (its best work, possibly months old), while the last five are what
 * the platform is doing to it right now. A collapsing account looks fine on the
 * left and obvious on the right.
 */

type Metric = "avg" | "total";

const AXIS = { stroke: "var(--text-muted)", fontSize: 11, tickLine: false, axisLine: false } as const;
const nf = (v: number) => v.toLocaleString("en-US");
const compact = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));

export function AccountAnalyticsView({
  initial,
  account,
  platform,
}: {
  initial: AccountAnalytics;
  account: string | null;
  platform: "tiktok" | "instagram";
}) {
  const [data, setData] = useState(initial);
  const [range, setRange] = useState<AccountRangeKey>("7d");
  const [metric, setMetric] = useState<Metric>("avg");
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (r: AccountRangeKey) => {
      if (!account) return;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/account-analytics?account=${encodeURIComponent(account)}&platform=${platform}&range=${r}`,
          { cache: "no-store" },
        );
        const body = (await res.json()) as { data?: AccountAnalytics };
        if (body.data) setData(body.data);
      } catch {
        /* keep the current window rather than blanking the panel */
      } finally {
        setLoading(false);
      }
    },
    [account, platform],
  );

  if (!account) {
    return (
      <DashCard title="Analytics">
        <p className="text-sm text-text-muted">
          This account has no username recorded yet, so there is nothing to measure.
        </p>
      </DashCard>
    );
  }

  const s = data.summary;

  return (
    // The outer stack breathes at gap-6 while the grids inside stay at gap-3,
    // so the eye reads three sections rather than one long list of boxes.
    <div className="flex flex-col gap-6">
      {/* No heading: the tab above already says Account Analytics, and a second
          "Analytics" under it was the same word twice. Freshness then range,
          left-aligned, so the controls start where the content does. */}
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn("text-xs whitespace-nowrap text-text-muted", loading && "animate-pulse")}
        >
          {loading ? "updating…" : `as of ${formatEtDate(data.lastIngest)}`}
        </span>
        <FilterPills
          value={range}
          onChange={(r) => {
            setRange(r as AccountRangeKey);
            void load(r as AccountRangeKey);
          }}
          options={ACCOUNT_RANGES.map((r) => ({ value: r.key, label: r.label }))}
        />
      </div>

      {/* 2:3 split — the trend needs more width than the tiles beside it. */}
      <div className="grid gap-3 xl:grid-cols-5">
        <div className="grid grid-cols-2 gap-3 xl:col-span-2">
          <MetricTile
            id="posts"
            label="Posts"
            value={nf(s.posts)}
            delta={data.deltas.posts}
            spark={data.series.map((p) => p.posts)}
          />
          <MetricTile
            id="views"
            label="Total views"
            value={nf(s.views)}
            delta={data.deltas.views}
            spark={data.series.map((p) => p.views)}
          />
          <MetricTile
            id="avg"
            label="Avg. views"
            value={nf(s.avgViews)}
            delta={data.deltas.avgViews}
            spark={data.series.map((p) => p.avgViews)}
          />
          <MetricTile
            id="eng"
            label="Engagement rate"
            value={`${s.engagementRate}%`}
            delta={data.deltas.engagementRate}
            spark={data.series.map((p) => p.engagementRate)}
          />
        </div>

        <DashCard
          sunken
          title="Views"
          className="xl:col-span-3"
          toolbar={
            <FilterPills
              value={metric}
              onChange={(m) => setMetric(m as Metric)}
              options={[
                { value: "avg", label: "Average" },
                { value: "total", label: "Total" },
              ]}
            />
          }
        >
          {data.series.length < 2 ? (
            // One bucket is a dot, not a trend; saying so beats drawing a flat
            // line that looks like a finding.
            <div className="flex h-64 items-center justify-center text-sm text-text-muted">
              {data.series.length === 0
                ? "No posts in this range"
                : "Only one day of posts in this range"}
            </div>
          ) : (
            // -mb-5 only: the plot keeps its own left/right gutter so the axis
            // labels line up under the card title instead of running into the
            // card edge. Same treatment as the fleet trend.
            <div className="-mb-5 h-full min-h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="acctViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.055)" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="label"
                    {...AXIS}
                    interval="preserveStartEnd"
                    minTickGap={28}
                    padding={{ left: 8, right: 8 }}
                  />
                  <YAxis
                    {...AXIS}
                    width={52}
                    // Anchored at x=0 so the labels line up with the card title
                    // rather than sitting inset against the axis line.
                    tick={(props) => {
                      const { y, payload } = props as { y: number; payload: { value: number } };
                      return (
                        <text
                          x={0}
                          y={y}
                          dy={4}
                          textAnchor="start"
                          fill="var(--text-muted)"
                          fontSize={11}
                        >
                          {compact(payload.value)}
                        </text>
                      );
                    }}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.28)", strokeDasharray: "2 4" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]!.payload as AccountAnalytics["series"][number];
                      return (
                        <div className="glass-overlay rounded-nested border border-border px-3 py-2">
                          <p className="mb-1 text-xs font-semibold">{d.label}</p>
                          {(
                            [
                              ["Avg. views", nf(d.avgViews)],
                              ["Total views", nf(d.views)],
                              ["Posts", nf(d.posts)],
                            ] as [string, string][]
                          ).map(([k, v]) => (
                            <div
                              key={k}
                              className="flex items-center gap-4 text-xs whitespace-nowrap"
                            >
                              <span className="text-text-muted">{k}</span>
                              <span className="ml-auto tnum">{v}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={metric === "avg" ? "avgViews" : "views"}
                    stroke="var(--accent)"
                    strokeWidth={2}
                    fill="url(#acctViews)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </DashCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <TopPostsSection initial={data.topPosts} account={account} platform={platform} />

        <DashCard
          title="Last 5 posts"
          actions={<span className="text-xs text-text-muted">most recent first</span>}
        >
          {data.recentPosts.length === 0 ? (
            <p className="text-sm text-text-muted">No posts in this range.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.recentPosts.map((p) => (
                <RecentRow key={p.postId} post={p} platform={platform} />
              ))}
            </ul>
          )}
        </DashCard>
      </div>
    </div>
  );
}

/**
 * The fleet Analytics tile, to the pixel — same padding, same type scale, same
 * edge-to-edge sparkline tinted by direction. Duplicated rather than imported
 * because the original is a private function inside a 700-line client module
 * that also pulls in the fleet payload type; lifting it into ui/ is the right
 * move the next time a third page needs it.
 */
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
    <div className="dot-fade flex flex-col justify-between gap-2 overflow-hidden rounded-nested border border-border bg-card-raised px-4 py-3 text-text-muted">
      <span className="relative z-10 text-xs text-text-muted">{label}</span>
      <div className="relative z-10 flex flex-wrap items-baseline justify-between gap-x-2">
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
      <div className="relative z-10 -mx-4 h-7">
        {plottable && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                {/* SVG gradient ids are document-global, so these carry an
                    account- prefix to stay clear of the fleet page's sp-*. */}
                <linearGradient id={`acct-sp-${id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tone} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={tone} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={tone}
                strokeWidth={1.5}
                fill={`url(#acct-sp-${id})`}
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

/** Its own window, independent of the panel above — the same split the fleet
 *  Analytics page uses. "Best ever" and "how is it doing lately" are different
 *  questions, and pinning both to one selector answers neither well. */
const TOP_RANGES: { key: AccountRangeKey; label: string }[] = [
  { key: "7d", label: "This Week" },
  { key: "30d", label: "This Month" },
  { key: "all", label: "All time" },
];

function TopPostsSection({
  initial,
  account,
  platform,
}: {
  initial: AccountPost[];
  account: string;
  platform: "tiktok" | "instagram";
}) {
  const [posts, setPosts] = useState(initial);
  const [range, setRange] = useState<AccountRangeKey>("7d");
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (r: AccountRangeKey) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/account-analytics?account=${encodeURIComponent(account)}&platform=${platform}&range=${r}`,
          { cache: "no-store" },
        );
        const body = (await res.json()) as { data?: AccountAnalytics };
        if (body.data) setPosts(body.data.topPosts);
      } catch {
        /* keep what is on screen */
      } finally {
        setLoading(false);
      }
    },
    [account, platform],
  );

  return (
    <DashCard
      title="Top 5 posts"
      actions={
        <FilterPills
          value={range}
          onChange={(r) => {
            setRange(r as AccountRangeKey);
            void load(r as AccountRangeKey);
          }}
          options={TOP_RANGES.map((r) => ({ value: r.key, label: r.label }))}
        />
      }
    >
      {posts.length === 0 ? (
        <p className="text-sm text-text-muted">No posts in this range.</p>
      ) : (
        // Thumbnails take the card's full height — the card is as tall as the
        // list beside it, and five short tiles left a band of dead space. Height
        // drives width through the aspect ratio, so when five no longer fit the
        // row scrolls sideways rather than shrinking them to stamps.
        <div
          className={cn(
            "flex h-full min-h-[220px] gap-2 overflow-x-auto",
            loading && "opacity-50",
          )}
        >
          {posts.map((p) => (
            <TopThumb key={p.postId} post={p} platform={platform} />
          ))}
        </div>
      )}
    </DashCard>
  );
}

function postHref(post: AccountPost) {
  return post.postUrl as never;
}

function TopThumb({ post, platform }: { post: AccountPost; platform: string }) {
  return (
    <Link
      href={postHref(post)}
      target="_blank"
      rel="noreferrer"
      className="group relative flex aspect-[9/16] h-full w-auto shrink-0 flex-col justify-end overflow-hidden rounded-nested border border-border bg-card-raised"
    >
      {post.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- oEmbed URLs, many CDN subdomains
        <img
          src={post.thumbnailUrl}
          alt={post.caption ?? ""}
          loading="lazy"
          className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-105"
        />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-text-muted">
          <Play className="size-4" />
        </span>
      )}
      <span className="relative bg-gradient-to-t from-black/80 to-transparent px-1.5 pt-4 pb-1">
        <span className="block text-[11px] font-semibold tnum text-white">
          {compact(post.views)}
        </span>
      </span>
      <span className="sr-only">
        {platform} post, {nf(post.views)} views
      </span>
    </Link>
  );
}

/** Horizontal row: thumbnail, the opening of the caption, then the numbers a
 *  suppression check actually turns on. */
function RecentRow({ post, platform }: { post: AccountPost; platform: string }) {
  return (
    <li>
      <Link
        href={postHref(post)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-nested border border-border bg-card-raised px-2.5 py-2 transition-colors hover:border-accent/40"
      >
        <span className="relative aspect-[9/16] h-14 shrink-0 overflow-hidden rounded-[6px] border border-border bg-card">
          {post.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- oEmbed URLs, many CDN subdomains
            <img
              src={post.thumbnailUrl}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-text-muted">
              <Play className="size-3" />
            </span>
          )}
        </span>

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="line-clamp-2 text-xs leading-snug text-text-primary">
            {post.caption?.trim() || <span className="text-text-muted">No caption</span>}
          </span>
          <span className="flex items-center gap-3 text-[11px] text-text-muted">
            <span className="tnum">{formatEtDate(post.postedAt)}</span>
            <span className="tnum">{nf(post.views)} views</span>
            <span className="tnum">{nf(post.likes)} likes</span>
            <span className="tnum">{nf(post.comments)} comments</span>
          </span>
        </span>

        <ExternalLink className="size-3.5 shrink-0 text-text-muted" />
        <span className="sr-only">Open {platform} post</span>
      </Link>
    </li>
  );
}
