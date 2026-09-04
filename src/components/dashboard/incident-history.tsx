"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { DashCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { FilterPills } from "@/components/ui/filter-pills";
import { formatEtDate } from "@/lib/data/format";
import { INCIDENT_RANGES, type Incident, type IncidentRange } from "@/lib/data/incidents";
import { cn } from "@/lib/utils";

/**
 * Full incident history. Same five sources as the dashboard card, over a
 * longer window — nothing is stored separately for this page, so the two can
 * never disagree.
 */

/** All types present in the feed, so the filter offers only what exists. */
function typesOf(incidents: Incident[]): string[] {
  return [...new Set(incidents.map((i) => i.type))].sort();
}

export function IncidentHistory({
  initial,
  initialRange,
}: {
  initial: Incident[];
  initialRange: IncidentRange;
}) {
  const router = useRouter();
  const [range, setRange] = useState<IncidentRange>(initialRange);
  const [type, setType] = useState<string>("all");
  const [incidents, setIncidents] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (r: IncidentRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents?range=${r}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { data: Incident[] };
      setIncidents(body.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetching from the change handler rather than an effect: the server already
  // rendered `initialRange`, so an effect would need a "have I mounted yet"
  // flag purely to avoid re-fetching what is already on screen.
  const pickRange = useCallback(
    (r: IncidentRange) => {
      setRange(r);
      void load(r);
    },
    [load],
  );

  const types = typesOf(incidents);
  const shown = type === "all" ? incidents : incidents.filter((i) => i.type === type);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-xl font-semibold">Incidents</h1>
        <FilterPills
          value={range}
          onChange={(v) => pickRange(v as IncidentRange)}
          options={INCIDENT_RANGES.map((r) => ({ value: r.key, label: r.label }))}
        />
        {types.length > 1 && (
          <FilterPills
            value={type}
            onChange={setType}
            options={[
              { value: "all", label: `All (${incidents.length})` },
              ...types.map((t) => ({
                value: t,
                label: `${t} (${incidents.filter((i) => i.type === t).length})`,
              })),
            ]}
          />
        )}
        <span className={cn("text-xs text-text-muted", loading && "animate-pulse")}>
          {loading ? "updating…" : `${shown.length} shown`}
        </span>
      </div>

      <DashCard title="Incident history">
        {error ? (
          <p className="text-sm text-text-muted">Could not load incidents — {error}</p>
        ) : shown.length === 0 ? (
          <p className="flex items-center gap-1.5 py-2 text-sm text-text-muted">
            <CheckCircle2 className="size-4 text-ok" /> No incidents in this range.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="pb-2 font-medium whitespace-nowrap">When</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Type</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Entity</th>
                  <th className="pb-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr
                    key={i}
                    onClick={() => router.push(row.href as never)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(row.href as never);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`${row.type} — ${row.entity}`}
                    className="cursor-pointer border-t border-border hover:bg-card-raised/50 focus-visible:bg-card-raised/50 focus-visible:outline-none"
                  >
                    <td className="py-2.5 whitespace-nowrap text-text-muted tnum">
                      {formatEtDate(row.at)}
                    </td>
                    <td className="py-2.5">
                      <StatusPill tone={row.tone}>{row.type}</StatusPill>
                    </td>
                    <td className="py-2.5 font-medium whitespace-nowrap">
                      <Link href={row.href as never} className="hover:text-accent">
                        {row.entity}
                      </Link>
                    </td>
                    <td className="py-2.5 text-text-muted">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashCard>

      <p className="text-xs text-text-muted">
        Computed live from the same sources as the dashboard card — bans from{" "}
        <span className="font-mono">account_events</span> and{" "}
        <span className="font-mono">accounts.banned_at</span>, deliveries from{" "}
        <span className="font-mono">geelark_tasks</span>, shortfalls from{" "}
        <span className="font-mono">scheduler_shortfalls</span>. A &ldquo;Ban&rdquo; row opens that
        account&apos;s forensics report when one has been produced. Analytics-staleness rows
        describe the feed right now, not a past moment, so they always sort to the top.
      </p>
    </div>
  );
}
