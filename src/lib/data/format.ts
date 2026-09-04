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
