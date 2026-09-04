import { Suspense } from "react";
import Link from "next/link";
import { DashCard } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/card-skeleton";
import { StatusPill } from "@/components/ui/pill";
import { getCadence } from "@/lib/data/cadence";
import { getSchedulerConfig, minutesToEt } from "@/lib/data/scheduler-config";
import { cn } from "@/lib/utils";
import { formatEtShort } from "@/lib/data/format";

const HEALTH_TONE: Record<string, "ok" | "warn" | "orange" | "danger"> = {
  healthy: "ok",
  watch: "warn",
  shadowbanned: "orange",
  collapsing: "danger",
};

/**
 * The per-account half of cadence. A lane's cadence_per_week is only a
 * request: each account then applies its own daily ceilings, minimum gap and
 * posting window, and health downgrades the caps further. Reading the lane
 * tables above without this one over-predicts what actually gets posted.
 */
async function AccountLimits() {
  let data, fetchedAt;
  try {
    ({ data, fetchedAt } = await getSchedulerConfig());
  } catch (err) {
    return (
      <DashCard title="Per-account posting limits">
        <p className="text-sm text-text-muted">
          Supabase unreachable — {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }

  return (
    <DashCard title="Per-account posting limits" fetchedAt={formatEtShort(fetchedAt)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <StatusPill tone={data.blocked > 0 ? "danger" : "ok"} dot={false}>
          {data.blocked} blocked
        </StatusPill>
        <StatusPill tone={data.throttled > 0 ? "warn" : "neutral"} dot={false}>
          {data.throttled} throttled
        </StatusPill>
        <span className="text-xs text-text-muted">
          the caps the scheduler enforces per account — these override the lane cadence above
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="pb-2 font-medium">Profile</th>
              <th className="pb-2 font-medium">Character</th>
              <th className="pb-2 font-medium">Health</th>
              <th className="pb-2 text-right font-medium">Posts/day</th>
              <th className="pb-2 text-right font-medium">GLP/day</th>
              <th className="pb-2 text-right font-medium">Filler/day</th>
              <th className="pb-2 text-right font-medium">Min gap</th>
              <th className="pb-2 pl-6 font-medium">Window (ET)</th>
              <th className="pb-2 text-right font-medium">Fail rate 7 d</th>
              <th className="pb-2 pl-6 font-medium">Delivery</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.geelarkProfile} className="border-t border-border hover:bg-card-raised/50">
                <td className="py-2.5 font-medium whitespace-nowrap">
                  <Link href={`/accounts/${r.geelarkProfile.replace(/\D/g, "")}` as never} className="hover:text-accent">
                    {r.geelarkProfile}
                  </Link>
                </td>
                <td className="py-2.5 text-text-muted whitespace-nowrap">
                  {r.character?.replace("Character ", "Char ") ?? "—"}
                </td>
                <td className="py-2.5">
                  {r.health ? (
                    <StatusPill tone={HEALTH_TONE[r.health] ?? "neutral"} dot={false}>
                      {r.health}
                    </StatusPill>
                  ) : (
                    <span className="text-xs text-text-muted">—</span>
                  )}
                </td>
                <td className="py-2.5 text-right tnum">{r.maxPostsPerDay ?? "—"}</td>
                <td
                  className={cn(
                    "py-2.5 text-right tnum",
                    r.maxGlpPerDay === 0 && "text-danger",
                  )}
                >
                  {r.maxGlpPerDay ?? "—"}
                </td>
                <td className="py-2.5 text-right tnum">{r.maxFillerPerDay ?? "—"}</td>
                <td className="py-2.5 text-right tnum text-text-muted">
                  {r.minGapMinutes === null ? "—" : `${r.minGapMinutes}m`}
                </td>
                <td className="py-2.5 pl-6 whitespace-nowrap text-text-muted tnum">
                  {minutesToEt(r.windowStartMin)}–{minutesToEt(r.windowEndMin)}
                </td>
                <td
                  className={cn(
                    "py-2.5 text-right tnum",
                    r.failRate7d !== null && r.failRate7d >= 0.3 && "text-danger",
                  )}
                >
                  {r.failRate7d === null
                    ? "—"
                    : `${Math.round(r.failRate7d * 100)}% (${r.fails7d}/${r.attempts7d})`}
                </td>
                <td className="py-2.5 pl-6 whitespace-nowrap">
                  {!r.canDeliver ? (
                    <StatusPill tone="danger" dot={false}>
                      blocked
                    </StatusPill>
                  ) : r.throttleReason ? (
                    <StatusPill tone="warn" dot={false}>
                      {r.throttleReason}
                    </StatusPill>
                  ) : (
                    <span className="text-xs text-text-muted">full cadence</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashCard>
  );
}

async function CadenceLive() {
  let data, fetchedAt;
  try {
    ({ data, fetchedAt } = await getCadence());
  } catch (err) {
    return (
      <DashCard title="Content types & cadence">
        <p className="text-sm text-text-muted">
          Supabase unreachable — {err instanceof Error ? err.message : "unknown error"}
        </p>
      </DashCard>
    );
  }

  const fetched = formatEtShort(fetchedAt);

  return (
    <>
      {data.characters.map((group) => (
        <DashCard key={group.name} title={group.name} fetchedAt={fetched}>
          <div className="mb-3 flex items-center gap-2">
            <StatusPill tone={group.glpSum === 10 ? "ok" : "danger"} dot={false}>
              Σ GLP cadence = {group.glpSum} / 10
            </StatusPill>
            <StatusPill tone="info" dot={false}>
              filler {group.fillerPerWeek}/wk
            </StatusPill>
            {group.glpSum !== 10 && (
              <span className="text-xs text-danger">
                invalid — the preferred mix is not being honoured
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="pb-2 font-medium">Content type</th>
                  <th className="pb-2 font-medium">Source table</th>
                  <th className="pb-2 text-right font-medium">Cadence/wk</th>
                  <th className="pb-2 text-right font-medium">Ceiling/wk</th>
                  <th className="pb-2 pl-6 font-medium">Poster</th>
                  <th className="pb-2 text-right font-medium">Pool now</th>
                </tr>
              </thead>
              <tbody>
                {group.lanes.map((lane) => (
                  <tr key={lane.contentType} className="border-t border-border hover:bg-card-raised/50">
                    <td className="py-2.5 font-medium whitespace-nowrap">{lane.contentType}</td>
                    <td className="py-2.5 font-mono text-xs text-text-muted whitespace-nowrap">
                      {lane.sourceTable ?? "—"}
                    </td>
                    <td className="py-2.5 text-right tnum">{lane.cadencePerWeek ?? "—"}</td>
                    <td className="py-2.5 text-right tnum text-text-muted">
                      {lane.ceilingPerWeek ?? "—"}
                    </td>
                    <td className="py-2.5 pl-6">
                      <StatusPill tone={lane.posterActive ? "ok" : "neutral"} dot={false}>
                        {lane.posterActive ? "active" : "off"}
                      </StatusPill>
                    </td>
                    <td className="py-2.5 text-right tnum">{lane.poolNow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashCard>
      ))}

      <DashCard title={`Retired lanes — ${data.retired.length}`} fetchedAt={fetched}>
        <details>
          <summary className="cursor-pointer text-sm text-text-muted hover:text-text-primary">
            Show retired lanes (read-only)
          </summary>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-text-muted">
                  <th className="pb-2 font-medium">Content type</th>
                  <th className="pb-2 font-medium">Character</th>
                  <th className="pb-2 font-medium">Source table</th>
                  <th className="pb-2 font-medium">Poster</th>
                </tr>
              </thead>
              <tbody>
                {data.retired.map((lane) => (
                  <tr key={`${lane.contentType}-${lane.character}`} className="border-t border-border">
                    <td className="py-2.5 whitespace-nowrap">{lane.contentType}</td>
                    <td className="py-2.5 text-text-muted whitespace-nowrap">{lane.character}</td>
                    <td className="py-2.5 font-mono text-xs text-text-muted whitespace-nowrap">
                      {lane.sourceTable ?? "—"}
                    </td>
                    <td className="py-2.5">
                      {lane.posterActive ? (
                        <StatusPill tone="warn" dot={false}>
                          poster still active ⚠
                        </StatusPill>
                      ) : (
                        <span className="text-xs text-text-muted">off</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-text-muted">
              Note: retired <span className="font-mono">divorce_story</span> (Char 2) and active{" "}
              <span className="font-mono">divorce_stories</span> (Char 4) share one source table —
              per-lane counting must go through the registry.
            </p>
          </div>
        </details>
      </DashCard>

    </>
  );
}

export default function CadencePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Cadence</h1>
      <Suspense fallback={<CardSkeleton title="Content types & cadence" lines={10} />}>
        <CadenceLive />
      </Suspense>
      <Suspense fallback={<CardSkeleton title="Per-account posting limits" lines={10} />}>
        <AccountLimits />
      </Suspense>
      <p className="text-xs text-text-muted">
        Cadence editing (per-character rebalance, save only at Σ = 10) arrives in Phase 2.
      </p>
    </div>
  );
}
