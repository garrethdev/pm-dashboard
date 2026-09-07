"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Stethoscope, UserCheck, X } from "@/components/ui/icons";
import type { AccountRow } from "@/lib/data/accounts";
import { StatusPill } from "@/components/ui/pill";
import { healthTone } from "@/lib/health";
import { cn } from "@/lib/utils";

/**
 * Human review of a system health verdict, opened from the health pill.
 *
 * The detector recommends; a person decides. This is the step between the two:
 * someone reads why the account was flagged and either agrees or records a
 * different judgement. Nothing here retires an account — that stays the
 * separate, explicit Retire flow.
 */

/** Overrides a reviewer can set, beyond simply confirming the system. */
const OVERRIDES = ["healthy", "watch", "collapsing", "shadowbanned"] as const;

interface HistoryEntry {
  verdict: string;
  systemVerdict: string;
  by: string;
  at: string;
  note: string | null;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

export function HealthReviewModal({
  account,
  onClose,
}: {
  account: AccountRow;
  onClose: () => void;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);

  const { systemHealth, healthReason: reason, review } = account;

  // The trail is fetched on open rather than shipped with every table row —
  // only one account is ever under review at a time.
  useEffect(() => {
    let live = true;
    fetch(`/api/accounts/health-review?profile=${encodeURIComponent(account.profile)}`)
      .then((r) => r.json())
      .then((d: { history?: HistoryEntry[] }) => {
        if (live) setHistory(d.history ?? []);
      })
      .catch(() => {
        if (live) setHistory([]);
      });
    return () => {
      live = false;
    };
  }, [account.profile]);

  // Escape closes, like the other modals.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async (verdict: string) => {
    setBusy(verdict);
    setError(null);
    try {
      const res = await fetch("/api/accounts/health-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // systemVerdict pins the review to what was on screen, so a later
        // change of machine opinion marks it stale instead of hiding it.
        body: JSON.stringify({ profile: account.profile, systemVerdict: systemHealth, verdict, note }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "review failed");
      setBusy(null);
    }
  };

  const settled = review && !review.needsRereview;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Health review for ${account.profile}`}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-card border border-border bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="-mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-accent">
              <Stethoscope className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Health review</h2>
              <p className="text-xs text-text-muted">
                {account.profile}
                {account.username ? ` ${account.username}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-primary"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-xs text-text-muted">System says</span>
            <StatusPill tone={healthTone(systemHealth)}>{systemHealth}</StatusPill>
            {settled &&
              (review.verdict === "confirmed" ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-ok">
                  <Check className="size-3.5" /> confirmed by {review.by}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-accent">
                  <UserCheck className="size-3.5" /> overridden to{" "}
                  <span className="font-semibold">{review.verdict}</span> by {review.by}
                </span>
              ))}
          </div>

          {reason ? (
            <p className="text-sm leading-relaxed">
              <span className="text-text-muted">Why: </span>
              <span className="font-semibold text-text-primary">{reason}.</span>
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              No single dominant reason recorded. The upstream classifier set this directly.
            </p>
          )}

          {review?.needsRereview && (
            <div className="flex items-start gap-2 rounded-nested border border-warn/40 bg-warn/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              <p className="text-sm text-text-muted">
                {review.by} reviewed this on {shortDate(review.at)} when the system said &ldquo;
                {review.verdict}&rdquo;. It now says &ldquo;{systemHealth}&rdquo;, so that review no
                longer applies. Please look again.
              </p>
            </div>
          )}

          {settled && review.note && (
            <p className="text-sm text-text-muted">
              <span className="text-text-primary">Note:</span> {review.note}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="review-note" className="text-xs text-text-muted">
              What did you see? (optional, saved with your decision)
            </label>
            <textarea
              id="review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={6}
              placeholder="e.g. checked the profile, recent reels are getting normal reach"
              className="min-h-36 w-full resize-y rounded-nested border border-border bg-card-raised px-3 py-2 text-sm outline-none placeholder:text-text-muted focus:border-accent"
            />
          </div>

          {/* One row: Confirm, a hairline, then the overrides. */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => submit("confirmed")}
              disabled={busy !== null}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2 text-xs font-semibold text-bg transition-opacity hover:opacity-90",
                busy && "opacity-60",
              )}
            >
              {busy === "confirmed" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              Confirm
            </button>

            <span className="h-6 w-px shrink-0 bg-border" aria-hidden />

            {OVERRIDES.filter((v) => v !== systemHealth).map((v) => (
              <button
                key={v}
                onClick={() => submit(v)}
                disabled={busy !== null}
                className={cn(
                  "rounded-full border border-border bg-card-raised px-3 py-2 text-xs font-medium text-text-muted capitalize transition-colors hover:text-text-primary",
                  busy && "opacity-60",
                )}
              >
                {busy === v ? "saving…" : v}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-danger">Could not save: {error}</p>}

          {history === null ? (
            <p className="text-xs text-text-muted">Loading history…</p>
          ) : (
            history.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <h3 className="text-xs font-semibold tracking-wide text-text-muted uppercase">
                  Review history ({history.length})
                </h3>
                <ul className="flex flex-col gap-2">
                  {history.map((h, i) => (
                    <li key={i} className="flex flex-col gap-0.5 text-sm">
                      <span>
                        <span className="tnum text-text-muted">{shortDate(h.at)}</span> —{" "}
                        <span className="font-medium">{h.by}</span>{" "}
                        {h.verdict === "confirmed" ? (
                          <>
                            confirmed <span className="font-semibold">{h.systemVerdict}</span>
                          </>
                        ) : (
                          <>
                            set it to <span className="font-semibold">{h.verdict}</span>
                            <span className="text-text-muted"> (system said {h.systemVerdict})</span>
                          </>
                        )}
                      </span>
                      {h.note && (
                        <span className="text-xs text-text-muted">&ldquo;{h.note}&rdquo;</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

        </div>
      </div>
    </div>
  );
}
