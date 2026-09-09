"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, SlidersHorizontal } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { Dropdown } from "@/components/ui/dropdown";
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
  focus = null,
}: {
  initial: Incident[];
  initialRange: IncidentRange;
  /** Incident id to scroll to and flash once, from the bell's ?focus=. */
  focus?: string | null;
}) {
  const router = useRouter();
  const [range, setRange] = useState<IncidentRange>(initialRange);
  const [type, setType] = useState<string>("all");
  const [incidents, setIncidents] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Seeded from the prop rather than set in an effect, so the row is already
  // highlighted on the first paint — arriving from the bell should not need a
  // second render to show you where to look.
  const [flash, setFlash] = useState<string | null>(focus);

  useEffect(() => {
    if (!flash) return;
    document
      .getElementById(`incident-${flash}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
    // Long enough to catch the eye, short enough not to read as a selection.
    const t = setTimeout(() => setFlash(null), 1000);
    return () => clearTimeout(t);
  }, [flash]);

  const load = useCallback(async (r: IncidentRange) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/incidents?range=${r}`, {
        cache: "no-store",
      });
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

  // Declared once and rendered in two places — the phone's popover and the
  // desktop row. Same elements, same state; only one branch is ever visible.
  const rangePills = (
    <FilterPills
      value={range}
      onChange={(v) => pickRange(v as IncidentRange)}
      options={INCIDENT_RANGES.map((r) => ({
        value: r.key,
        label: r.label,
      }))}
    />
  );

  const typePills = types.length > 1 && (
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
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-xl font-semibold">Incidents</h1>

        {/* Phone: both switches fold into one Filters popover. Eight options
            across two full-width rows was most of the screen before a single
            incident showed. Same Dropdown the Accounts table uses, so the
            control means the same thing wherever it appears. */}
        <div className="sm:hidden">
          <Dropdown
            label="Filters"
            icon={<SlidersHorizontal className="size-3.5" />}
            badge={type === "all" ? 0 : 1}
          >
            {() => (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-medium tracking-wider text-text-muted uppercase">
                    Time range
                  </span>
                  {rangePills}
                </div>
                {typePills && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium tracking-wider text-text-muted uppercase">
                      Type
                    </span>
                    {typePills}
                  </div>
                )}
              </div>
            )}
          </Dropdown>
        </div>

        <div className="hidden sm:contents">
          {rangePills}
          {typePills}
        </div>

        <span className={cn("text-xs text-text-muted", loading && "animate-pulse")}>
          {loading ? "updating…" : `${shown.length} shown`}
        </span>
      </div>

      <DashCard title="Incident history">
        {error ? (
          <p className="text-sm text-text-muted">Could not load incidents: {error}</p>
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
                {shown.map((row) => (
                  <tr
                    key={row.id}
                    id={`incident-${row.id}`}
                    onClick={() => router.push(row.href as never)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(row.href as never);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`${row.type}: ${row.entity}`}
                    className={cn(
                      "cursor-pointer border-t border-border transition-colors duration-700 hover:bg-card-raised/50 focus-visible:bg-card-raised/50 focus-visible:outline-none",
                      flash === row.id && "bg-accent/15",
                    )}
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
    </div>
  );
}
