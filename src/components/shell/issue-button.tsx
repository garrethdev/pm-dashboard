"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Flag, ListChecks, NotePencil, X } from "@/components/ui/icons";
import { ReportIssueDialog } from "@/components/shell/report-issue-dialog";
import { cn } from "@/lib/utils";

/**
 * The floating issue button in the bottom-right corner of every signed-in page
 * (Garreth, 2026-10-09).
 *
 * Pressed, two actions rise out of it — Report an issue on top, See issues
 * beneath it (Garreth, 2026-10-09) — and its flag, the usual sign for
 * "report", turns into an X that folds them back in. Escape or a press anywhere else
 * does the same. The Issues page is reached from here only; it has no item in
 * the menu, by decision.
 *
 * MOTION: a 200ms rise-and-fade on transform and opacity with a strong
 * ease-out, the nearer action (See issues) first and Report an issue 40ms
 * after, so the pair
 * reads as coming out of the button rather than appearing beside it. Closing
 * runs the other way round. Transitions rather than keyframes, so a second
 * press mid-way reverses from wherever it got to. With reduced motion turned
 * on, only the fade is kept.
 *
 * SOLID, not the glass of the dialogs: it floats over live tables, and a
 * see-through button lets the row beneath read through its label. (The glass
 * blur was also dropped by Chrome while the actions faded, which is how that
 * showed up.) It sits below the dialogs (z-50) and the phone menu's scrim
 * (z-40), so either covers it.
 */
const ACTION_MOTION =
  "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity";
const ICON_MOTION =
  "absolute transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-opacity";
const ACTION_CLASS =
  "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card-raised px-4 text-sm font-medium text-text-primary shadow-card outline-none hover:border-text-muted/50 focus-visible:border-accent";

export function IssueButton() {
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  /** Nearest the button is index 0: first out, last back in. */
  const delay = (index: number) => ({ transitionDelay: `${(open ? index : 1 - index) * 40}ms` });
  const shown = open
    ? "translate-y-0 scale-100 opacity-100"
    : "pointer-events-none translate-y-3 scale-95 opacity-0 motion-reduce:translate-y-0 motion-reduce:scale-100";

  return (
    <>
      <div
        ref={rootRef}
        className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-2.5 sm:right-6 sm:bottom-6"
      >
        <div id="issue-actions" inert={!open} className="flex flex-col items-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setReporting(true);
            }}
            style={delay(1)}
            className={cn(ACTION_CLASS, ACTION_MOTION, "origin-bottom-right", shown)}
          >
            <NotePencil className="size-4 text-text-muted" />
            Report an issue
          </button>
          <Link
            href="/issues"
            onClick={() => setOpen(false)}
            style={delay(0)}
            className={cn(ACTION_CLASS, ACTION_MOTION, "origin-bottom-right", shown)}
          >
            <ListChecks className="size-4 text-text-muted" />
            See issues
          </Link>
        </div>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="issue-actions"
          aria-label={open ? "Close" : "Issues"}
          className={cn(
            "relative flex size-12 items-center justify-center rounded-full border border-border bg-card-raised text-text-primary shadow-card outline-none transition-colors hover:border-text-muted/50 focus-visible:border-accent",
            open && "border-text-muted/50",
          )}
        >
          <Flag
            className={cn(ICON_MOTION, "size-5", open && "scale-75 rotate-90 opacity-0 motion-reduce:scale-100 motion-reduce:rotate-0")}
          />
          <X
            className={cn(ICON_MOTION, "size-5", !open && "scale-75 -rotate-90 opacity-0 motion-reduce:scale-100 motion-reduce:rotate-0")}
          />
        </button>
      </div>

      {reporting && <ReportIssueDialog onClose={() => setReporting(false)} />}
    </>
  );
}
