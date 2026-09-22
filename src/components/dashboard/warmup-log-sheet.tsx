"use client";

import { useState } from "react";
import { CtaButton } from "@/components/ui/cta-button";
import { ListChecks, X } from "@/components/ui/icons";
import { Stepper } from "@/components/ui/stepper";
import {
  SESSIONS_PER_DAY,
  SESSION_TARGET_MINUTES,
  type SessionProgress,
} from "@/lib/data/warmup-sessions";

/**
 * Record a warmup done outside the to-do list (PF-04, design ticket P3).
 *
 * The SAME form P3 approved inside the to-do sheet: minutes on a stepper that
 * starts at the session's target, an optional note, and above them what is
 * already logged for that session — because several logs add up to one
 * session, and without that line you cannot tell whether eight more minutes
 * finishes it.
 *
 * This one is reachable from a phone's page and an account's, for "a warmup
 * done outside the list" (P3). It is deliberately NOT a second to-do list: it
 * records one warmup and closes. Which session the minutes land on is not
 * asked — the server puts them on the first of the day's two that is not
 * finished — because somebody who has just warmed a phone up is recording what
 * they did, not filing it.
 *
 * P3's fifth state (somebody else finished it while your sheet was open) does
 * not arise here the way it does for a post: two people logging the same
 * warmup add minutes to the same session rather than overwriting each other,
 * and the sheet re-reads the day after every save.
 */
export function WarmupLogSheet({
  handle,
  subtitle,
  progress,
  onClose,
  onSaved,
  save,
}: {
  /** The account being warmed, as it reads on screen. */
  handle: string;
  /** The phone, or whatever else names this warmup's context. */
  subtitle?: string;
  /** How today's two sessions stand, so the sheet can say what is already in. */
  progress: SessionProgress[];
  onClose: () => void;
  onSaved: () => void;
  /** Does the write. Resolves with an error sentence, or null when it landed. */
  save: (minutes: number, note: string) => Promise<string | null>;
}) {
  // The stepper starts at the target, the way P3 has it, minus whatever is
  // already logged against the open session — so the number offered is what
  // would FINISH it rather than what would double it.
  const open = progress.find((p) => !p.done);
  const alreadyIn = open?.minutes ?? 0;
  const [minutes, setMinutes] = useState(Math.max(SESSION_TARGET_MINUTES - alreadyIn, 1));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    // Saving (P3's state 1): the sheet HOLDS rather than closing at once. A
    // warmup believed logged and not logged is the failure worth designing
    // against — the account then looks warm on the dot and nobody warms it.
    setBusy(true);
    setError(null);
    const why = await save(minutes, note.trim());
    setBusy(false);
    if (why) {
      setError(why);
      return;
    }
    onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-card border border-border glass-overlay sm:max-h-[85vh] sm:rounded-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <ListChecks className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">Log warmup</h2>
              <p className="tnum truncate text-xs text-text-muted">
                {handle}
                {subtitle ? ` · ${subtitle}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          {/* Today's two sessions, so the minutes below are put in knowing
              what they add to. */}
          <div className="flex gap-2">
            {progress.slice(0, SESSIONS_PER_DAY).map((p) => (
              <span
                key={p.sessionNo}
                className={
                  p.done
                    ? "flex flex-1 flex-col gap-0.5 rounded-nested bg-accent-soft px-3 py-2 text-accent"
                    : "flex flex-1 flex-col gap-0.5 rounded-nested border border-border px-3 py-2 text-text-muted"
                }
              >
                <span className="text-xs">Session {p.sessionNo}</span>
                <span className="tnum text-sm font-semibold">
                  {p.done ? "Done" : `${p.minutes} / ${SESSION_TARGET_MINUTES} min`}
                </span>
              </span>
            ))}
          </div>

          <Stepper
            label="Minutes"
            hint={`Done from ${SESSION_TARGET_MINUTES}`}
            value={minutes}
            onChange={setMinutes}
            min={1}
            max={60}
            suffix="min"
          />
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-muted">Note</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Anything worth remembering"
              className="rounded-nested border border-border bg-card-raised px-3 py-2.5 text-sm placeholder:text-text-muted/60"
            />
          </label>

          {/* P3's state 3: could not save, and NOTHING was changed. The sheet
              stays open holding what was typed, so Save is one press away. */}
          {error && (
            <p
              role="alert"
              className="rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
          <CtaButton onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : error ? "Try again" : "Save"}
          </CtaButton>
        </div>
      </div>
    </div>
  );
}
