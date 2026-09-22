import type { PillTone } from "@/components/ui/pill";
import type { RunState } from "@/lib/data/automation";

export function formatPhone(num: string | null): string {
  const digits = (num ?? "").replace(/\D/g, "");
  if (digits.length < 10) return num ?? "—";
  const d = digits.slice(-10);
  return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function daysTone(days: number | null): PillTone {
  if (days === null) return "neutral";
  if (days <= 3) return "danger";
  if (days <= 7) return "warn";
  return "ok";
}

export const RUN_STATE_TONE: Record<RunState, PillTone> = {
  ok: "ok",
  running: "info",
  pending: "neutral",
  stale: "warn",
  overdue: "danger",
  failed: "danger",
  unknown: "neutral",
  // Danger, not neutral: not knowing whether the fleet ran is an incident, and
  // a grey pill reads as "fine, nothing to see".
  unreachable: "danger",
};

export function formatEtShort(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatEtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/**
 * "Today 08:41", "Yesterday 21:05", "Sep 18 08:41" — a moment as the warmup
 * history reads it (PF-04), always in New York, which is the day every other
 * number on these screens is counted in.
 *
 * The day is compared as a New York calendar date rather than by subtracting
 * hours, so a warmup logged at 11pm is "Today" right up to midnight ET and not
 * a minute past it.
 */
export function etDateTime(iso: string | null): string {
  if (!iso) return "—";
  const day = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
  const at = new Date(iso);
  const today = day(new Date());
  const yesterday = day(new Date(Date.now() - 86_400_000));
  const when = day(at);
  const time = formatEtShort(iso);
  if (when === today) return `Today ${time}`;
  if (when === yesterday) return `Yesterday ${time}`;
  return `${formatEtDate(iso)} ${time}`;
}

/** "2026-09-03" → "September 3, 2026". The input is a plain calendar date that
 *  upstream already anchored to ET, so it is formatted in UTC on purpose:
 *  `new Date("2026-09-03")` is UTC midnight, and rendering that in ET would
 *  walk it back to September 2. */
export function formatLongDate(ymd: string | null): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}
