"use client";

import { RetentionCard, WatchingTiles } from "@/components/dashboard/account-deep-view";
import { AudienceSection, Bars, Table, Td, basis, extremes, nf, num, pct, per100, secs, tone } from "@/components/dashboard/deep-bits";
import { DashCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartBar } from "@/components/ui/icons";
import type { FleetDeep, FleetHookGroup, FleetHookPost, FleetWatchingRow, SharedHookRow } from "@/lib/data/fleet-deep";
import { formatEtDate } from "@/lib/data/format";
import { cn } from "@/lib/utils";

/**
 * DA-10, the Deep side of the main Analytics page (design step, drawn
 * against made-up numbers; src/lib/data/fleet-deep.ts). The account page's
 * Deep side, across the fleet: the watching numbers for the whole fleet and
 * then by content type; where the views came from and who watches; TikTok's
 * For You verdicts by account; and Hook Analysis grouped within each content
 * type first, with the shared hook families compared across the fleet after,
 * because the writers' hook types are each lane's own.
 */

function WatchingByType({ rows }: { rows: FleetWatchingRow[] }) {
  const ex = extremes(rows, (r) => r.heldPct);
  return (
    <Table head={["Content type", "Character", "Posts read", "Avg. watch", "Held past 3s", "Watched to end", "Most stop at"]}>
      {rows.map((r) => (
        <tr key={r.contentType} className="border-t border-border">
          <td className="py-2.5">{r.contentType}</td>
          <Td className="text-text-muted">{r.character}</Td>
          <Td>{nf(r.readPosts)}</Td>
          <Td>{num(r.avgWatchSec, secs)}</Td>
          <Td className={tone(r, ex)}>{num(r.heldPct, pct)}</Td>
          <Td>{num(r.watchedFullPct, pct)}</Td>
          <Td>{num(r.dropOffSec, secs)}</Td>
        </tr>
      ))}
    </Table>
  );
}

function ForYouByAccount({ f }: { f: NonNullable<FleetDeep["forYou"]> }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <span className={cn("font-display text-2xl leading-none font-semibold tnum", f.held > 0 ? "text-danger" : "text-text-primary")}>{nf(f.held)}</span>
        <span className="text-sm text-text-muted">of {nf(f.videosRead)} videos held out of the For You feed</span>
      </div>
      <Table head={["Account", "Videos read", "Held out"]}>
        {f.byAccount.map((a) => (
          <tr key={a.account} className="border-t border-border">
            <td className="py-2.5">{a.account}</td>
            <Td>{nf(a.videosRead)}</Td>
            <Td className={a.held > 0 ? "text-danger" : undefined}>{nf(a.held)}</Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function HooksByType({ groups }: { groups: FleetHookGroup[] }) {
  return (
    <Table head={["Hook", "Posts", "Median views", "Held past 3s", "Follows /100 reached"]}>
      {groups.map((g) => {
        const ex = extremes(g.rows, (r) => r.heldPct);
        return [
          <tr key={`${g.contentType}-head`} className="border-t border-border">
            <td colSpan={5} className="pt-3 pb-1 text-xs text-text-muted">
              <span className="font-medium text-text-primary">{g.contentType}</span> · {g.character} · {nf(g.taggedPosts)} tagged
            </td>
          </tr>,
          ...g.rows.map((r) => (
            <tr key={`${g.contentType}-${r.family}`}>
              <td className="py-1.5 pl-3">{r.family}</td>
              <Td className="py-1.5">{nf(r.posts)}</Td>
              <Td className="py-1.5">{num(r.medianViews)}</Td>
              <Td className={cn("py-1.5", tone(r, ex))}>{num(r.heldPct, pct)}</Td>
              <Td className="py-1.5">{num(r.followsPer100, per100)}</Td>
            </tr>
          )),
        ];
      })}
    </Table>
  );
}

function SharedHooks({ rows }: { rows: SharedHookRow[] }) {
  const ex = extremes(rows, (r) => r.heldPct);
  return (
    <Table head={["Hook family", "Posts", "Content types", "Median views", "Held past 3s"]}>
      {rows.map((r) => (
        <tr key={r.family} className="border-t border-border">
          <td className="py-2.5">{r.family}</td>
          <Td>{nf(r.posts)}</Td>
          <Td>{nf(r.contentTypes)}</Td>
          <Td>{num(r.medianViews)}</Td>
          <Td className={tone(r, ex)}>{num(r.heldPct, pct)}</Td>
        </tr>
      ))}
    </Table>
  );
}

function FleetHookList({ posts }: { posts: FleetHookPost[] }) {
  if (posts.length === 0) return <p className="text-sm text-text-muted">Not enough posts yet</p>;
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
            {p.account} · {p.contentType} · {p.family} · {formatEtDate(p.postedAt)} · {p.views === null ? "—" : `${nf(p.views)} views`} · {p.heldPct === null ? "—" : `${p.heldPct}% held`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function FleetDeepView({ deep }: { deep: FleetDeep | null }) {
  if (!deep || (deep.taggedPosts === 0 && deep.readPosts === 0)) {
    return <EmptyState icon={ChartBar}>No deep numbers across the fleet yet</EmptyState>;
  }
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted tnum">
        <span>as of {formatEtDate(deep.asOf)}</span>
        <span>
          {nf(deep.taggedPosts)} of {nf(deep.totalPosts)} posts tagged · {nf(deep.readPosts)} read from the phones, {nf(deep.accountsRead)} accounts
        </span>
      </div>

      {deep.watching && (
        <>
          <div className="grid gap-3 xl:grid-cols-5">
            <WatchingTiles w={deep.watching} idPrefix="fleet" />
            <RetentionCard title="How long people watch, whole fleet" curve={deep.watching.curve} dropOffSec={deep.watching.dropOffSec} readPosts={deep.watching.readPosts} gradientId="fleetCurve" />
          </div>
          <DashCard title="Watching by content type" toolbar={<span className="text-xs text-text-muted tnum">{basis(deep.watching.readPosts)}</span>}>
            <WatchingByType rows={deep.watching.byContentType} />
          </DashCard>
        </>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <DashCard className="min-w-0" title="Where views come from" toolbar={deep.sources ? <span className="text-xs text-text-muted tnum">{basis(deep.sources.readPosts)}</span> : undefined}>
          {deep.sources && deep.sources.items.length ? <Bars items={deep.sources.items} max={100} /> : <p className="text-sm text-text-muted">Not read yet</p>}
        </DashCard>
        <DashCard className="min-w-0" title="Who watches" toolbar={deep.audience ? <span className="text-xs text-text-muted tnum">{basis(deep.audience.readPosts)}</span> : undefined}>
          {deep.audience ? <AudienceSection a={deep.audience} /> : <p className="text-sm text-text-muted">Not read yet</p>}
        </DashCard>
      </div>

      {deep.forYou && (
        <DashCard title="For You feed" toolbar={<span className="text-xs text-text-muted tnum">{basis(deep.forYou.videosRead)}</span>}>
          <ForYouByAccount f={deep.forYou} />
        </DashCard>
      )}

      <section className="flex flex-col gap-3 rounded-card border border-border bg-card px-5 py-4 shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Hook Analysis</h2>
          <span className="text-xs text-text-muted tnum">{nf(deep.taggedPosts)} tagged posts</span>
        </div>
        <DashCard sunken title="Within each content type">
          <HooksByType groups={deep.hooksByContentType} />
        </DashCard>
        <DashCard sunken title="Shared hook families across the fleet">
          <SharedHooks rows={deep.sharedHooks} />
        </DashCard>
        <div className="grid gap-3 md:grid-cols-2">
          <DashCard sunken className="min-w-0" title="Best hooks">
            <FleetHookList posts={deep.best} />
          </DashCard>
          <DashCard sunken className="min-w-0" title="Worst hooks">
            <FleetHookList posts={deep.worst} />
          </DashCard>
        </div>
      </section>
    </div>
  );
}
