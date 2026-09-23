import { cn } from "@/lib/utils";

export type PillTone =
  | "ok"
  | "warn"
  | "orange"
  | "danger"
  | "critical"
  | "gray"
  | "info"
  | "accent"
  | "neutral";

const TONES: Record<PillTone, string> = {
  // One flat ground for every tone; the label carries the state.
  ok: "bg-pill-bg text-ok",
  warn: "bg-pill-bg text-pill-yellow",
  orange: "bg-pill-bg text-pill-amber",
  danger: "bg-pill-bg text-pill-red",
  // The one exception: a solid alarm for the single state worse than
  // "collapsing", where the pill is meant to shout.
  critical: "bg-danger-deep text-white",
  // Its own grey, a hair lighter than --text-muted in dark mode, which fell
  // just short of 4.5:1 on this ground (P13 B2-5).
  gray: "bg-pill-bg text-pill-muted",
  info: "bg-pill-bg text-info",
  accent: "bg-pill-bg text-accent",
  neutral: "bg-pill-bg text-pill-muted",
};

/** Status pill — a label on a tinted background. The tone carries the state;
 *  a leading dot on top of that was redundant decoration (Garreth 2026-09-07). */
export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
