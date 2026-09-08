"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, SlidersHorizontal, TriangleAlert, X } from "@/components/ui/icons";
import type { CadenceData } from "@/lib/data/cadence";
import type { FleetDefaults } from "@/lib/data/scheduler-config";
import { StatusPill } from "@/components/ui/pill";
import { Stepper } from "@/components/ui/stepper";
import { CtaButton } from "@/components/ui/cta-button";
import { cn } from "@/lib/utils";

/**
 * Adjust posting cadence — the fleet defaults behind every account.
 *
 * Structured as a budget, top to bottom: how often an account may post, then
 * how that week's posts are split between filler and GLP. The per-character
 * GLP mix is the third question and most days is not asked at all, so it lives
 * behind Advanced settings (Garreth 2026-09-06 — the flat form showed fifteen
 * steppers at once and read as a wall).
 *
 * Everything here moves all ~30 accounts. A per-account override still wins.
 */

/** Mirrors MAX_PER_WEEK in /api/cadence — the server's cap on a weekly total. */
const MAX_GLP_PER_WEEK = 70;

export function AdjustCadenceModal({
  cadence,
  fleet,
  onClose,
}: {
  cadence: CadenceData;
  fleet: FleetDefaults;
  onClose: () => void;
}) {
  const router = useRouter();

  const [maxPostsPerDay, setMaxPostsPerDay] = useState(fleet.maxPostsPerDay);
  const [minGap, setMinGap] = useState(fleet.minGapMinutes);
  const [winStart, setWinStart] = useState(fleet.windowStart);
  const [winEnd, setWinEnd] = useState(fleet.windowEnd);
  const [filler, setFiller] = useState(fleet.fillerWeek);
  const [glp, setGlp] = useState(fleet.glpWeek);

  // Keyed by `${character}|${contentType}` — content type alone is not unique
  // across characters in the registry.
  const [mix, setMix] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const c of cadence.characters) {
      for (const l of c.lanes) m[`${c.name}|${l.contentType}`] = l.cadencePerWeek ?? 0;
    }
    return m;
  });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── the budget everything else is spent from ─────────────────────────────
  const weekBudget = maxPostsPerDay * 7;
  const allocated = filler + glp;
  const overBudget = allocated > weekBudget;
  const unspent = weekBudget - allocated;

  const windowMinutes = toMinutes(winEnd) - toMinutes(winStart);
  const needMinutes = (maxPostsPerDay - 1) * minGap;
  const windowInverted = windowMinutes <= 0;
  const windowTooTight = !windowInverted && needMinutes > windowMinutes;

  const sums = cadence.characters.map((c) => ({
    name: c.name,
    sum: c.lanes.reduce((acc, l) => acc + (mix[`${c.name}|${l.contentType}`] ?? 0), 0),
  }));
  const mixBalanced = sums.every((s) => s.sum === glp);

  const canSave = !overBudget && !windowInverted && !windowTooTight && mixBalanced && !busy;

  /** Spread a GLP total across a character's lanes as evenly as the count allows,
   *  so changing GLP/week does not strand the mix in an unsaveable state. */
  function rebalance(nextGlp: number) {
    setMix((prev) => {
      const next = { ...prev };
      for (const c of cadence.characters) {
        const keys = c.lanes.map((l) => `${c.name}|${l.contentType}`);
        if (keys.length === 0) continue;
        const base = Math.floor(nextGlp / keys.length);
        let left = nextGlp - base * keys.length;
        for (const k of keys) {
          next[k] = base + (left > 0 ? 1 : 0);
          if (left > 0) left--;
        }
      }
      return next;
    });
  }

  function changeGlp(v: number) {
    setGlp(v);
    rebalance(v);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const lanes = cadence.characters.flatMap((c) =>
        c.lanes.map((l) => ({
          contentType: l.contentType,
          character: c.name,
          cadencePerWeek: mix[`${c.name}|${l.contentType}`] ?? 0,
        })),
      );
      const res = await fetch("/api/cadence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lanes,
          fillerPerWeek: filler,
          glpPerWeek: glp,
          fleet: {
            maxPostsPerDay,
            minGapMinutes: minGap,
            windowStart: winStart,
            windowEnd: winEnd,
          },
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Adjust posting cadence"
        className="my-auto w-full max-w-2xl rounded-card border border-border glass-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <SlidersHorizontal className="size-4" />
            </span>
            <h2 className="text-base font-semibold">Adjust posting cadence</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          <p className="border-b border-border px-6 py-3 text-xs text-text-muted">
            Applies to every account. A per-account override always wins.
          </p>

          {fleet.divergent && (
            <p className="flex items-start gap-2 border-b border-border bg-warn/5 px-6 py-3 text-xs text-warn">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              The GLP and filler rows currently disagree on the shared settings. The scheduler takes
              the higher of the two, which is what is shown; saving writes one value to both.
            </p>
          )}

          {/* ── 1. how often an account may post ─────────────────────────── */}
          <Section title="Scheduler defaults">
            <div className="grid gap-3 sm:grid-cols-2">
              <Stepper
                label="Max posts / day"
                value={maxPostsPerDay}
                onChange={setMaxPostsPerDay}
                min={1}
                max={12}
              />
              <Stepper
                label="Minimum gap"
                value={minGap}
                onChange={setMinGap}
                min={0}
                max={720}
                step={15}
                suffix="min"
              />
              <TimeField label="Window opens (ET)" value={winStart} onChange={setWinStart} />
              <TimeField label="Window closes (ET)" value={winEnd} onChange={setWinEnd} />
            </div>
            {windowInverted && (
              <p className="mt-3 text-xs text-danger">The window has to close after it opens.</p>
            )}
            {windowTooTight && (
              <p className="mt-3 text-xs text-danger">
                {maxPostsPerDay} posts {minGap} minutes apart need {fmtDur(needMinutes)}, but{" "}
                {winStart}–{winEnd} is only {fmtDur(windowMinutes)}. Every day would fall short.
              </p>
            )}
          </Section>

          {/* ── 2 + 3. how that week is spent ────────────────────────────── */}
          <Section
            title="Weekly split"
            aside={
              <StatusPill tone={overBudget ? "danger" : unspent > 0 ? "warn" : "ok"}>
                {allocated} / {weekBudget} per week
              </StatusPill>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Stepper
                label="Filler"
                value={filler}
                onChange={setFiller}
                min={0}
                // Cannot push the pair past the budget: the + stops here.
                max={Math.max(0, weekBudget - glp)}
                suffix="/wk"
              />
              <Stepper
                label="GLP"
                value={glp}
                onChange={changeGlp}
                min={0}
                // Same rule as filler: whatever the day cap leaves. This used to
                // be min(10, …), which borrowed MAX_LANE_PER_WEEK — the ceiling
                // on a single content type — and applied it to the weekly total.
                // The server's limit on the total is MAX_PER_WEEK, and there was
                // never a rule that GLP could not exceed 10 a week. It only
                // showed up once the day cap moved to 2 and the remaining budget
                // was 11 (Garreth 2026-09-08).
                max={Math.min(MAX_GLP_PER_WEEK, Math.max(0, weekBudget - filler))}
                suffix="/wk"
              />
            </div>

            {overBudget ? (
              <p className="mt-3 text-xs text-danger">
                {allocated} posts a week is more than {maxPostsPerDay} a day allows ({weekBudget}).
                Lower one of them, or raise max posts / day.
              </p>
            ) : unspent > 0 ? (
              <p className="mt-3 text-xs text-danger">
                Only {allocated} of the {weekBudget} weekly posts are allocated. Each account will
                sit idle for {unspent} {unspent === 1 ? "slot" : "slots"} a week. Raise filler or
                GLP to use the full allowance, or lower max posts / day.
              </p>
            ) : (
              <p className="mt-3 text-xs text-text-muted">
                Every slot allocated: {filler} filler and {glp} GLP a week, per account.
              </p>
            )}
          </Section>

          {/* ── advanced: which GLP lanes make up that number ────────────── */}
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-bg/40"
            >
              <span>
                <span className="text-sm font-semibold">Advanced settings</span>
                <span className="ml-2 text-xs text-text-muted">
                  which GLP content types make up the {glp} a week
                </span>
              </span>
              <span className="flex items-center gap-2">
                {!mixBalanced && (
                  <StatusPill tone="danger">
                    needs attention
                  </StatusPill>
                )}
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-text-muted transition-transform",
                    advancedOpen && "rotate-180",
                  )}
                />
              </span>
            </button>

            {advancedOpen && (
              <div className="flex flex-col gap-6 px-6 pb-6">
                <p className="text-xs text-text-muted">
                  Each character&rsquo;s lanes have to add up to {glp}.
                </p>
                {cadence.characters.map((c) => {
                  const sum = sums.find((s) => s.name === c.name)?.sum ?? 0;
                  return (
                    <div key={c.name}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold">{c.name}</h4>
                        <StatusPill tone={sum === glp ? "ok" : "danger"}>
                          {sum} / {glp}
                        </StatusPill>
                        {sum !== glp && (
                          <span className="text-xs text-danger">
                            {sum > glp
                              ? `${sum - glp} too many`
                              : `${glp - sum} left to place`}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {c.lanes.map((l) => {
                          const key = `${c.name}|${l.contentType}`;
                          return (
                            <Stepper
                              key={key}
                              label={l.contentType.replace(/_/g, " ")}
                              hint={l.poolNow === 0 ? "pool empty" : `${l.poolNow} ready`}
                              hintTone={l.poolNow === 0 ? "danger" : "muted"}
                              value={mix[key] ?? 0}
                              onChange={(v) => setMix((prev) => ({ ...prev, [key]: v }))}
                              min={0}
                              max={10}
                              suffix="/wk"
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
          <CtaButton
            onClick={save}
            disabled={!canSave}
            title={
              !mixBalanced
                ? `Open Advanced settings, every character has to add up to ${glp}`
                : overBudget
                  ? "Filler + GLP is over the weekly budget"
                  : undefined
            }
                      >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Save for all accounts
          </CtaButton>
        </div>
      </div>
    </div>
  );
}

/** A titled block with a hairline above it — the separations Garreth asked for. */
function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border px-6 py-5 first:border-t-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function fmtDur(min: number): string {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return h === 0 ? `${m}m` : m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <span className="mb-1 block text-xs text-text-muted">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-nested border border-border bg-bg/60 px-2 py-1.5 text-sm outline-none tnum focus:border-accent"
      />
    </div>
  );
}
