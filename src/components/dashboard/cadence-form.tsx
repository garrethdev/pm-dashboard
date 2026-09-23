"use client";

import { useState } from "react";
import { Minus, Plus, ShieldAlert } from "@/components/ui/icons";
import type { AccountOverride, ContentTypeOption, EffectiveConfig } from "@/lib/data/scheduler-overrides";
import { cn } from "@/lib/utils";

/**
 * An account's custom cadence: the form and every check on it.
 *
 * Lifted out of the Posting window (P14, 2026-09-23) so Edit account on the
 * Physical side uses the very same fields and warnings rather than a copy
 * that could drift. The markup and the arithmetic are exactly what the
 * Posting window had; that window renders them unchanged.
 */

export interface CadenceInput {
  override: AccountOverride | null;
  /** Absent when the account is paused: a paused account has no caps. */
  effective: EffectiveConfig | null;
  options: ContentTypeOption[];
  /** Whether posting is switched off in the window around the form. */
  paused: boolean;
}

export function useCadenceForm({ override, effective, options, paused }: CadenceInput) {
  const [enabled, setEnabled] = useState(override?.active ?? false);
  const [perDay, setPerDay] = useState<string>(numToField(override?.maxPostsPerDay));
  const [glpWeek, setGlpWeek] = useState<string>(numToField(override?.glpWeekCap));
  const [fillerWeek, setFillerWeek] = useState<string>(numToField(override?.fillerWeekCap));
  const [bypass, setBypass] = useState(override?.bypassGuards ?? false);
  const [types, setTypes] = useState<Set<string>>(
    new Set(override?.onlyContentTypes ?? options.map((o) => o.contentType)),
  );

  const allSelected = types.size === options.length;

  function toggleType(ct: string) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(ct)) next.delete(ct);
      else next.add(ct);
      return next;
    });
  }

  const fieldsLive = !paused && enabled;
  // A guard caps how HIGH posts/day can go; it never stops you going lower.
  // So only the increase direction is blocked, and only while bypass is off.
  const dayCeiling = bypass ? null : (effective?.guardDayCap ?? null);
  // A weekly cap above (posts/day x 7) is unreachable arithmetic, not a setting:
  // at 1/day the account can post at most 7 times a week, so GLP + filler must
  // fit inside that. The scheduler would silently plan the smaller number, so
  // the fields are bounded here instead of accepting a figure it will ignore.
  // What each field is SHOWING, which is not always what it is holding.
  //
  // With Custom Cadence off the fields go blank so their placeholders — the
  // fleet/character defaults — show through, and every number derived below
  // has to follow, or the warnings underneath would describe a set of caps
  // that is not in force. Blank also feeds the `?? effective` fallbacks below,
  // so "off" resolves to the defaults everywhere by construction.
  //
  // The state itself is untouched: flipping the toggle back on brings the
  // typed values straight back.
  const perDayField = enabled ? perDay : "";
  const glpField = enabled ? glpWeek : "";
  const fillerField = enabled ? fillerWeek : "";

  const effDay = perDayField.trim() === ""
    ? (effective?.maxPostsPerDay ?? null)
    : Number(perDayField);
  const weekCeiling = effDay === null || !Number.isFinite(effDay) ? null : effDay * 7;
  const glpNow = glpField.trim() === "" ? (effective?.glpWeekCap ?? 0) : Number(glpField);
  const fillerNow = fillerField.trim() === "" ? (effective?.fillerWeekCap ?? 0) : Number(fillerField);
  // Each weekly field is bounded by the week's total minus what the other one
  // already claims, so the pair can never sum past the ceiling.
  const glpMax = weekCeiling === null ? null : Math.max(0, weekCeiling - fillerNow);
  const fillerMax = weekCeiling === null ? null : Math.max(0, weekCeiling - glpNow);
  // Both steppers stop at the ceiling, so over-allocation cannot be reached by
  // raising GLP or filler. It is very much reachable from the other direction:
  // LOWERING posts/day shrinks the ceiling underneath a pair that was already
  // set, and the steppers have no say in that. Dropping posts/day to 1 while
  // GLP and filler sit on the inherited 11 and 3 asks for 14 posts in 7 slots.
  // So both directions are flagged, and the over case blocks the save.
  const weekUnspent = weekCeiling === null ? null : weekCeiling - (glpNow + fillerNow);
  const weekOver = weekUnspent !== null && weekUnspent < 0 ? -weekUnspent : null;
  // An empty pool only strands the account when EVERY selected type is empty.
  // With anything else still stocked the scheduler simply picks from what is
  // there, so a partially dry selection is information, not a problem.
  const emptyPicked = [...types].filter(
    (ct) => (options.find((o) => o.contentType === ct)?.poolN ?? 0) === 0,
  );
  const allPickedEmpty = types.size > 0 && emptyPicked.length === types.size;
  const emptyNames = emptyPicked
    .map((ct) => options.find((o) => o.contentType === ct)?.displayName ?? ct)
    .join(", ");

  return {
    enabled,
    setEnabled,
    perDay,
    setPerDay,
    glpWeek,
    setGlpWeek,
    fillerWeek,
    setFillerWeek,
    bypass,
    setBypass,
    types,
    setTypes,
    toggleType,
    allSelected,
    fieldsLive,
    perDayField,
    glpField,
    fillerField,
    effDay,
    weekCeiling,
    glpNow,
    fillerNow,
    glpMax,
    fillerMax,
    weekUnspent,
    weekOver,
    dayCeiling,
    emptyPicked,
    allPickedEmpty,
    emptyNames,
    /** A save the scheduler could not honour: nothing picked, or more a week
     *  than the day's cap allows. */
    blocked: fieldsLive && (types.size === 0 || weekOver !== null),
    /** What `/api/accounts/scheduler-override` takes, less the profile. */
    payload: () => ({
      enabled,
      maxPostsPerDay: fieldToNum(perDay),
      glpWeekCap: fieldToNum(glpWeek),
      fillerWeekCap: fieldToNum(fillerWeek),
      onlyContentTypes: allSelected ? null : [...types],
      bypassGuards: bypass,
    }),
  };
}

export type CadenceForm = ReturnType<typeof useCadenceForm>;

/** The form itself: Custom Cadence, the three caps, content types, bypass. */
export function CadenceFields({
  form,
  options,
  effective,
  paused,
  busy,
}: {
  form: CadenceForm;
  options: ContentTypeOption[];
  effective: EffectiveConfig | null;
  paused: boolean;
  busy: boolean;
}) {
  const {
    enabled,
    setEnabled,
    setPerDay,
    setGlpWeek,
    setFillerWeek,
    bypass,
    setBypass,
    types,
    setTypes,
    toggleType,
    allSelected,
    fieldsLive,
    perDayField,
    glpField,
    fillerField,
    effDay,
    weekCeiling,
    glpNow,
    fillerNow,
    glpMax,
    fillerMax,
    weekUnspent,
    weekOver,
    dayCeiling,
    emptyPicked,
    allPickedEmpty,
    emptyNames,
  } = form;

  return (
    <>
    {/* Custom Cadence */}
    <div className={cn("mt-5", paused && "pointer-events-none opacity-45")}>
      <label className="flex cursor-pointer items-center justify-between rounded-nested border border-border px-3.5 py-3">
        <span>
          <span className="text-sm font-medium">Custom Cadence</span>
          {/* Nothing is said in the off state. "Using defaults" restated
              what the switch already showed, and — until the fields were
              fixed to blank themselves — sat directly above the
              switched-off custom numbers, which is how it came to be read
              as a claim about them (Garreth 2026-09-11). */}
          {enabled && (
            <span className="mt-0.5 block text-xs text-text-muted">
              This account ignores the fleet defaults
            </span>
          )}
        </span>
        <Toggle checked={enabled} onChange={setEnabled} disabled={busy || paused} />
      </label>

      {/* These used to show the custom values dimmed while the toggle was
          off. Dimming reads as "disabled", not as "these do not apply", so
          a card headed "Using defaults" sat directly above 1 / 6 / 1 while
          the scheduler was really running the account at 2 a day. */}
      <div className={cn("mt-5 space-y-6", !fieldsLive && "pointer-events-none opacity-45")}>
        <div className="grid grid-cols-3 gap-3">
          <NumField
            label="Max posts / day"
            value={perDayField}
            onChange={setPerDay}
            placeholder={effective ? String(effective.maxPostsPerDay) : "—"}
            max={dayCeiling}
            min={1}
          />
          <NumField
            label="GLP / week"
            value={glpField}
            onChange={setGlpWeek}
            placeholder={effective ? String(effective.glpWeekCap) : "—"}
            max={glpMax}
          />
          <NumField
            label="Filler / week"
            value={fillerField}
            onChange={setFillerWeek}
            placeholder={effective ? String(effective.fillerWeekCap) : "—"}
            max={fillerMax}
          />
        </div>
        {/* The ceiling needs no explaining — the + button stops at it. What
            does need saying is the opposite case: caps that add up to LESS
            than the account is allowed leave it idle, and nothing else on
            this screen would tell you (Garreth 2026-09-06). */}
        {weekOver !== null && (
          <p className="text-xs text-danger">
            GLP + filler come to <span className="tnum font-semibold">{glpNow + fillerNow}</span>{" "}
            a week, but at {effDay}/day this account can post at most{" "}
            <span className="tnum font-semibold">{weekCeiling}</span> times. That is{" "}
            <span className="tnum font-semibold">{weekOver}</span> too many, so the scheduler
            would quietly plan the smaller number. Raise posts/day, or lower GLP or filler.
          </p>
        )}

        {weekUnspent !== null && weekUnspent > 0 && (
          <p className="text-xs text-danger">
            GLP + filler come to <span className="tnum font-semibold">{glpNow + fillerNow}</span>{" "}
            a week, but at {effDay}/day this account is allowed{" "}
            <span className="tnum font-semibold">{weekCeiling}</span>. It will sit idle for{" "}
            <span className="tnum">{weekUnspent}</span>{" "}
            {weekUnspent === 1 ? "slot" : "slots"} a week. Raise GLP or filler to use the full
            allowance.
          </p>
        )}

        {dayCeiling !== null && (
          <p className="text-xs text-warn">
            This account is throttled. Posts/day above{" "}
            <span className="tnum font-semibold">{dayCeiling}</span> is not possible. To force a
            higher daily number, turn on “Ignore automatic throttling” below.
          </p>
        )}

        {/* Content types — always a subset of the character's own list. */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Content types</span>
            <button
              type="button"
              onClick={() =>
                setTypes(allSelected ? new Set() : new Set(options.map((o) => o.contentType)))
              }
              className="text-xs text-accent hover:underline"
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
          <div className="grid gap-1.5">
            {options.map((o) => {
              const on = types.has(o.contentType);
              return (
                <label
                  key={o.contentType}
                  className={cn(
                    "flex cursor-pointer items-center justify-between rounded-nested border px-3 py-2 text-sm transition-colors",
                    on ? "border-accent/40 bg-accent-soft/40" : "border-border hover:bg-card-raised/60",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleType(o.contentType)}
                      className="size-3.5 accent-[var(--accent)]"
                    />
                    {o.displayName}
                  </span>
                  {/* Pool depth: pinning an account to an empty pool posts nothing. */}
                  <span
                    className={cn(
                      "tnum text-xs",
                      o.poolN === 0 ? "text-danger" : o.poolN < 5 ? "text-warn" : "text-text-muted",
                    )}
                  >
                    {o.poolN} ready
                  </span>
                </label>
              );
            })}
          </div>
          {emptyPicked.length > 0 && (
            <p className={cn("mt-2 text-xs", allPickedEmpty ? "text-danger" : "text-warn")}>
              {allPickedEmpty ? (
                <>
                  Nothing selected has anything ready to post. This account will sit idle
                  until more is produced.
                </>
              ) : (
                <>
                  {emptyNames} {emptyPicked.length === 1 ? "has" : "have"} nothing ready, so the
                  other selected types will fill those slots.
                </>
              )}
            </p>
          )}
          {types.size === 0 && (
            <p className="mt-2 text-xs text-danger">
              Pick at least one content type, or switch the custom schedule off.
            </p>
          )}
        </div>

        {/* Bypass */}
        <label className="flex cursor-pointer items-start justify-between gap-3 rounded-nested border border-border px-3.5 py-3.5">
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <ShieldAlert className="size-3.5 text-text-muted" />
              Ignore automatic throttling
            </span>
            <span className="mt-1 block text-xs text-text-muted">
              Skips the age ramp and the health throttle, so these numbers apply as written.
              The delivery brake still applies. An account failing most of its posts is
              never forced to keep trying.
            </span>
          </span>
          <Toggle checked={bypass} onChange={setBypass} disabled={busy || !fieldsLive} />
        </label>
      </div>
    </div>
    </>
  );
}

export function numToField(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : String(n);
}

export function fieldToNum(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function NumField({
  label,
  value,
  onChange,
  placeholder,
  max,
  min = 0,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Hard ceiling from the scheduler's guards. null = no ceiling. */
  max?: number | null;
  /** Floor for the stepper. 0 for the weekly buckets, where "none" is a real
   *  setting — Character 5 runs filler 0 on purpose. 1 for posts/day, where 0
   *  is not a cap but an off switch, and there is already a Posting switch
   *  above for that. */
  min?: number;
}) {
  // An empty field means "keep the default", so stepping from empty starts at
  // whatever the placeholder shows rather than jumping to 0.
  const current = value.trim() === "" ? Number(placeholder) : Number(value);
  const atMax = max !== null && max !== undefined && current >= max;
  const atMin = current <= min;

  const step = (delta: number) => {
    let next = current + delta;
    if (next < min) next = min;
    if (max !== null && max !== undefined && next > max) next = max;
    onChange(String(next));
  };

  return (
    <div>
      <span className="mb-1 block text-xs text-text-muted">{label}</span>
      <div className="flex items-stretch overflow-hidden rounded-nested border border-border bg-card-raised">
        <StepButton onClick={() => step(-1)} disabled={atMin} label={`decrease ${label}`}>
          <Minus className="size-3" />
        </StepButton>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            // Empty is not zero — it means "inherit", and the placeholder shows
            // what will be used. It has to survive typing.
            if (raw === "") return onChange("");
            const n = Number(raw);
            // Typing has to respect the same ceiling AND floor as the buttons,
            // or either guard would be one paste away from being bypassed.
            const capped = max !== null && max !== undefined && n > max ? max : n;
            onChange(String(capped < min ? min : capped));
          }}
          className="w-full min-w-0 border-x border-border bg-transparent px-1 py-1.5 text-center text-sm tnum outline-none focus:border-accent"
        />
        <StepButton onClick={() => step(1)} disabled={atMax} label={`increase ${label}`}>
          <Plus className="size-3" />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={disabled ? "Not possible for this account" : undefined}
      className="flex w-7 shrink-0 items-center justify-center text-text-muted transition-colors hover:bg-card hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-accent" : "bg-border",
      )}
    >
      {/* Track 36x20, knob 16, inset 2 each side -> travel is 36-16-4 = 16px.
          The knob needs an explicit left: without one an absolutely positioned
          element starts from its static position, which is not the track edge,
          and the translate then pushes it outside the pill. */}
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}
