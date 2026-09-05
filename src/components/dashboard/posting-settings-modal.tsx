"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, ShieldAlert, Sliders, X } from "lucide-react";
import type { AccountRow } from "@/lib/data/accounts";
import type { AccountOverride, ContentTypeOption, EffectiveConfig } from "@/lib/data/scheduler-overrides";
import { StatusPill } from "@/components/ui/pill";
import { cn } from "@/lib/utils";

/**
 * Posting settings for one account — the single entry point that replaced the
 * bare Pause button in the accounts table.
 *
 * The hierarchy is deliberate and load-bearing: posting on/off sits at the top
 * because a paused account is filtered out of v_scheduler_account_config
 * entirely, so it has no caps to override. Everything below the switch is
 * disabled while posting is off, rather than silently doing nothing.
 */
export function PostingSettingsModal({
  account,
  override,
  effective,
  options,
  onClose,
  onSaved,
}: {
  account: AccountRow;
  override: AccountOverride | null;
  /** Absent when the account is paused — see note above. */
  effective: EffectiveConfig | null;
  options: ContentTypeOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [paused, setPaused] = useState(account.paused);
  const [enabled, setEnabled] = useState(override?.active ?? false);
  const [perDay, setPerDay] = useState<string>(numToField(override?.maxPostsPerDay));
  const [glpWeek, setGlpWeek] = useState<string>(numToField(override?.glpWeekCap));
  const [fillerWeek, setFillerWeek] = useState<string>(numToField(override?.fillerWeekCap));
  const [bypass, setBypass] = useState(override?.bypassGuards ?? false);
  const [types, setTypes] = useState<Set<string>>(
    new Set(override?.onlyContentTypes ?? options.map((o) => o.contentType)),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the scheduler clamped the daily cap below what was asked for.
  // The save succeeded — this is "here is what will actually happen".
  const [clamped, setClamped] = useState<{
    requested: number;
    effective: number;
    reason: string | null;
  } | null>(null);

  const allSelected = types.size === options.length;

  function toggleType(ct: string) {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(ct)) next.delete(ct);
      else next.add(ct);
      return next;
    });
  }

  async function post(url: string, body: unknown) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      error?: string;
      clamped?: { requested: number; effective: number; reason: string | null } | null;
    };
    if (!res.ok) throw new Error(data.error ?? "Request failed");
    return data;
  }

  async function resetToDefaults() {
    setBusy(true);
    setError(null);
    setClamped(null);
    try {
      await post("/api/accounts/scheduler-override", { profile: account.profile, enabled: false });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setError(null);
    setClamped(null);
    try {
      if (paused !== account.paused) {
        await post("/api/accounts/pause", { profile: account.profile, paused });
      }
      const res = await post("/api/accounts/scheduler-override", {
        profile: account.profile,
        enabled,
        maxPostsPerDay: fieldToNum(perDay),
        glpWeekCap: fieldToNum(glpWeek),
        fillerWeekCap: fieldToNum(fillerWeek),
        onlyContentTypes: allSelected ? null : [...types],
        bypassGuards: bypass,
      });
      // A clamp is not an error — the save landed. But closing now would hide
      // the fact that the scheduler is going to use a different number, so
      // stay open and say so; the user closes when they have read it.
      if (res.clamped) {
        setClamped(res.clamped);
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const fieldsLive = !paused && enabled;
  // A guard caps how HIGH posts/day can go; it never stops you going lower.
  // So only the increase direction is blocked, and only while bypass is off.
  const dayCeiling = bypass ? null : (effective?.guardDayCap ?? null);
  // A weekly cap above (posts/day x 7) is unreachable arithmetic, not a setting:
  // at 1/day the account can post at most 7 times a week, so GLP + filler must
  // fit inside that. The scheduler would silently plan the smaller number, so
  // the fields are bounded here instead of accepting a figure it will ignore.
  const effDay = perDay.trim() === ""
    ? (effective?.maxPostsPerDay ?? null)
    : Number(perDay);
  const weekCeiling = effDay === null || !Number.isFinite(effDay) ? null : effDay * 7;
  const glpNow = glpWeek.trim() === "" ? (effective?.glpWeekCap ?? 0) : Number(glpWeek);
  const fillerNow = fillerWeek.trim() === "" ? (effective?.fillerWeekCap ?? 0) : Number(fillerWeek);
  // Each weekly field is bounded by the week's total minus what the other one
  // already claims, so the pair can never sum past the ceiling.
  const glpMax = weekCeiling === null ? null : Math.max(0, weekCeiling - fillerNow);
  const fillerMax = weekCeiling === null ? null : Math.max(0, weekCeiling - glpNow);
  const weekOver = weekCeiling !== null && glpNow + fillerNow > weekCeiling;
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Sliders className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Posting · {account.profile}</h2>
              <p className="text-xs text-text-muted">
                {account.character || "no character"}
                {account.username ? ` · @${account.username}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="size-5" />
          </button>
        </div>

        {/* Master switch — everything below depends on this being on. */}
        <label className="flex cursor-pointer items-center justify-between rounded-nested border border-border bg-card-raised/60 px-3.5 py-3.5">
          <span className="flex items-center gap-2.5">
            <span className="text-sm font-medium">Posting</span>
            <StatusPill tone={paused ? "warn" : "ok"}>{paused ? "Paused" : "Active"}</StatusPill>
          </span>
          <Toggle checked={!paused} onChange={(v) => setPaused(!v)} disabled={busy} />
        </label>

        {/* Custom schedule */}
        <div className={cn("mt-5", paused && "pointer-events-none opacity-45")}>
          <label className="flex cursor-pointer items-center justify-between rounded-nested border border-border px-3.5 py-3">
            <span>
              <span className="text-sm font-medium">Custom schedule</span>
              <span className="mt-0.5 block text-xs text-text-muted">
                {enabled ? "This account ignores the fleet defaults" : "Using defaults"}
              </span>
            </span>
            <Toggle checked={enabled} onChange={setEnabled} disabled={busy || paused} />
          </label>

          <div className={cn("mt-5 space-y-6", !fieldsLive && "pointer-events-none opacity-45")}>
            <div className="grid grid-cols-3 gap-3">
              <NumField
                label="Max posts / day"
                value={perDay}
                onChange={setPerDay}
                placeholder={effective ? String(effective.maxPostsPerDay) : "3"}
                max={dayCeiling}
              />
              <NumField
                label="GLP / week"
                value={glpWeek}
                onChange={setGlpWeek}
                placeholder={effective ? String(effective.glpWeekCap) : "10"}
                max={glpMax}
              />
              <NumField
                label="Filler / week"
                value={fillerWeek}
                onChange={setFillerWeek}
                placeholder={effective ? String(effective.fillerWeekCap) : "10"}
                max={fillerMax}
              />
            </div>
            <p className="text-xs text-text-muted">Leave a field blank to keep the default for it.</p>

            {weekCeiling !== null && (
              <p className={cn("text-xs", weekOver ? "text-warn" : "text-text-muted")}>
                At {effDay}/day this account can post at most{" "}
                <span className="tnum font-semibold">{weekCeiling}</span> times a week, so GLP +
                filler are capped there ({glpNow} + {fillerNow} ={" "}
                <span className="tnum">{glpNow + fillerNow}</span>).
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
                      Nothing selected has anything ready to post — this account will sit idle
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
                  The delivery brake still applies — an account failing most of its posts is
                  never forced to keep trying.
                </span>
              </span>
              <Toggle checked={bypass} onChange={setBypass} disabled={busy || !fieldsLive} />
            </label>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-nested bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
        )}

        {clamped && (
          <div className="mt-4 rounded-nested border border-warn/40 bg-warn/10 px-3 py-2.5 text-xs">
            <p className="font-semibold text-warn">
              Saved — but the scheduler will use {clamped.effective}/day, not {clamped.requested}
              /day.
            </p>
            <p className="mt-1 text-text-muted">
              {clamped.reason ? `${clamped.reason}. ` : ""}Your weekly limits were applied in full.
              Turn on “Ignore automatic throttling” and save again to force{" "}
              {clamped.requested}/day.
            </p>
          </div>
        )}

        <div className="mt-7 flex items-center justify-between gap-2">
          {/* Offered whenever there is anything to clear: an override that is
              live, one saved but switched off, or values typed this session.
              Leaves the pause state alone — that is a separate choice above. */}
          {override || enabled ? (
            <button
              onClick={resetToDefaults}
              disabled={busy}
              className="rounded-full px-3 py-2 text-xs font-medium text-text-muted underline-offset-4 hover:text-text-primary hover:underline disabled:opacity-50"
            >
              Reset to defaults
            </button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
          <button
            onClick={clamped ? onSaved : onClose}
            disabled={busy}
            className="rounded-full px-4 py-2 text-xs font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            {clamped ? "Close" : "Cancel"}
          </button>
          <button
            onClick={save}
            disabled={busy || (fieldsLive && types.size === 0)}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function numToField(n: number | null | undefined): string {
  return n === null || n === undefined ? "" : String(n);
}

function fieldToNum(v: string): number | null {
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Hard ceiling from the scheduler's guards. null = no ceiling. */
  max?: number | null;
}) {
  // An empty field means "keep the default", so stepping from empty starts at
  // whatever the placeholder shows rather than jumping to 0.
  const current = value.trim() === "" ? Number(placeholder) : Number(value);
  const atMax = max !== null && max !== undefined && current >= max;
  const atMin = current <= 0;

  const step = (delta: number) => {
    let next = current + delta;
    if (next < 0) next = 0;
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
            if (raw === "") return onChange("");
            const n = Number(raw);
            // Typing has to respect the same ceiling as the button, or the
            // guard would be one paste away from being bypassed.
            onChange(String(max !== null && max !== undefined && n > max ? max : n));
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

function Toggle({
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
