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
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
  orange: "bg-orange/10 text-orange",
  danger: "bg-danger/10 text-danger",
  // Kept for future use; no status maps here since health pills went to a
  // uniform 10% tint (Garreth 2026-09-02).
  critical: "bg-danger-deep text-white",
  // Same 10% tint as the status tones, but muted — for a state that is
  // notable without being an alarm (e.g. an EMPTY production lane).
  gray: "bg-text-muted/10 text-text-muted",
  info: "bg-info/10 text-info",
  accent: "bg-accent/10 text-accent",
  neutral: "bg-card-raised text-text-muted",
};

/** Status pill — dot + label on a tinted background (reference style: "Completed"). */
export function StatusPill({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: PillTone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
