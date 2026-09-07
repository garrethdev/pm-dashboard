"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, RotateCw, X } from "@/components/ui/icons";
import { HoldButton } from "@/components/ui/hold-button";
import type { AccountRow } from "@/lib/data/accounts";

type Step = "dry_running" | "dry_done" | "live_starting" | "error";

interface DrySummary {
  phoneId?: string | null;
  geePhone?: string | null;
  pc?: { found?: boolean; ip?: string | null };
  tv?: { found?: boolean; number?: string | null };
}

/**
 * Post-Ban retire (plan §9.4). Live fires in the background; the bell notifies
 * on completion.
 *
 * One screen, not two. The dry run starts the moment the dialog opens rather
 * than waiting for a button, because it is report-only — the webhook is called
 * with "Dry run (report only)" and nothing is deleted — so making the operator
 * click for it bought no safety and cost a click on every retire (Garreth
 * 2026-09-06). What it finds still has to be on screen before the destructive
 * button does anything, so Execute stays disabled until the report lands.
 *
 * The guard against a mis-click is the hold, not a second step: the confirm
 * used to ask for the profile name typed out, which is a memory test rather
 * than a deliberation, and people paste it.
 */
export function RetireModal({
  account,
  onClose,
  onLiveStarted,
}: {
  account: AccountRow;
  onClose: () => void;
  onLiveStarted: (profile: string) => void;
}) {
  const [step, setStep] = useState<Step>("dry_running");
  const [message, setMessage] = useState("");
  const [dry, setDry] = useState<DrySummary | null>(null);
  // A dialog closed mid-flight must not write state into an unmounted tree.
  const alive = useRef(true);
  // The in-flight dry run, so a StrictMode remount reuses it instead of
  // firing a second webhook call. See the effect below.
  const inflight = useRef<Promise<{ summary?: DrySummary | null }> | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const post = useCallback(
    (mode: "dry" | "live") =>
      fetch("/api/accounts/post-ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: account.profile, mode }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        return data;
      }),
    [account.profile],
  );

  const runDry = useCallback(() => {
    setStep("dry_running");
    setMessage("");
    // A fresh request: the remembered one is the failure being retried.
    inflight.current = null;
    post("dry")
      .then((data) => {
        if (!alive.current) return;
        setDry((data.summary ?? null) as DrySummary | null);
        setStep("dry_done");
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        setMessage(err instanceof Error ? err.message : "Network error");
        setStep("error");
      });
  }, [post]);

  /**
   * Fire the dry run once, on open.
   *
   * The request is held in a ref rather than started fresh each time the
   * effect runs, and the handlers are attached on every run. StrictMode mounts,
   * unmounts and remounts in development, so an effect that starts its own
   * request and cancels it on cleanup fires once and then throws the answer
   * away on the simulated unmount — which left the dialog spinning forever
   * (2026-09-06). Reusing the promise means exactly one webhook call, and
   * whichever mount is alive when it settles renders the result.
   *
   * The effect body sets no state of its own; state lands in the continuations.
   */
  useEffect(() => {
    inflight.current ??= post("dry");
    inflight.current
      .then((data) => {
        if (!alive.current) return;
        setDry((data.summary ?? null) as DrySummary | null);
        setStep("dry_done");
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        setMessage(err instanceof Error ? err.message : "Network error");
        setStep("error");
      });
  }, [post]);

  function runLive() {
    setStep("live_starting");
    setMessage("");
    post("live")
      .then(() => {
        // Live is async — hand off to the table (row shows a "Retiring…"
        // spinner) and close; the bell notifies on completion.
        onLiveStarted(account.profile);
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        setMessage(err instanceof Error ? err.message : "Network error");
        setStep("error");
      });
  }

  const busy = step === "dry_running" || step === "live_starting";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-card border border-border bg-card p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="-mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 border-b border-border p-6">
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

        {/* What the cleanup will touch. Reserved from the start so the dialog
            does not jump height when the report arrives. */}
        <div className="mb-4 rounded-nested border border-border p-3 text-sm">
          {step === "dry_running" ? (
            <p className="flex items-center gap-2 py-1 text-xs text-text-muted">
              <Loader2 className="size-3.5 animate-spin" />
              Checking what this account still holds…
            </p>
          ) : dry ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-text-muted">GeeLark phone</span>
              {/* Just the number. "found (+1...)" said the same thing twice —
                  a number on the row already means one was found. */}
              <span>{dry.phoneId ? (dry.geePhone ?? dry.phoneId) : "already gone"}</span>
              <span className="text-text-muted">Proxy</span>
              {/* Same rule: the IP is the answer. "found" only stands in when
                  the proxy matched but carried no IP. */}
              <span>{dry.pc?.found ? (dry.pc.ip ?? "matched, no IP") : "no match"}</span>
              <span className="text-text-muted">Phone number</span>
              <span>{dry.tv?.found ? (dry.tv.number ?? "no number on file") : "not found"}</span>
            </div>
          ) : (
            <p className="py-1 text-xs text-text-muted">
              Couldn&rsquo;t check what this account holds — retry before retiring.
            </p>
          )}
        </div>

        {message && (
          <p className="mb-4 flex items-center gap-2 rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-nested border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary"
          >
            Cancel
          </button>
          {step === "error" && !dry ? (
            <button
              onClick={runDry}
              className="flex items-center gap-2 rounded-nested border border-border px-4 py-2 text-sm font-medium text-text-primary hover:border-accent/50"
            >
              <RotateCw className="size-4" />
              Try again
            </button>
          ) : (
            // Held, not clicked — and never before the report is on screen.
            <HoldButton onConfirm={runLive} disabled={busy || !dry} className="px-4 py-2 font-semibold">
              {step === "live_starting" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Retiring…
                </>
              ) : (
                "Execute retire (Live)"
              )}
            </HoldButton>
          )}
        </div>
      </div>
    </div>
  );
}
