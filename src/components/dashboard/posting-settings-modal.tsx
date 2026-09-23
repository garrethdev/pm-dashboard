"use client";

import { useState } from "react";
import { Loader2, Sliders, X } from "@/components/ui/icons";
import type { AccountRow } from "@/lib/data/accounts";
import type { AccountOverride, ContentTypeOption, EffectiveConfig } from "@/lib/data/scheduler-overrides";
import { StatusPill } from "@/components/ui/pill";
import { CtaButton } from "@/components/ui/cta-button";
import { CadenceFields, Toggle, useCadenceForm } from "@/components/dashboard/cadence-form";

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
  const cadence = useCadenceForm({ override, effective, options, paused });
  const { enabled } = cadence;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the scheduler clamped the daily cap below what was asked for.
  // The save succeeded — this is "here is what will actually happen".
  const [clamped, setClamped] = useState<{
    requested: number;
    effective: number;
    reason: string | null;
  } | null>(null);

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
        ...cadence.payload(),
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card border border-border glass-overlay p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="-mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Sliders className="size-4" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Posting: {account.profile}</h2>
              <p className="text-xs text-text-muted">
                {account.character || "no character"}
                {account.username ? ` @${account.username}` : ""}
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

        <CadenceFields
          form={cadence}
          options={options}
          effective={effective}
          paused={paused}
          busy={busy}
        />

        {error && (
          <p className="mt-4 rounded-nested bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
        )}

        {clamped && (
          <div className="mt-4 rounded-nested border border-warn/40 bg-warn/10 px-3 py-2.5 text-xs">
            <p className="font-semibold text-warn">
              Saved, but the scheduler will use {clamped.effective}/day, not {clamped.requested}
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
          <CtaButton
            onClick={save}
            disabled={busy || cadence.blocked}
                      >
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            Save
          </CtaButton>
          </div>
        </div>
      </div>
    </div>
  );
}
