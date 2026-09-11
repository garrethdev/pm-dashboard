"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, SlidersHorizontal, TriangleAlert, X } from "@/components/ui/icons";
import { resolveCharacterCaps, type CadenceData } from "@/lib/data/cadence";
import { unbalancedCharacters } from "@/lib/data/cadence-rules";
import type { FleetDefaults } from "@/lib/data/scheduler-config";
import { StatusPill } from "@/components/ui/pill";
import { Stepper } from "@/components/ui/stepper";
import { CtaButton } from "@/components/ui/cta-button";
import { FilterPills } from "@/components/ui/filter-pills";
import { cn } from "@/lib/utils";

/**
 * Adjust posting cadence — at the fleet level, or for one character.
 *
 * Structured as a budget, top to bottom: how often an account may post, then
 * how that week's posts are split between filler and GLP. The per-character
 * GLP mix is the third question and most days is not asked at all, so it lives
 * behind Advanced settings (Garreth 2026-09-06 — the flat form showed fifteen
 * steppers at once and read as a wall).
 *
 * The scope picker was added 2026-09-10, when Character 5 became the first
 * character to sit off the fleet default (7 GLP a week against 11, and no
 * filler lane). The rule that keeps it honest:
 *
 *   INHERITED IS NOT THE SAME AS "equal to the fleet number".
 *
 * A character with no override row follows the fleet, so changing one fleet
 * number still moves everyone who has not been deliberately singled out. If
 * this modal wrote a row for every character it touched, that would be gone
 * for good and every future change would be four edits that quietly drift.
 * So a field is written only when it is explicitly overridden, and clearing it
 * deletes the row rather than freezing today's number in place.
 */

/** Mirrors MAX_PER_WEEK in /api/cadence — the server's cap on a weekly total. */
const MAX_GLP_PER_WEEK = 70;

/** Sentinel for the fleet tab. A character can never be named this, so it
 *  cannot collide with a real scope key. */
const FLEET_SCOPE = "__fleet__";

type Scope = { kind: "fleet" } | { kind: "character"; name: string };

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

  const [scope, setScope] = useState<Scope>({ kind: "fleet" });

  // ── fleet-scope fields ───────────────────────────────────────────────────
  const [maxPostsPerDay, setMaxPostsPerDay] = useState(fleet.maxPostsPerDay);
  const [minGap, setMinGap] = useState(fleet.minGapMinutes);
  const [winStart, setWinStart] = useState(fleet.windowStart);
  const [winEnd, setWinEnd] = useState(fleet.windowEnd);
  const [filler, setFiller] = useState(fleet.fillerWeek);
  const [glp, setGlp] = useState(fleet.glpWeek);

  // ── character-scope fields. null = inherit the fleet default ─────────────
  const [charOverrides, setCharOverrides] = useState(() => {
    const m: Record<string, { maxPostsPerDay: number | null; glp: number | null; filler: number | null }> = {};
    for (const c of cadence.characters) {
      m[c.name] = {
        maxPostsPerDay: c.override.maxPostsPerDay,
        glp: c.override.glpWeekCap,
        filler: c.override.fillerWeekCap,
      };
    }
    return m;
  });

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

  const charScope = scope.kind === "character" ? scope.name : null;
  const active = charScope ? charOverrides[charScope] : null;

  /** What a character's mix has to add up to. In fleet scope that is the fleet
   *  number being edited, unless the character overrides it — an overridden
   *  character does not move when the fleet does. */
  function glpTargetFor(name: string): number {
    const own = charOverrides[name]?.glp ?? null;
    return own ?? glp;
  }

  const laneSum = (name: string) =>
    (cadence.characters.find((c) => c.name === name)?.lanes ?? []).reduce(
      (acc, l) => acc + (mix[`${name}|${l.contentType}`] ?? 0),
      0,
    );

  // ── the budget everything else is spent from ─────────────────────────────
  // In character scope the fleet numbers are the SAVED ones, not whatever is in
  // the fleet fields above: saving a character never writes scheduler_buckets.
  const effective = active
    ? resolveCharacterCaps(
        { maxPostsPerDay: active.maxPostsPerDay, glpWeekCap: active.glp, fillerWeekCap: active.filler },
        { maxPostsPerDay: fleet.maxPostsPerDay, glpWeek: fleet.glpWeek, fillerWeek: fleet.fillerWeek },
      )
    : { maxPostsPerDay, glpWeek: glp, fillerWeek: filler };

  const weekBudget = effective.maxPostsPerDay * 7;
  const allocated = effective.fillerWeek + effective.glpWeek;
  const overBudget = allocated > weekBudget;
  const unspent = weekBudget - allocated;

  const windowMinutes = toMinutes(winEnd) - toMinutes(winStart);
  const needMinutes = (maxPostsPerDay - 1) * minGap;
  const windowInverted = scope.kind === "fleet" && windowMinutes <= 0;
  const windowTooTight = scope.kind === "fleet" && !windowInverted && needMinutes > windowMinutes;

  /**
   * Every character whose lane mix does not add up to its own weekly allowance.
   *
   * This is the state that locked the editor on 2026-09-11: `cleora_asmr` was
   * switched on in the database, which added 7 a week to Character 5's lanes
   * while its allowance still read 7 — and the Fleet tab checks EVERY character
   * before it will save anything, so a problem on one character stopped every
   * cadence change for every character and for the fleet. The Save button went
   * grey and named no culprit, so finding it meant opening Advanced settings and
   * reading down all four characters looking for the mismatched pair.
   *
   * Every new lane arrives exactly this way — content made, lane wired and
   * switched on in the database, allowance raised afterwards, sometimes days
   * later and by someone else — so this recurs by design. Hence the list rather
   * than a bare boolean: the banner below needs to be able to NAME the character
   * and offer the fix.
   */
  const unbalanced = unbalancedCharacters(
    cadence.characters.map((c) => ({ name: c.name, laneSum: laneSum(c.name) })),
    // In character scope the allowance is the one being edited in this form,
    // which may not be saved yet; on the Fleet tab it is each character's own.
    (name) => (charScope ? effective.glpWeek : glpTargetFor(name)),
    charScope,
  );

  const mixBalanced = unbalanced.length === 0;

  /** How high the GLP allowance can go in this scope — the same bound as the GLP
   *  stepper's `max`, so the banner can tell the difference between "click here
   *  to fix it" and "the day cap is in the way, raise that first". */
  const glpRoom = Math.min(MAX_GLP_PER_WEEK, Math.max(0, weekBudget - effective.fillerWeek));

  /**
   * Why the GLP + button has stopped, shown only when it actually has.
   *
   * The weekly steppers are bounded by `maxPostsPerDay * 7`, so raising GLP past
   * that is impossible until the day cap moves first — and the + simply went
   * dead with nothing on screen saying so. Garreth hit this on 2026-09-12 taking
   * Character 5 from 7 a week to 14: at 1 post a day the ceiling was 7, and the
   * only way to discover the order was to be told it.
   *
   * Deliberately silent when the 70-a-week hard cap is the binding one instead —
   * blaming the day cap there would be wrong — and when the field is inheriting,
   * because then there is no stepper and no dead button to explain.
   */
  const glpShown = charScope ? active!.glp : glp;
  const glpCeilingHint =
    glpShown !== null && glpShown >= glpRoom && glpRoom < MAX_GLP_PER_WEEK
      ? `max for ${effective.maxPostsPerDay} post${effective.maxPostsPerDay === 1 ? "" : "s"}/day`
      : undefined;

  // Both buckets on zero is not a cadence, it is an off switch: every account
  // under this scope would sit idle indefinitely with nothing on screen saying
  // so afterwards. Under-allocating on ONE bucket stays allowed — Character 5
  // deliberately runs filler 0 — so this only blocks the pair.
  const nothingAllocated = effective.fillerWeek === 0 && effective.glpWeek === 0;

  const canSave =
    !overBudget && !windowInverted && !windowTooTight && mixBalanced && !nothingAllocated && !busy;

  /** Spread a GLP total across a character's lanes as evenly as the count allows,
   *  so changing GLP/week does not strand the mix in an unsaveable state. */
  function rebalance(name: string, total: number) {
    setMix((prev) => {
      const next = { ...prev };
      const lanes = cadence.characters.find((c) => c.name === name)?.lanes ?? [];
      if (lanes.length === 0) return prev;
      const base = Math.floor(total / lanes.length);
      let left = total - base * lanes.length;
      for (const l of lanes) {
        next[`${name}|${l.contentType}`] = base + (left > 0 ? 1 : 0);
        if (left > 0) left--;
      }
      return next;
    });
  }

  /** Fleet GLP moved: rebalance only the characters that follow the fleet. One
   *  that overrides its cap keeps its own mix — that is what overriding means. */
  function changeFleetGlp(v: number) {
    setGlp(v);
    for (const c of cadence.characters) {
      if ((charOverrides[c.name]?.glp ?? null) === null) rebalance(c.name, v);
    }
  }

  function setCharField(field: "maxPostsPerDay" | "glp" | "filler", value: number | null) {
    if (!charScope) return;
    setCharOverrides((prev) => ({ ...prev, [charScope]: { ...prev[charScope]!, [field]: value } }));
    if (field === "glp") rebalance(charScope, value ?? fleet.glpWeek);
  }

  /**
   * Move the allowance up to whatever the lanes already add up to.
   *
   * Deliberately NOT `setCharField("glp", …)`: that rebalances the mix, which
   * spreads the new total evenly and throws away the split the lanes are already
   * carrying — a deliberate 10 + 4 would come back as 7 + 7. When a lane has
   * just been switched on, the lanes ARE the intent and the allowance is the
   * number that is behind, so the mix must be left exactly as it is.
   */
  function matchAllowanceToLanes(total: number) {
    if (!charScope) return;
    setCharOverrides((prev) => ({ ...prev, [charScope]: { ...prev[charScope]!, glp: total } }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const body = charScope
        ? {
            character: charScope,
            maxPostsPerDay: active!.maxPostsPerDay,
            glpPerWeek: active!.glp,
            fillerPerWeek: active!.filler,
            lanes: (cadence.characters.find((c) => c.name === charScope)?.lanes ?? []).map((l) => ({
              contentType: l.contentType,
              character: charScope,
              cadencePerWeek: mix[`${charScope}|${l.contentType}`] ?? 0,
            })),
          }
        : {
            lanes: cadence.characters.flatMap((c) =>
              c.lanes.map((l) => ({
                contentType: l.contentType,
                character: c.name,
                cadencePerWeek: mix[`${c.name}|${l.contentType}`] ?? 0,
              })),
            ),
            fillerPerWeek: filler,
            glpPerWeek: glp,
            fleet: {
              maxPostsPerDay,
              minGapMinutes: minGap,
              windowStart: winStart,
              windowEnd: winEnd,
            },
          };

      const res = await fetch("/api/cadence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const overriddenNames = cadence.characters
    .filter((c) => {
      const o = charOverrides[c.name];
      return o && (o.maxPostsPerDay !== null || o.glp !== null || o.filler !== null);
    })
    .map((c) => c.name);

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

        {/* ── which layer is being edited ─────────────────────────────────── */}
        {/* The same segmented control the Accounts and Analytics filters use,
            rather than a pill row of this modal's own. A dotted pill is a
            character already sitting off the fleet, so a fleet change will not
            move it. */}
        <div className="border-b border-border px-6 py-3">
          <FilterPills
            value={scope.kind === "fleet" ? FLEET_SCOPE : scope.name}
            onChange={(v) =>
              setScope(v === FLEET_SCOPE ? { kind: "fleet" } : { kind: "character", name: v })
            }
            options={[
              { value: FLEET_SCOPE, label: "Fleet default" },
              ...cadence.characters.map((c) => ({
                value: c.name,
                label: c.name.replace("Character ", "Char "),
                marked: overriddenNames.includes(c.name),
              })),
            ]}
          />
        </div>

        <div className="max-h-[70vh] overflow-y-auto">
          {/* ── a character's lanes do not add up to its allowance ─────────────
              Shown in BOTH scopes, because the character at fault is usually not
              the tab you are on: the Fleet tab is where the locked Save button
              appears, and the fix is always on a character tab. Naming the
              character is the whole point — see `unbalanced` above. */}
          {unbalanced.length > 0 && (
            <div className="border-b border-border bg-danger/5 px-6 py-3">
              <p className="flex items-start gap-2 text-xs text-danger">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  {unbalanced.length === 1 ? (
                    <>
                      <span className="font-semibold">{unbalanced[0]!.name}</span>&rsquo;s lanes add up
                      to {unbalanced[0]!.sum} a week, but its allowance is {unbalanced[0]!.target}.
                      Nothing can be saved until the two match.
                    </>
                  ) : (
                    <>
                      {unbalanced.length} characters have lanes that do not add up to their weekly
                      allowance. Nothing can be saved until they match.
                    </>
                  )}
                </span>
              </p>
              {/* Indented to the text, not the icon: 0.875rem icon + 0.5rem gap. */}
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 pl-[1.375rem]">
                {charScope ? (
                  unbalanced[0]!.sum <= glpRoom ? (
                    <>
                      <button
                        type="button"
                        onClick={() => matchAllowanceToLanes(unbalanced[0]!.sum)}
                        className="rounded-full border border-danger/40 px-2.5 py-1 text-[11px] font-medium text-danger hover:bg-danger/10"
                      >
                        Set allowance to {unbalanced[0]!.sum}
                      </button>
                      <span className="text-[11px] text-text-muted">
                        or change the lane numbers in Advanced settings
                      </span>
                    </>
                  ) : (
                    /* The day cap is the blocker, not the allowance. Without this
                       the GLP stepper simply stops at its max with nothing saying
                       why — the dead end Garreth hit on 2026-09-12, when
                       Character 5 sat at 1 post a day and 14 could not be
                       reached until the day cap moved first. */
                    <span className="text-[11px] text-text-muted">
                      An allowance of {unbalanced[0]!.sum} a week needs at least{" "}
                      {Math.ceil((unbalanced[0]!.sum + effective.fillerWeek) / 7)} posts a day —{" "}
                      {effective.maxPostsPerDay} a day allows only {glpRoom}. Raise{" "}
                      <span className="font-medium">Max posts / day</span> above first.
                    </span>
                  )
                ) : (
                  unbalanced.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setScope({ kind: "character", name: c.name })}
                      className="rounded-full border border-danger/40 px-2.5 py-1 text-[11px] font-medium text-danger hover:bg-danger/10"
                    >
                      Open {c.name.replace("Character ", "Char ")} — {c.sum} of {c.target}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {fleet.divergent && scope.kind === "fleet" && (
            <p className="flex items-start gap-2 border-b border-border bg-warn/5 px-6 py-3 text-xs text-warn">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              The GLP and filler rows currently disagree on the shared settings. The scheduler takes
              the higher of the two, which is what is shown; saving writes one value to both.
            </p>
          )}

          {/* ── 1. how often an account may post ─────────────────────────── */}
          <Section title="Scheduler defaults">
            {charScope ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <OverridableStepper
                  label="Max posts / day"
                  value={active!.maxPostsPerDay}
                  fleetValue={fleet.maxPostsPerDay}
                  onChange={(v) => setCharField("maxPostsPerDay", v)}
                  min={1}
                  max={12}
                />
                <p className="self-end text-xs text-text-muted">
                  Minimum gap and the posting window are fleet-wide — switch to{" "}
                  <button
                    type="button"
                    className="text-accent underline underline-offset-2"
                    onClick={() => setScope({ kind: "fleet" })}
                  >
                    Fleet default
                  </button>{" "}
                  to change them.
                </p>
              </div>
            ) : (
              <>
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
              </>
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
              {charScope ? (
                <>
                  <OverridableStepper
                    label="Filler"
                    value={active!.filler}
                    fleetValue={fleet.fillerWeek}
                    onChange={(v) => setCharField("filler", v)}
                    min={0}
                    max={Math.max(0, weekBudget - effective.glpWeek)}
                    suffix="/wk"
                    zeroNote="no filler lane"
                  />
                  <OverridableStepper
                    label="GLP"
                    value={active!.glp}
                    fleetValue={fleet.glpWeek}
                    onChange={(v) => setCharField("glp", v)}
                    min={0}
                    max={glpRoom}
                    suffix="/wk"
                    hint={glpCeilingHint}
                  />
                </>
              ) : (
                <>
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
                    onChange={changeFleetGlp}
                    min={0}
                    // Same rule as filler: whatever the day cap leaves. This used to
                    // be min(10, …), which borrowed MAX_LANE_PER_WEEK — the ceiling
                    // on a single content type — and applied it to the weekly total.
                    // The server's limit on the total is MAX_PER_WEEK, and there was
                    // never a rule that GLP could not exceed 10 a week. It only
                    // showed up once the day cap moved to 2 and the remaining budget
                    // was 11 (Garreth 2026-09-08).
                    max={glpRoom}
                    suffix="/wk"
                    hint={glpCeilingHint}
                  />
                </>
              )}
            </div>

            {overBudget ? (
              <p className="mt-3 text-xs text-danger">
                {allocated} posts a week is more than {effective.maxPostsPerDay} a day allows (
                {weekBudget}). Lower one of them, or raise max posts / day.
              </p>
            ) : nothingAllocated ? (
              <p className="mt-3 text-xs text-danger">
                Filler and GLP are both 0, so nothing would ever be posted. This cannot be saved —
                raise one of them, or use the posting switch on an account to pause it instead.
              </p>
            ) : unspent > 0 ? (
              <p className="mt-3 text-xs text-danger">
                Only {allocated} of the {weekBudget} weekly posts are allocated. Each account will
                sit idle for {unspent} {unspent === 1 ? "slot" : "slots"} a week. Raise filler or
                GLP to use the full allowance, or lower max posts / day.
              </p>
            ) : null}
            {/* Nothing is said when the split adds up. The badge beside the
                section title already carries the state — "14 / 14 per week" in
                green — so a sentence restating it is one more thing to read on
                the screen you are on most often. Copy here is reserved for the
                two cases that need a decision: over budget, or slots left
                idle (Garreth 2026-09-11). */}
          </Section>

          {/* ── advanced: which GLP lanes make up that number ────────────── */}
          <div className="border-t border-border">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
              className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left hover:bg-bg/40"
            >
              <span className="text-sm font-semibold">Advanced settings</span>
              <span className="flex items-center gap-2">
                {!mixBalanced && <StatusPill tone="danger">needs attention</StatusPill>}
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
                {(charScope
                  ? cadence.characters.filter((c) => c.name === charScope)
                  : cadence.characters
                ).map((c) => {
                  const target = charScope ? effective.glpWeek : glpTargetFor(c.name);
                  const sum = laneSum(c.name);
                  const ownCap = (charOverrides[c.name]?.glp ?? null) !== null;
                  return (
                    <div key={c.name}>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold">{c.name}</h4>
                        <StatusPill tone={sum === target ? "ok" : "danger"}>
                          {sum} / {target}
                        </StatusPill>
                        {ownCap && !charScope && (
                          <span className="text-xs text-text-muted">own cadence</span>
                        )}
                        {sum !== target && (
                          <span className="text-xs text-danger">
                            {sum > target ? `${sum - target} too many` : `${target - sum} left to place`}
                          </span>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {c.lanes.map((l) => {
                          const key = `${c.name}|${l.contentType}`;
                          return (
                            <Stepper
                              key={key}
                              label={l.displayName}
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
                ? unbalanced.length === 1
                  ? `${unbalanced[0]!.name}'s lanes add up to ${unbalanced[0]!.sum} a week, not ${unbalanced[0]!.target}`
                  : `${unbalanced.length} characters' lanes do not add up to their allowance`
                : overBudget
                  ? "Filler + GLP is over the weekly budget"
                  : undefined
            }
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {charScope ? `Save for ${charScope.replace("Character ", "Char ")}` : "Save for all accounts"}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}


/**
 * A number that either follows the fleet or does not.
 *
 * The two states are kept visually distinct on purpose: "inherited" has to read
 * as a live link to the fleet value, not as a number that happens to match it,
 * because clearing an override is how a character is put back under the fleet.
 */
function OverridableStepper({
  label,
  value,
  fleetValue,
  onChange,
  min,
  max,
  suffix,
  zeroNote,
  hint,
}: {
  label: string;
  /** null = inherit the fleet default. */
  value: number | null;
  fleetValue: number;
  onChange: (v: number | null) => void;
  min: number;
  max: number;
  suffix?: string;
  zeroNote?: string;
  /** Shown above the stepper, right-aligned. Costs no vertical space: the inner
   *  Stepper always renders that row, and with `label=""` it sits empty. */
  hint?: string;
}) {
  const inherited = value === null;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-xs text-text-muted">{label}</span>
        <button
          type="button"
          onClick={() => onChange(inherited ? fleetValue : null)}
          className="shrink-0 text-[11px] text-accent underline underline-offset-2 hover:opacity-80"
        >
          {inherited ? "Override" : "Use fleet default"}
        </button>
      </div>
      {inherited ? (
        <div className="flex items-center justify-between gap-2 rounded-nested border border-dashed border-border bg-bg/30 px-3 py-1.5">
          <span className="text-sm tnum text-text-muted">
            {fleetValue}
            {suffix ? ` ${suffix}` : ""}
          </span>
          <span className="text-[11px] text-text-muted">fleet default</span>
        </div>
      ) : (
        <>
          <Stepper
            label=""
            value={value}
            onChange={(v) => onChange(v)}
            min={min}
            max={max}
            suffix={suffix}
            hint={hint}
          />
          {value === 0 && zeroNote && (
            <p className="mt-1 text-[11px] text-text-muted">{zeroNote}</p>
          )}
        </>
      )}
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
