"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "@/components/ui/icons";
import { DashCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { formatEtDate } from "@/lib/data/format";
import type { Incident } from "@/lib/data/incidents";

function relTime(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatEtDate(iso);
}

const DEFAULT_ROWS = 5;

export function IncidentFeed({ incidents, className }: { incidents: Incident[]; className?: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? incidents : incidents.slice(0, DEFAULT_ROWS);

  return (
    <DashCard title="Incident feed, last 48h" viewAllHref="/incidents" className={className}>
      {incidents.length === 0 ? (
        <p className="flex items-center gap-1.5 py-2 text-sm text-text-muted">
          <CheckCircle2 className="size-4 text-ok" /> No incidents in the last 48 hours.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm [&_td]:pr-4 [&_th]:pr-4 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="pb-2 font-medium whitespace-nowrap">When</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Type</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Entity</th>
                  <th className="pb-2 font-medium whitespace-nowrap">Detail</th>
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
                    aria-label={`${row.type}: ${row.entity}`}
                    className="cursor-pointer border-t border-border hover:bg-card-raised/50 focus-visible:bg-card-raised/50 focus-visible:outline-none"
                  >
                    <td className="py-2.5 whitespace-nowrap text-text-muted tnum">{relTime(row.at)}</td>
                    <td className="py-2.5">
                      <StatusPill tone={row.tone}>{row.type}</StatusPill>
                    </td>
                    <td className="py-2.5 font-medium whitespace-nowrap">
                      <Link href={row.href as never} className="hover:text-accent">
                        {row.entity}
                      </Link>
                    </td>
                    <td className="py-2.5 text-text-muted whitespace-nowrap">{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Expands the 48h card in place. "View all" lives in the card
              header via viewAllHref, matching every other dashboard section. */}
          {incidents.length > DEFAULT_ROWS && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-3 w-full rounded-nested border border-border bg-card-raised py-2 text-xs font-medium text-text-muted transition-colors hover:text-text-primary"
            >
              {expanded ? "Show less" : `View more (${incidents.length - DEFAULT_ROWS} more)`}
            </button>
          )}
        </>
      )}
    </DashCard>
  );
}
