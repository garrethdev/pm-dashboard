"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Smartphone, X } from "@/components/ui/icons";
import { HoldButton } from "@/components/ui/hold-button";
import { StatusPill } from "@/components/ui/pill";
import type { DeliveryMode } from "@/lib/data/accounts";
import { FLEET_LABEL, fleetOfDeliveryMode } from "@/lib/fleet";

/** The one place the two modes are given their on-screen names. */
export function deliveryModeLabel(mode: DeliveryMode): string {
  return FLEET_LABEL[fleetOfDeliveryMode(mode)];
}

/** Read-only pill. Blue rather than the cyan accent, which is rationed. */
export function DeliveryModePill({ mode, className }: { mode: DeliveryMode; className?: string }) {
  return (
    <StatusPill tone={mode === "manual" ? "info" : "neutral"} className={className}>
      {deliveryModeLabel(mode)}
    </StatusPill>
  );
}

/**
 * Which fleet manages this account, Cloud or Physical (PF-01), shown as a pill
 * that opens a confirm. Lives in Settings → Account management; the account
 * page and the Accounts table carry no sign of it (Garreth, 2026-09-18).
 *
 * The pill is pressable in the same way the health pill on the Accounts table
 * is. The confirm is a hold, as on Retire: once the Posting Agent reads this
 * switch (PF-06) a flip decides whether the robot posts for the account, which
 * should never happen on a stray click. Until then the switch only records the
 * choice, so the dialog promises nothing about Geelark stopping. Posting
 * paused/active is a separate switch and is left alone.
 */
export function DeliveryModeControl({
  profile,
  mode,
  editable,
}: {
  profile: string;
  mode: DeliveryMode;
  /** false for a retired account: the pill shows, but does not open. */
  editable: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  // A dialog closed mid-flight must not write state into an unmounted tree.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  if (!editable) return <DeliveryModePill mode={mode} />;

  const next: DeliveryMode = mode === "manual" ? "geelark" : "manual";

  function close() {
    if (busy) return;
    setOpen(false);
    setMessage("");
  }

  function save() {
    setBusy(true);
    setMessage("");
    fetch("/api/accounts/delivery-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, mode: next }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        if (!alive.current) return;
        setBusy(false);
        setOpen(false);
        router.refresh();
      })
      .catch((err: unknown) => {
        if (!alive.current) return;
        setBusy(false);
        setMessage(err instanceof Error ? err.message : "Network error");
      });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Managed on ${deliveryModeLabel(mode)}. Change`}
        className="group cursor-pointer rounded-full outline-none transition-transform duration-150 hover:-translate-y-px focus-visible:ring-2 focus-visible:ring-accent/70"
      >
        <DeliveryModePill
          mode={mode}
          className="ring-1 ring-transparent transition-all duration-150 group-hover:brightness-125 group-hover:ring-current/40"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-card border border-border glass-overlay p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="-mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 border-b border-border p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-full bg-warn/15 text-warn">
                  <Smartphone className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-semibold">
                    {`Move ${profile} to ${deliveryModeLabel(next)}`}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="text-text-muted hover:text-text-primary"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mb-4 rounded-nested bg-card-raised/60 p-3">
              <div className="grid grid-cols-2 items-center gap-x-4 gap-y-2 text-xs">
                <span className="text-text-muted">Now</span>
                <span>
                  <DeliveryModePill mode={mode} />
                </span>
                <span className="text-text-muted">After</span>
                <span>
                  <DeliveryModePill mode={next} />
                </span>
              </div>
            </div>

            {message && (
              <p className="mb-4 rounded-nested bg-danger/10 px-3 py-2 text-sm text-danger">
                {message}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="rounded-nested border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary disabled:opacity-50"
              >
                Cancel
              </button>
              <HoldButton
                tone="warn"
                onConfirm={save}
                disabled={busy}
                className="px-4 py-2 font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  `Move to ${deliveryModeLabel(next)}`
                )}
              </HoldButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
