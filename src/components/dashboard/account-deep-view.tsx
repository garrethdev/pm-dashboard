"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MetricTile } from "@/components/dashboard/account-analytics-view";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartBar } from "@/components/ui/icons";
import type { AccountDeep, Audience, CarouselRow, CurvePoint, ForYou, HookPost, HookTypeRow, NamedPct, Watching, WeekValue } from "@/lib/data/account-deep";
import { formatEtDate } from "@/lib/data/format";
import { cn } from "@/lib/utils";

/**
 * DA-09, the Deep side of an account's analytics (design step, drawn against
 * made-up numbers; see src/lib/data/account-deep.ts). First what the phone
 * robot read off each app's own screens (DA-08), in the Overview's own
 * shapes: tiles with a trend line, and a chart card for the retention curve;
 * then where the views came from and who watched; then the comparisons the
 * ticket asks for, by hook type. A number nobody has yet shows a dash, and
 * every card says how many posts it rests on.
 */

const nf = (v: number) => v.toLocaleString("en-US");
const dash = <span className="text-text-muted">—</span>;
const num = (v: number | null, f: (v: number) => string = nf) => (v === null ? dash : f(v));
const pct = (v: number) => `${v}%`;
const per100 = (v: number) => v.toFixed(1);
const secs = (v: number) => `${v}s`;
const AXIS = { stroke: "var(--text-muted)", fontSize: 11, tickLine: false, axisLine: false } as const;

/** "11 posts read", the footing of every reading-based card. */
const basis = (n: number) => `${nf(n)} ${n === 1 ? "post" : "posts"} read`;

// --- Watching: tiles and the retention curve ---------------------------------------

/** The weeks that have a value, and the change from the week before last to last. */
function trend(weekly: WeekValue[]): { spark: number[]; delta: number | null } {
  const have = weekly.map((w) => w.value).filter((v): v is number => v !== null);
  if (have.length < 2) return { spark: have, delta: null };
  const last = have[have.length - 1] as number;
  const prev = have[have.length - 2] as number;
  return { spark: have, delta: prev === 0 ? null : Math.round(((last - prev) / prev) * 100) };
}

function WatchingSection({ w }: { w: Watching }) {
  const watch = trend(w.weekly.avgWatchSec);
  const full = trend(w.weekly.watchedFullPct);
  const held = trend(w.weekly.heldPct);
  const drop = trend(w.weekly.dropOffSec);
  const curve = w.curve;
  return (
    <div className="grid gap-3 xl:grid-cols-5">
      <div className="grid min-w-0 grid-cols-2 gap-3 xl:col-span-2">
        <MetricTile id="deep-watch" label="Avg. watch time" value={w.avgWatchSec === null ? "—" : `${w.avgWatchSec}s`} delta={watch.delta} spark={watch.spark} />
        <MetricTile id="deep-full" label="Watched to the end" value={w.watchedFullPct === null ? "—" : `${w.watchedFullPct}%`} delta={full.delta} spark={full.spark} />
        <MetricTile id="deep-held" label="Held past 3s" value={w.heldPct === null ? "—" : `${w.heldPct}%`} delta={held.delta} spark={held.spark} />
        <MetricTile id="deep-drop" label="Most stop at" value={w.dropOffSec === null ? "—" : `${w.dropOffSec}s`} delta={drop.delta} spark={drop.spark} />
      </div>

      <DashCard sunken title="How long people watch" className="min-w-0 xl:col-span-3" toolbar={<span className="text-xs text-text-muted tnum">{basis(w.readPosts)}</span>}>
        {curve.length < 2 ? (
          <div className="flex h-64 items-center justify-center text-sm text-text-muted">No retention curve read yet</div>
        ) : (
          <div className="-mb-5 h-full min-h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={curve} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="deepCurve" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="2 4" />
                <XAxis dataKey="s" type="number" domain={[0, "dataMax"]} {...AXIS} tickFormatter={(v: number) => `${v}s`} minTickGap={28} padding={{ left: 8, right: 8 }} />
                <YAxis
                  {...AXIS}
                  width={52}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tick={(props) => {
                    const { y, payload } = props as { y: number; payload: { value: number } };
                    return (
                      <text x={0} y={y} dy={4} textAnchor="start" fill="var(--text-muted)" fontSize={11}>
                        {payload.value}%
                      </text>
                    );
                  }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--chart-cursor)", strokeDasharray: "2 4" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]!.payload as CurvePoint;
                    return (
                      <div className="glass-overlay rounded-nested border border-border px-3 py-2 text-xs whitespace-nowrap">
                        <span className="text-text-muted">at {d.s}s</span> <span className="ml-3 tnum">{d.pct}% still watching</span>
                      </div>
                    );
                  }}
                />
                {w.dropOffSec !== null && (
                  <ReferenceLine x={w.dropOffSec} stroke="var(--danger)" strokeDasharray="3 3" label={{ value: "most stop", position: "insideBottomRight", fill: "var(--text-muted)", fontSize: 11, dy: -6 }} />
                )}
                <Area type="monotone" dataKey="pct" stroke="var(--accent)" strokeWidth={2} fill="url(#deepCurve)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </DashCard>
    </div>
  );
}

// --- Bars: where views come from, who watches --------------------------------------

function Bars({ items, max }: { items: NamedPct[]; max?: number }) {
  const top = max ?? Math.max(...items.map((i) => i.pct), 1);
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((i) => (
        <li key={i.name} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate">{i.name}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-card-raised">
            <span className="block h-full rounded-full bg-accent/70" style={{ width: `${Math.max(2, (i.pct / top) * 100)}%` }} />
          </span>
          <span className="w-12 shrink-0 text-right text-xs text-text-muted tnum">{i.pct}%</span>
        </li>
      ))}
    </ul>
  );
}

function SplitBar({ left, right }: { left: NamedPct; right: NamedPct }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-card-raised">
        <span className="h-full bg-accent/70" style={{ width: `${left.pct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-text-muted tnum">
        <span>
          {left.name} {left.pct}%
        </span>
        <span>
          {right.name} {right.pct}%
        </span>
      </div>
    </div>
  );
}

function AudienceSection({ a }: { a: Audience }) {
  const followers = a.followersPct === null ? null : { name: "Followers", pct: a.followersPct };
  return (
    <div className="flex flex-col gap-5">
      {followers && <SplitBar left={followers} right={{ name: "Non-followers", pct: Math.round((100 - followers.pct) * 10) / 10 }} />}
      {a.newViewersPct !== null && <SplitBar left={{ name: "New viewers", pct: a.newViewersPct }} right={{ name: "Returning", pct: Math.round((100 - a.newViewersPct) * 10) / 10 }} />}
      {a.gender.length === 2 && <SplitBar left={a.gender[0]!} right={a.gender[1]!} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-text-muted">Age</span>
          {a.age.length ? <Bars items={a.age} /> : dash}
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs text-text-muted">Country</span>
          {a.country.length ? <Bars items={a.country} /> : dash}
        </div>
      </div>
    </div>
  );
}

function ForYouSection({ f }: { f: ForYou }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className={cn("font-display text-2xl leading-none font-semibold tnum", f.held > 0 ? "text-danger" : "text-text-primary")}>{nf(f.held)}</span>
        <span className="text-sm text-text-muted">of {nf(f.videosRead)} videos held out of the For You feed</span>
      </div>
      {f.heldPosts.length > 0 && (
        <ul className="flex flex-col">
          {f.heldPosts.map((p) => (
            <li key={`${p.postedAt}-${p.hookText}`} className="flex flex-col gap-0.5 border-t border-border py-2.5">
              {p.postUrl ? (
                <a href={p.postUrl} target="_blank" rel="noreferrer" className="line-clamp-1 text-sm hover:text-accent">
                  {p.hookText}
                </a>
              ) : (
                <span className="line-clamp-1 text-sm">{p.hookText}</span>
              )}
              <span className="text-xs text-text-muted tnum">
                {formatEtDate(p.postedAt)} · {p.views === null ? "—" : `${nf(p.views)} views`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- The comparisons by hook type ----------------------------------------------------

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm [&_td]:pr-2 [&_th]:pr-2 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
        <thead>
          <tr className="text-left text-xs text-text-muted">
            {head.map((h, i) => (
              <th key={h} className={cn("pb-2 font-medium whitespace-nowrap", i > 0 && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn("py-2.5 text-right whitespace-nowrap tnum", className)}>{children}</td>
);

/** The best and worst of a column, so the eye lands on them. Needs two values to compare. */
function extremes<T>(rows: T[], value: (r: T) => number | null): { best: T | null; worst: T | null } {
  const have = rows.filter((r) => value(r) !== null);
  if (have.length < 2) return { best: null, worst: null };
  const sorted = [...have].sort((a, b) => (value(b) as number) - (value(a) as number));
  return { best: sorted[0] ?? null, worst: sorted[sorted.length - 1] ?? null };
}

function HooksTable({ rows }: { rows: HookTypeRow[] }) {
  const { best, worst } = extremes(rows, (r) => r.hookRate);
  return (
    <Table head={["Hook", "Posts", "Median views", "Held past 3s", "Most stop at", "Follows /100 reached"]}>
      {rows.map((r) => (
        <tr key={r.type} className="border-t border-border">
          <td className="py-2.5">{r.type}</td>
          <Td>{nf(r.posts)}</Td>
          <Td>{num(r.medianViews)}</Td>
          <Td className={cn(r === best && "text-ok", r === worst && "text-danger")}>{num(r.hookRate, pct)}</Td>
          <Td>{num(r.dropOffSec, secs)}</Td>
          <Td>{num(r.followsPer100, per100)}</Td>
        </tr>
      ))}
    </Table>
  );
}

function HookList({ posts }: { posts: HookPost[] }) {
  return (
    <ul className="flex flex-col">
      {posts.map((p) => (
        <li key={`${p.postedAt}-${p.hookText}`} className="flex flex-col gap-0.5 border-t border-border py-2.5 first:border-t-0 first:pt-0">
          {p.postUrl ? (
            <a href={p.postUrl} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm hover:text-accent">
              {p.hookText}
            </a>
          ) : (
            <span className="line-clamp-2 text-sm">{p.hookText}</span>
          )}
          <span className="text-xs text-text-muted tnum">
            {p.type} · {formatEtDate(p.postedAt)} · {p.views === null ? "—" : `${nf(p.views)} views`} · {p.hookRate === null ? "—" : `${p.hookRate}% held`}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CarouselsTable({ rows }: { rows: CarouselRow[] }) {
  const { best, worst } = extremes(rows, (r) => r.savesPer100);
  return (
    <Table head={["Hook", "Posts", "Reach (median)", "Saves /100", "Shares /100", "Follows /100"]}>
      {rows.map((r) => (
        <tr key={r.type} className="border-t border-border">
          <td className="py-2.5">{r.type}</td>
          <Td>{nf(r.posts)}</Td>
          <Td>{num(r.medianReach)}</Td>
          <Td className={cn(r === best && "text-ok", r === worst && "text-danger")}>{num(r.savesPer100, per100)}</Td>
          <Td>{num(r.sharesPer100, per100)}</Td>
          <Td>{num(r.followsPer100, per100)}</Td>
        </tr>
      ))}
    </Table>
  );
}

// --- The side ------------------------------------------------------------------------

/** `aside` is the Overview / Deep switch, placed at the right end of the first row. */
export function AccountDeepView({ deep, aside }: { deep: AccountDeep | null; aside?: React.ReactNode }) {
  if (!deep || (deep.taggedPosts === 0 && deep.readPosts === 0)) {
    return (
      <div className="flex min-h-full flex-col gap-6">
        {aside && <div className="flex items-center justify-end">{aside}</div>}
        <EmptyState icon={ChartBar}>No deep numbers for this account yet</EmptyState>
      </div>
    );
  }
  const readings = <span className="text-xs text-text-muted tnum">{basis(deep.readPosts)}</span>;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted tnum">
        <span>as of {formatEtDate(deep.asOf)}</span>
        <span>
          {nf(deep.taggedPosts)} of {nf(deep.totalPosts)} posts tagged · {nf(deep.readPosts)} read from the phone
        </span>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>

      {deep.watching && <WatchingSection w={deep.watching} />}

      <div className="grid gap-3 lg:grid-cols-2">
        <DashCard className="min-w-0" title="Where views come from" toolbar={deep.sources ? <span className="text-xs text-text-muted tnum">{basis(deep.sources.readPosts)}</span> : undefined}>
          {deep.sources && deep.sources.items.length ? <Bars items={deep.sources.items} max={100} /> : <p className="text-sm text-text-muted">Not read yet</p>}
        </DashCard>
        <DashCard className="min-w-0" title="Who watches" toolbar={deep.audience ? <span className="text-xs text-text-muted tnum">{basis(deep.audience.readPosts)}</span> : undefined}>
          {deep.audience ? <AudienceSection a={deep.audience} /> : <p className="text-sm text-text-muted">Not read yet</p>}
        </DashCard>
      </div>

      {deep.forYou && (
        <DashCard title="For You feed" toolbar={readings}>
          <ForYouSection f={deep.forYou} />
        </DashCard>
      )}

      {/* One section for the comparisons by hook type (Garreth, 2026-10-23):
          a heading and a rule set it apart from the robot's readings above,
          on the same page. The cards inside are sunken so they read as one
          group rather than three more boxes. */}
      <section className="flex flex-col gap-3 rounded-card border border-border bg-card px-5 py-4 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Hook Analysis</h2>
          <span className="text-xs text-text-muted tnum">{nf(deep.taggedPosts)} tagged posts this month</span>
        </div>
        <DashCard sunken title="By hook type">
          <HooksTable rows={deep.hooks} />
        </DashCard>
        <div className="grid gap-3 md:grid-cols-2">
          <DashCard sunken className="min-w-0" title="Best hooks">
            <HookList posts={deep.best} />
          </DashCard>
          <DashCard sunken className="min-w-0" title="Worst hooks">
            <HookList posts={deep.worst} />
          </DashCard>
        </div>
        {deep.carousels.length > 0 && (
          <DashCard sunken title="Carousels">
            <CarouselsTable rows={deep.carousels} />
          </DashCard>
        )}
      </section>
    </div>
  );
}
