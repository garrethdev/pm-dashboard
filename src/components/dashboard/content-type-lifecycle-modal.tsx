"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, PauseCircle, PlayCircle, TriangleAlert, X } from "@/components/ui/icons";
import { StatusPill } from "@/components/ui/pill";
import { HoldButton } from "@/components/ui/hold-button";
import { Stepper } from "@/components/ui/stepper";
import type { ContentTypeRow } from "@/lib/data/content-types";
import { cn } from "@/lib/utils";

/**
 * Pause / retire / resume one content type.
 *
 * The whole point of the dialog is the second half: a character's live GLP
 * lanes have to add up to the fleet weekly quota, so taking a lane out frees
 * slots that have to land somewhere. If they do not, the character posts fewer
 * GLP pieces a week than the fleet budget claims — an under-post nobody sees
 * until the production order comes up short. The freed slots are therefore
 * spread across the remaining lanes on open, and the editor refuses to save
 * until the mix balances. The API enforces the same rule.
 */

export type LifecycleAction = "pause" | "retire" | "resume";

interface Lane {
  contentType: string;
  displayName: string;
  ceiling: number | null;
}

const COPY: Record<
  LifecycleAction,
  { title: (n: string) => string; verb: string; tone: "warn" | "danger" | "accent" }
> = {
  pause: { title: (n) => `Pause ${n}`, verb: "Pause", tone: "warn" },
  retire: { title: (n) => `Retire ${n}`, verb: "Retire", tone: "danger" },
  resume: { title: (n) => `Bring ${n} back`, verb: "Resume", tone: "accent" },
};

/** Move `delta` posts across `lanes` a slot at a time, skipping any lane that
 *  has hit its ceiling (going up) or zero (coming down). Returns what it could
 *  place; the caller shows the remainder rather than silently losing it. */
function distribute(
  start: Record<string, number>,
  delta: number,
  lanes: Lane[],
): Record<string, number> {
  const next = { ...start };
  if (lanes.length === 0) return next;
  const step = delta > 0 ? 1 : -1;
  let left = Math.abs(delta);
  // Every lane can absorb at most (ceiling - current) slots, so one pass per
  // remaining slot per lane is a hard upper bound on useful iterations.
  let guard = left * lanes.length + lanes.length;
  let i = 0;
  while (left > 0 && guard > 0) {
    guard--;
    const lane = lanes[i % lanes.length]!;
    i++;
    const v = next[lane.contentType] ?? 0;
    const cap = lane.ceiling ?? Number.POSITIVE_INFINITY;
    if (step > 0 ? v < cap : v > 0) {
      next[lane.contentType] = v + step;
      left--;
    }
  }
  return next;
}

export function ContentTypeLifecycleModal({
  action,
  target,
  peers,
  glpPerWeek,
  onClose,
}: {
  action: LifecycleAction;
  target: ContentTypeRow;
  /** The same character's other LIVE lanes — the ones that can take the slots. */
  peers: ContentTypeRow[];
  glpPerWeek: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const copy = COPY[action];
  const leaving = action !== "resume";

  // Filler is one fleet-wide registry row against character "All": it has its
  // own bucket budget and no per-character mix, so there is nothing to balance.
  const balances = target.bucket === "glp" && target.character.startsWith("Character");

  const peerLanes: Lane[] = useMemo(
    () =>
      peers.map((p) => ({
        contentType: p.contentType,
        displayName: p.displayName,
        ceiling: p.cadenceCeilingPerWeek,
      })),
    [peers],
  );

  const wantOnResume = Math.min(
    target.cadenceBeforePause ?? 1,
    target.cadenceCeilingPerWeek ?? Number.POSITIVE_INFINITY,
  );

  const [self, setSelf] = useState(leaving ? 0 : Math.max(0, wantOnResume));
  const [alloc, setAlloc] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    for (const p of peers) base[p.contentType] = p.cadencePerWeek ?? 0;
    if (!balances) return base;
    // Leaving hands the lane's slots out; resuming takes them back.
    return distribute(base, leaving ? (target.cadencePerWeek ?? 0) : -Math.max(0, wantOnResume), peerLanes);
  });
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allocated =
    (leaving ? 0 : self) + peerLanes.reduce((acc, l) => acc + (alloc[l.contentType] ?? 0), 0);
  const short = glpPerWeek - allocated;
  const balanced = !balances || short === 0;

  const canSave = balanced && !busy && peerLanes.length + (leaving ? 0 : 1) > 0;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/content-types/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: target.contentType,
          lifecycle: action === "resume" ? "live" : action === "pause" ? "paused" : "retired",
          cadencePerWeek: leaving ? 0 : self,
          note: note.trim() || null,
          reallocation: balances
            ? peerLanes.map((l) => ({
                contentType: l.contentType,
                cadencePerWeek: alloc[l.contentType] ?? 0,
              }))
            : [],
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setBusy(false);
    }
  }

  const Icon = action === "resume" ? PlayCircle : action === "pause" ? PauseCircle : TriangleAlert;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={copy.title(target.displayName)}
        className="my-auto w-full max-w-lg rounded-card border border-border bg-card-sunken shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                copy.tone === "danger"
                  ? "bg-danger/15 text-danger"
                  : copy.tone === "warn"
                    ? "bg-warn/15 text-warn"
                    : "bg-accent-soft text-accent",
              )}
            >
              <Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">{copy.title(target.displayName)}</h2>
              <p className="text-xs text-text-muted">{target.character}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-text-muted hover:text-text-primary">
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <section className="border-b border-border px-6 py-4">
            <p className="text-sm text-text-primary">
              {action === "resume" ? (
                <>
                  The Smart Scheduler will start placing {target.displayName} again, and the poster
                  will send it.
                </>
              ) : (
                <>
                  The Smart Scheduler stops placing {target.displayName}, the poster stops sending
                  it, and it drops out of the inventory monitor and the production order.
                  {action === "pause" ? " Its numbers stay here so you can bring it back." : ""}
                </>
              )}
            </p>

            {leaving && target.scheduledAhead > 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-nested bg-warn/10 px-3 py-2 text-xs text-warn">
                <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
                {target.scheduledAhead} {target.scheduledAhead === 1 ? "post is" : "posts are"}{" "}
                already on the calendar for this lane. {target.scheduledAhead === 1 ? "It" : "They"}{" "}
                will not go out — the poster skips a lane that is not live.
              </p>
            )}
          </section>

          {balances && (
            <section className="border-b border-border px-6 py-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {leaving ? "Where its slots go" : "Where its slots come from"}
                </h3>
                <StatusPill tone={short === 0 ? "ok" : "danger"}>
                  {allocated} / {glpPerWeek} per week
                </StatusPill>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {!leaving && (
                  <Stepper
                    label={target.displayName}
                    hint="coming back"
                    value={self}
                    onChange={setSelf}
                    min={0}
                    max={Math.min(target.cadenceCeilingPerWeek ?? glpPerWeek, glpPerWeek)}
                    suffix="/wk"
                  />
                )}
                {peerLanes.map((l) => (
                  <Stepper
                    key={l.contentType}
                    label={l.displayName}
                    value={alloc[l.contentType] ?? 0}
                    onChange={(v) => setAlloc((prev) => ({ ...prev, [l.contentType]: v }))}
                    min={0}
                    max={Math.min(l.ceiling ?? glpPerWeek, glpPerWeek)}
                    suffix="/wk"
                  />
                ))}
              </div>

              {peerLanes.length === 0 && leaving ? (
                <p className="mt-3 text-xs text-danger">
                  {target.displayName} is {target.character}&rsquo;s last live content type. Take it
                  out and the character has nowhere to get its {glpPerWeek} GLP posts a week — bring
                  another type back first.
                </p>
              ) : short > 0 ? (
                <p className="mt-3 text-xs text-danger">
                  {short} of the {glpPerWeek} weekly GLP posts {short === 1 ? "has" : "have"} nowhere
                  to go. Every account on {target.character} would post {short} fewer{" "}
                  {short === 1 ? "time" : "times"} a week. Raise one of the lanes above.
                </p>
              ) : short < 0 ? (
                <p className="mt-3 text-xs text-danger">
                  {-short} more than the {glpPerWeek} weekly GLP budget. Take{" "}
                  {-short === 1 ? "one" : `${-short}`} back off.
                </p>
              ) : (
                <p className="mt-3 text-xs text-text-muted">
                  Every GLP slot accounted for — {target.character} keeps posting {glpPerWeek} times
                  a week.
                </p>
              )}
            </section>
          )}

          <section className="px-6 py-5">
            <label className="mb-1 block text-xs text-text-muted" htmlFor="ct-note">
              Reason (optional)
            </label>
            <input
              id="ct-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={action === "resume" ? "e.g. new batch, better hooks" : "e.g. median collapsed after Aug 20"}
              className="w-full rounded-nested border border-border bg-bg/60 px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border p-6">
          {error && <p className="mr-auto text-xs text-danger">{error}</p>}
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-4 py-1.5 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-40"
          >
            Cancel
          </button>
          {/* Taking a lane out of rotation is held, not clicked. Resuming one is
              harmless and stays an ordinary button. */}
          {leaving ? (
            <HoldButton
              onConfirm={submit}
              disabled={!canSave}
              tone={copy.tone === "danger" ? "danger" : "warn"}
            >
              {busy ? "Working…" : copy.verb}
            </HoldButton>
          ) : (
            <button
              onClick={submit}
              disabled={!canSave}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              {copy.verb}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
