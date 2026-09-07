import type { PillTone } from "@/components/ui/pill";

/** Pure health helpers — safe to import from client components. */

/** Worst-first sort order (plan §4). */
const HEALTH_ORDER: Record<string, number> = {
  banned: 0,
  shadowbanned: 1,
  collapsing: 2,
  "system error": 3,
  watch: 4,
  "tracking broken": 5,
  "no data": 6,
  warming: 8,
  healthy: 9,
  inactive: 10,
};

export function healthRank(status: string): number {
  return HEALTH_ORDER[status] ?? 5;
}

export function healthTone(status: string): PillTone {
  // Severity ladder: red -> orange -> yellow -> grey, with cyan for warming and
  // green for healthy. StatusPill gives every tone the same flat ground, so the
  // ladder reads by hue alone (Garreth's Figma redesign 2026-09-07).
  if (["banned", "shadowbanned"].includes(status)) return "danger";
  if (["collapsing", "system error"].includes(status)) return "orange";
  if (status === "watch") return "warn";
  // Warming is an account working as intended, not an absence of information —
  // the accent separates it from the genuinely grey states.
  if (status === "warming") return "accent";
  if (status === "healthy") return "ok";
  // tracking broken / no data / inactive — we have no verdict, not a bad one.
  return "neutral";
}

/** Needs-attention grouping for the account filters. "inactive" is excluded —
 *  a parked account is a state, not a problem. */
export function needsAttention(status: string): boolean {
  return [
    "banned",
    "shadowbanned",
    "collapsing",
    "system error",
    "watch",
    "tracking broken",
    "no data",
  ].includes(status);
}

/*
 * The verdict itself now lives in the Postgres view v_account_health_v3 — the
 * same row the n8n View-Collapse Detector emails, so the app and the email
 * cannot drift. displayHealth(), resolveRamping() and isAccountFault() were
 * removed on 2026-09-03 once a parity check confirmed the SQL reproduced them
 * exactly across all 32 active accounts. The rules that used to live here:
 *   banned only with evidence (banned_at or a ban note) else inactive/no data
 *   suspected_burn -> shadowbanned · muted -> collapsing · ramping resolved
 *   warming · system error
 * What stays below is presentation only: ordering, colour, and the
 * needs-attention grouping the filter pills use.
 */

/**
 * Tone for the active-account count. Reflects FLEET SIZE, not recent bans — a
 * ban is worth a mention in the sub-text, but shouldn't paint a healthy fleet
 * red. Blue rather than green at full strength (Garreth 2026-09-02).
 */
export function fleetTone(activeAccounts: number): PillTone {
  return activeAccounts > 30 ? "accent" : activeAccounts >= 20 ? "warn" : "danger";
}
