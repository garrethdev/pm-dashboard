"use client";

import { useState } from "react";
import { AlertTriangle, Check, Globe, SignOut, Smartphone, X } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { HoldButton } from "@/components/ui/hold-button";

/**
 * Retiring a banned account that lives on a REAL phone — design ticket P8.
 *
 * The Cloud dialog asks the Post-Ban robot for a dry run and then lets it
 * delete the Geelark phone. A real phone has no robot: the app does its own
 * half at once (the queued posts go back to the pool, Garreth 2026-09-23) and
 * the phone half becomes a checklist on the to-do list. So this dialog says
 * both halves before the hold, and nothing needs a dry run.
 *
 * The proxy is the one step that is a choice. One proxy serves every account
 * on a phone, so retiring it is a switch (Garreth, 2026-09-23): ON by default
 * when the banned account was the last one using it, OFF while others still
 * do. Only when it is on does "Retire the proxy" go on the checklist.
 *
 * DESIGN REVIEW ONLY: shown for the invented accounts of `?demo=1`, and the
 * hold saves nothing.
 */
export function PhoneRetireModal({
  handle,
  phone,
  others,
  queued,
  number,
  proxy,
  onClose,
}: {
  handle: string;
  phone: string;
  /** Other active accounts on the same phone. */
  others: number;
  queued: number;
  number: string | null;
  proxy: string | null;
  onClose: () => void;
}) {
  const [retireProxy, setRetireProxy] = useState(others === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-card border border-border glass-overlay p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="-mx-6 -mt-6 mb-5 flex items-start justify-between gap-3 border-b border-border p-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-danger/15 text-danger">
              <AlertTriangle className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold">Retire {handle}</h2>
              <p className="text-xs text-text-muted">On {phone}. Irreversible from the dashboard.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-4 rounded-nested bg-card-raised/60 px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-text-muted">Now</p>
          <ul className="divide-y divide-border/60">
            <Line icon={<Check className="size-4" />} tone="done">
              {queued === 1 ? "1 queued post" : `${queued} queued posts`} back to the pool
            </Line>
            <Line icon={<Check className="size-4" />} tone="done">
              Account marked retired
            </Line>
          </ul>
        </div>

        <div className="mb-5 rounded-nested border border-border px-4 pt-3 pb-1">
          <p className="text-xs font-medium text-text-muted">Then on {phone}, from the to-do list</p>
          <ul className="divide-y divide-border/60">
            <Line icon={<SignOut className="size-4" />} detail={phone}>
              Sign out on the phone
            </Line>
            <Line icon={<Smartphone className="size-4" />} detail={number ?? undefined}>
              Retire the number
            </Line>
            <Line
              icon={<Globe className="size-4" />}
              detail={[
                proxy,
                others > 0 ? (others === 1 ? "1 account still uses it" : `${others} accounts still use it`) : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              muted={!retireProxy}
              end={<Switch checked={retireProxy} onChange={setRetireProxy} label="Retire the proxy" />}
            >
              Retire the proxy
            </Line>
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-nested border border-border px-4 py-2 text-sm text-text-muted hover:text-text-primary"
          >
            Cancel
          </button>
          {/* The design review saves nothing: the hold only closes it. */}
          <HoldButton onConfirm={onClose} className="px-4 py-2 font-semibold">
            Retire
          </HoldButton>
        </div>
      </div>
    </div>
  );
}

/**
 * One row of either list: its mark in a circle, the name, and what it is about
 * underneath, with room between rows (Garreth, 2026-09-23: "more visual, and
 * enough space between the rows"). What the app does is marked in cyan, the
 * app's own colour, because it happens without anyone ticking it.
 */
function Line({
  icon,
  detail,
  tone = "todo",
  muted = false,
  end,
  children,
}: {
  icon: React.ReactNode;
  detail?: string;
  tone?: "done" | "todo";
  /** A step switched off: still shown, so it can be switched back on. */
  muted?: boolean;
  /** A control at the row's right-hand end. */
  end?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      {/* Dimmed when switched off, but never the switch itself: it has to
          read as live so it can be switched back on. */}
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full transition-opacity",
          muted && "opacity-55",
          tone === "done" ? "bg-accent/15 text-accent" : "bg-card-raised text-text-muted",
        )}
      >
        {icon}
      </span>
      <span className={cn("flex min-w-0 flex-1 flex-col gap-0.5 transition-opacity", muted && "opacity-55")}>
        <span className="text-sm font-medium">{children}</span>
        {detail && <span className="tnum text-xs text-text-muted">{detail}</span>}
      </span>
      {end}
    </li>
  );
}

/** The phone page's switch, drawn the same so one control looks one way. */
function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    // A 44px target around the 36px track, for a thumb.
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="flex h-11 shrink-0 items-center px-1"
    >
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-accent" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0",
          )}
        />
      </span>
    </button>
  );
}
