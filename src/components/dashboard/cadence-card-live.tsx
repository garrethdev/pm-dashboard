import { BarcodeBar } from "@/components/ui/barcode-bar";
import { DashCard } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/pill";
import { getCadence, type CadenceData } from "@/lib/data/cadence";
import { formatEtShort } from "@/lib/data/format";

function CadenceColumn({ group }: { group: CadenceData["characters"][number] }) {
  return (
    <div className="flex flex-col gap-3 rounded-nested bg-card-raised/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{group.name}</span>
        <StatusPill tone={group.glpSum === 10 ? "ok" : "danger"}>
          Σ GLP {group.glpSum}/10
        </StatusPill>
      </div>
      <div className="flex flex-col gap-2">
        {group.lanes.map((lane) => (
          <div key={lane.contentType} className="flex items-center gap-2.5">
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted">
              {lane.contentType}
            </span>
            <BarcodeBar pct={(lane.cadencePerWeek ?? 0) * 10} className="h-3 w-16 shrink-0" />
            <span className="w-10 shrink-0 text-right text-xs tnum">{lane.cadencePerWeek ?? 0}/wk</span>
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-2.5 border-t border-border pt-2.5">
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted">filler</span>
        <BarcodeBar
          pct={group.fillerPerWeek * 10}
          colorClass="bg-info"
          className="h-3 w-16 shrink-0"
        />
        <span className="w-10 shrink-0 text-right text-xs tnum">{group.fillerPerWeek}/wk</span>
      </div>
    </div>
  );
}

/** Homepage cadence card — live per-content-type breakdown from the registry. */
export async function CadenceCardLive({ className }: { className?: string }) {
  try {
    const { data, fetchedAt } = await getCadence();
    return (
      <DashCard
        title="Cadence"
        fetchedAt={formatEtShort(fetchedAt)}
        viewAllHref="/content-calendar"
        className={className}
      >
        <div className="grid gap-4 md:grid-cols-3">
          {data.characters.map((group) => (
            <CadenceColumn key={group.name} group={group} />
          ))}
        </div>
        <p className="mt-4 border-t border-border pt-3 text-xs text-text-muted">
          Cadence is a preferred mix, not a hard cap — the scheduler substitutes across types up to
          each ceiling. Edits take effect at tomorrow&apos;s 06:30 ET run.
        </p>
      </DashCard>
    );
  } catch (err) {
    return (
      <DashCard title="Cadence" viewAllHref="/content-calendar" className={className}>
        <p className="text-sm text-text-muted">
          Supabase unreachable — {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }
}
