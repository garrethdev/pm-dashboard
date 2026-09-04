"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { AccountRow } from "@/lib/data/accounts";
import { cn } from "@/lib/utils";

type Step = "preflight" | "dry_running" | "dry_done" | "live_starting" | "error";

interface DrySummary {
  phoneId?: string | null;
  geePhone?: string | null;
  pc?: { found?: boolean; ip?: string | null };
  tv?: { found?: boolean; number?: string | null };
}

/** Two-step Post-Ban retire flow (plan §9.4): dry-run → name-confirm → Live.
 *  Live fires in the background; the bell notifies on completion. */
export function RetireModal({
  account,
  onClose,
  onLiveStarted,
}: {
  account: AccountRow;
  onClose: () => void;
  onLiveStarted: (profile: string) => void;
}) {
  const [step, setStep] = useState<Step>("preflight");
  const [message, setMessage] = useState<string>("");
  const [dry, setDry] = useState<DrySummary | null>(null);
  const [confirmText, setConfirmText] = useState("");

  async function run(mode: "dry" | "live") {
    setStep(mode === "dry" ? "dry_running" : "live_starting");
    setMessage("");
    try {
      const res = await fetch("/api/accounts/post-ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: account.profile, mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStep("error");
        setMessage(data.error ?? "Request failed");
        return;
      }
      if (mode === "dry") {
        setDry((data.summary ?? null) as DrySummary | null);
        setStep("dry_done");
      } else {
        // Live is async — hand off to the table (row shows a "Retiring…" spinner)
        // and close; the bell notifies on completion.
        onLiveStarted(account.profile);
      }
    } catch (err) {
      setStep("error");
      setMessage(err instanceof Error ? err.message : "Network error");
    }
  }

  const confirmed = confirmText.trim() === account.profile;
  const busy = step === "dry_running" || step === "live_starting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-card border border-border bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-danger/15 text-danger">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Retire {account.profile}</h2>
              <p className="text-xs text-text-muted">Post-Ban cleanup · irreversible from the dashboard</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="size-5" />
          </button>
        </div>

        {/* Pre-flight summary */}
        <div className="mb-4 rounded-nested bg-card-raised/60 p-3 text-sm">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-text-muted">Character</span>
            <span>{account.character || "—"}</span>
            <span className="text-text-muted">Health</span>
            <span>{account.healthStatus}</span>
            <span className="text-text-muted">Median views (5)</span>
            <span>
              {account.healthStatus === "tracking broken"
                ? "no data (tracking broken)"
                : (account.med5?.toLocaleString("en-US") ?? "no data")}
            </span>
          </div>
        </div>

        {/* Dry-run findings */}
        {step === "dry_done" && dry && (
          <div className="mb-4 rounded-nested border border-border p-3 text-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-text-muted">GeeLark phone</span>
              <span>{dry.phoneId ? `found (${dry.geePhone ?? dry.phoneId})` : "not found (already gone)"}</span>
              <span className="text-text-muted">Proxy</span>
              <span>{dry.pc?.found ? (dry.pc.ip ?? "found") : "no match"}</span>
              <span className="text-text-muted">Phone number</span>
              <span>{dry.tv?.found ? (dry.tv.number ?? "found") : "not found"}</span>
            </div>
          </div>
        )}

        {message && (
          <p className="mb-4 flex items-center gap-2 rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">
            {message}
          </p>
        )}

        {/* Controls */}
        {step === "preflight" || step === "dry_running" || step === "error" ? (
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-nested border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              onClick={() => run("dry")}
              disabled={busy}
              className="flex items-center gap-2 rounded-nested bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {step === "dry_running" && <Loader2 className="size-4 animate-spin" />}
              Retire
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <label className="text-xs text-text-muted">
              Type <span className="font-mono font-semibold text-text-primary">{account.profile}</span> to
              confirm the live cleanup:
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={account.profile}
              className="rounded-nested border border-border bg-card-raised px-3 py-2 text-sm outline-none focus:border-danger/60"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-nested border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={() => run("live")}
                disabled={!confirmed || busy}
                className="flex items-center gap-2 rounded-nested bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {step === "live_starting" && <Loader2 className="size-4 animate-spin" />}
                Execute retire (Live)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
