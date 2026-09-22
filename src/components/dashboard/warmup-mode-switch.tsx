"use client";

import { Hand, Robot } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/** Who warms an account up: a person, or the script on the Air (PF-04). */
export type WarmupMode = "manual" | "script";

/**
 * The Manual / Automated warmup switch — design ticket P4.
 *
 * TWO ICONS AND NO WORDS (Garreth, 2026-09-22): a hand for the work a person
 * does, a robot for the work the script does. The same robot the to-do list
 * already uses for a task nobody ticks, so the two screens say the same thing
 * with the same mark. The words live in the hover tooltip, which is also what
 * a screen reader is given; nothing depends on the hover, since the lit icon
 * says which way the account is set.
 *
 * `mixed` is for the phone-wide switch over a phone whose accounts disagree —
 * two Manual and one Automated. Neither icon lights, because lighting one
 * would be a lie about the third, and the tooltip changes to "Set ALL to…" so
 * the press says plainly that it is about to make them agree.
 *
 * Nothing is saved. `accounts` has no warmup-mode column until PF-04 adds one,
 * so the switch moves in the browser and forgets; it is here to be judged, not
 * used.
 */
export function WarmupModeSwitch({
  mode,
  onChange,
  className,
}: {
  /** "mixed" only ever comes from a phone whose accounts do not agree. */
  mode: WarmupMode | "mixed";
  onChange: (mode: WarmupMode) => void;
  className?: string;
}) {
  const all = mode === "mixed" ? "all " : "";

  return (
    <span
      role="radiogroup"
      aria-label="Warmup"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full bg-card-raised p-0.5",
        className,
      )}
    >
      <ModeButton
        label={`Set ${all}to manual`}
        on={mode === "manual"}
        onClick={() => onChange("manual")}
      >
        <Hand className="size-3.5" />
      </ModeButton>
      <ModeButton
        label={`Set ${all}to automated`}
        on={mode === "script"}
        onClick={() => onChange("script")}
      >
        <Robot className="size-3.5" />
      </ModeButton>
    </span>
  );
}

function ModeButton({
  label,
  on,
  onClick,
  children,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        role="radio"
        aria-checked={on}
        aria-label={label}
        onClick={onClick}
        className={cn(
          // 24px inside a 28px pill, matching the other segmented switches;
          // the ::after gives it a 40px hit area it does not have to show.
          "relative flex size-6 items-center justify-center rounded-full transition-colors",
          "after:absolute after:-inset-2 after:content-['']",
          on ? "bg-accent text-bg" : "text-text-muted hover:text-text-primary",
        )}
      >
        {children}
      </button>
    </Tooltip>
  );
}
