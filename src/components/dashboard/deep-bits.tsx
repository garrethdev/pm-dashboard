"use client";

import type { Audience, NamedPct } from "@/lib/data/account-deep";
import { cn } from "@/lib/utils";

/**
 * The small pieces the Deep sides share (DA-09 on the account page, DA-10 on
 * the main Analytics page): tables, bars, the follower split, the audience
 * block, and the dash for a number nobody has yet.
 */

export const nf = (v: number) => v.toLocaleString("en-US");
export const dash = <span className="text-text-muted">—</span>;
export const num = (v: number | null, f: (v: number) => string = nf) => (v === null ? dash : f(v));
export const pct = (v: number) => `${v}%`;
export const per100 = (v: number) => v.toFixed(1);
export const secs = (v: number) => `${v}s`;

/** "11 posts read", the footing of every reading-based card. */
export const basis = (n: number) => `${nf(n)} ${n === 1 ? "post" : "posts"} read`;

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
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

export const Td = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn("py-2.5 text-right whitespace-nowrap tnum", className)}>{children}</td>
);

/** The best and worst of a column, so the eye lands on them. Needs three values: with two, both would be coloured and nothing would stand out. */
export function extremes<T>(rows: T[], value: (r: T) => number | null): { best: T | null; worst: T | null } {
  const have = rows.filter((r) => value(r) !== null);
  if (have.length < 3) return { best: null, worst: null };
  const sorted = [...have].sort((a, b) => (value(b) as number) - (value(a) as number));
  return { best: sorted[0] ?? null, worst: sorted[sorted.length - 1] ?? null };
}

/** The colour for a cell that is the column's best or worst, else nothing. */
export const tone = <T,>(r: T, ex: { best: T | null; worst: T | null }) => cn(r === ex.best && "text-ok", r === ex.worst && "text-danger");

export function Bars({ items, max }: { items: NamedPct[]; max?: number }) {
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

export function SplitBar({ left, right }: { left: NamedPct; right: NamedPct }) {
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

export function AudienceSection({ a }: { a: Audience }) {
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
