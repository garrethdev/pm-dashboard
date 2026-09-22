"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WarmupLogSheet } from "@/components/dashboard/warmup-log-sheet";
import { SESSION_TARGET_MINUTES, type SessionProgress } from "@/lib/data/warmup-sessions";

/**
 * Today's two warmups for one account, and the form to log one (PF-04).
 *
 * The account page is the second home the ticket gives the log form, beside
 * the phone's page — "the same form ... for a warmup done outside the list"
 * (design ticket P3). Both sessions are shown rather than just the open one,
 * because two a day is the rule and a day with one done and one not is the
 * ordinary state worth seeing at a glance.
 *
 * Nothing here ticks anything off the to-do list: it records a warmup that
 * happened. The to-do list reads the same rows, so a session logged here is
 * one the list stops asking for.
 */
export function AccountWarmupToday({
  accountId,
  deviceId,
  handle,
  deviceName,
  progress,
}: {
  accountId: number;
  deviceId: number | null;
  handle: string;
  deviceName: string;
  progress: SessionProgress[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex w-full items-center gap-2 rounded-card border border-border bg-card px-4 py-3 shadow-card">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {progress.map((p) => (
            <span
              key={p.sessionNo}
              title={`Warmup ${p.sessionNo} of the day`}
              className={
                p.done
                  ? "tnum rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
                  : "tnum rounded-full border border-border px-2.5 py-1 text-xs font-medium text-text-muted"
              }
            >
              {p.done ? `Warmup ${p.sessionNo}` : `${p.minutes}/${SESSION_TARGET_MINUTES} min`}
            </span>
          ))}
        </span>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text-primary"
        >
          Log warmup
        </button>
      </div>

      {open && (
        <WarmupLogSheet
          handle={handle}
          subtitle={deviceName}
          progress={progress}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            // The pills and the health dot are both read on the server, so the
            // page is asked again rather than patched here.
            router.refresh();
          }}
          save={async (minutes, note) => {
            try {
              const res = await fetch("/api/warmups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId, deviceId, minutes, note: note || null }),
              });
              if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { error?: string } | null;
                return body?.error ?? `Saving the warmup failed (HTTP ${res.status}).`;
              }
              return null;
            } catch {
              return "Couldn't reach the server. Nothing was saved.";
            }
          }}
        />
      )}
    </>
  );
}
