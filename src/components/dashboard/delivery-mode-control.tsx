"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Smartphone, X } from "@/components/ui/icons";
import { HoldButton } from "@/components/ui/hold-button";
import { StatusPill } from "@/components/ui/pill";
import { MovePhonePicker } from "@/components/dashboard/move-phone-picker";
import type { DeliveryMode } from "@/lib/data/accounts";
import { canTake, type MoveTarget } from "@/lib/data/move-rules";
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
 * is. The confirm is a hold, as on Retire: the Posting Agent reads this switch
 * (PF-06), so a flip decides whether the robot posts for the account, which
 * should never happen on a stray click. Posting paused/active is a separate
 * switch and is left alone — the dialog says so, because P10 asked it to.
 *
 * SINCE P10 THE DIALOG ALSO PICKS THE PHONE. Moving an account used to be two
 * steps in two places: flip it here, then go to the phone and add it there.
 * Between the two the account was on the Physical fleet with no phone, which
 * is a state the To-do list cannot show — the work simply did not appear, and
 * nothing said why. One dialog now does both, so that gap cannot be left open.
 * Going the other way needs no picker: the account comes off whatever phone it
 * is on. The route saves both halves in one write (PF-03).
 */
export function DeliveryModeControl({
  profile,
  mode,
  editable,
  phones,
  currentPhone,
  demo = false,
}: {
  profile: string;
  mode: DeliveryMode;
  /** false for a retired account: the pill shows, but does not open. */
  editable: boolean;
  /** Every phone, with how full it is. Empty until PF-02 has a real one. */
  phones: MoveTarget[];
  /** The phone this account is on now, for the move back to Cloud. */
  currentPhone: string | null;
  /** True while the screen is drawn on invented phones: nothing may save. */
  demo?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [phoneId, setPhoneId] = useState<number | null>(null);
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

  // Moving ONTO a phone needs one picked; moving back off does not.
  const toPhysical = next === "manual";
  const usable = phones.filter(canTake);
  const blocked = toPhysical && usable.length === 0;

  function start() {
    // Pre-pick when exactly one phone can take it: there is no choice to make,
    // and an unpicked radio would make the hold look broken.
    setPhoneId(usable.length === 1 ? usable[0]!.id : null);
    setMessage("");
    setOpen(true);
  }

  function close() {
    if (busy) return;
    setOpen(false);
    setMessage("");
  }

  function save() {
    if (toPhysical && phoneId === null) {
      setMessage("Choose a phone first.");
      return;
    }
    // The phones are invented while the screen is being judged, so a press here
    // would move a LIVE account onto a phone that does not exist.
    if (demo) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setMessage("");
    fetch("/api/accounts/delivery-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile, mode: next, deviceId: toPhysical ? phoneId : null }),
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
        onClick={start}
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
                    {toPhysical ? `Move ${profile} onto a phone` : `Move ${profile} back to Cloud`}
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

            {toPhysical ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-text-muted">Which phone</p>
                <MovePhonePicker
                  phones={phones}
                  value={phoneId}
                  onChange={setPhoneId}
                  name={`move-${profile}`}
                  disabled={busy}
                />
              </div>
            ) : (
              currentPhone && (
                <p className="mb-4 text-sm text-text-muted">
                  It comes off <span className="text-text-primary">{currentPhone}</span>.
                </p>
              )
            )}

            {/* P10 asked for this in as many words: a move never unpauses
                anything. Posting is its own switch, and an account arriving on
                a phone still posts nothing until somebody turns it on. */}
            <p className="mb-4 text-sm text-text-muted">Posting stays paused.</p>

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
                // Held rather than hidden when there is no phone to move onto:
                // the picker above already says why, and a button that has
                // vanished leaves nothing to explain itself.
                disabled={busy || blocked || (toPhysical && phoneId === null)}
                className="px-4 py-2 font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Saving…
                  </>
                ) : toPhysical ? (
                  phoneId === null
                    ? "Move onto a phone"
                    : `Move onto ${phones.find((p) => p.id === phoneId)?.name ?? "phone"}`
                ) : (
                  "Move to Cloud"
                )}
              </HoldButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
