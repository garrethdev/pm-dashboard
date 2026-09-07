"use client";

import { Minus, Plus } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

/**
 * Numeric stepper with hard caps.
 *
 * The caps are the point: wherever a number is one share of a fixed budget,
 * `max` is set to what is actually left, so the + button stops rather than
 * letting someone save a total the scheduler can never honour. Used by the
 * fleet cadence editor and by the content type pause/retire rebalance.
 */
export function Stepper({
  label,
  hint,
  hintTone = "muted",
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
}: {
  label: string;
  hint?: string;
  hintTone?: "muted" | "danger";
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="truncate text-xs text-text-muted">{label}</span>
        {hint && (
          <span
            className={cn(
              "shrink-0 text-[11px]",
              hintTone === "danger" ? "text-danger" : "text-text-muted",
            )}
          >
            {hint}
          </span>
        )}
      </div>
      <div className="flex items-stretch overflow-hidden rounded-nested border border-border bg-bg/60">
        <StepButton
          onClick={() => onChange(clamp(value - step))}
          disabled={value <= min}
          label={`decrease ${label}`}
        >
          <Minus className="size-3" />
        </StepButton>
        <div className="flex w-full min-w-0 items-center border-x border-border">
          <input
            type="text"
            inputMode="numeric"
            value={String(value)}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              onChange(raw === "" ? min : clamp(Number(raw)));
            }}
            className="w-full min-w-0 bg-transparent px-1 py-1.5 text-center text-sm outline-none tnum"
          />
          {suffix && <span className="pr-2 text-[11px] text-text-muted">{suffix}</span>}
        </div>
        <StepButton
          onClick={() => onChange(clamp(value + step))}
          disabled={value >= max}
          label={`increase ${label}`}
        >
          <Plus className="size-3" />
        </StepButton>
      </div>
    </div>
  );
}

function StepButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex w-7 shrink-0 items-center justify-center text-text-muted transition-colors hover:bg-card hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
