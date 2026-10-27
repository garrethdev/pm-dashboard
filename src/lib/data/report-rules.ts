import type { PillTone } from "@/components/ui/pill";

/**
 * The rules for an issue report (Garreth, 2026-10-09), shared by the form, the
 * API routes and the Issues page so the three can never disagree. Pure, so
 * the browser can use it as well as the server.
 *
 * The keys are what the database stores; its CHECK constraints
 * (supabase/migrations/20261009120000_issues.sql) list the same values.
 */
export const ISSUE_CATEGORIES = [
  { value: "warmup", label: "Warmup" },
  { value: "posting", label: "Posting" },
  { value: "accounts", label: "Accounts" },
  { value: "devices", label: "Devices & proxies" },
  { value: "content", label: "Content & generator" },
  { value: "data", label: "Data & numbers" },
  { value: "dashboard", label: "Dashboard" },
  { value: "other", label: "Other" },
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number]["value"];

export const ISSUE_STATUSES = [
  { value: "open", label: "Open", tone: "warn" },
  { value: "in_progress", label: "In progress", tone: "info" },
  { value: "fixed", label: "Fixed", tone: "ok" },
] as const satisfies readonly { value: string; label: string; tone: PillTone }[];

export type IssueStatus = (typeof ISSUE_STATUSES)[number]["value"];

export const DESCRIPTION_MAX = 2000;
export const PAGE_PATH_MAX = 300;

/** What the server will store. Anything else is shrunk to a JPEG first. */
export const SCREENSHOT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

export function isIssueCategory(v: unknown): v is IssueCategory {
  return ISSUE_CATEGORIES.some((c) => c.value === v);
}

export function isIssueStatus(v: unknown): v is IssueStatus {
  return ISSUE_STATUSES.some((s) => s.value === v);
}

export function categoryLabel(v: string): string {
  return ISSUE_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function statusOf(v: string): (typeof ISSUE_STATUSES)[number] {
  return ISSUE_STATUSES.find((s) => s.value === v) ?? ISSUE_STATUSES[0];
}

/** Why a report cannot be saved, or null when it can. */
export function reportRefusal(input: {
  category: unknown;
  description: unknown;
  pagePath: unknown;
}): string | null {
  if (!isIssueCategory(input.category)) return "Choose a category.";
  if (typeof input.description !== "string" || input.description.trim() === "") {
    return "Say what happened.";
  }
  if (input.description.trim().length > DESCRIPTION_MAX) {
    return `Keep it under ${DESCRIPTION_MAX} characters.`;
  }
  if (input.pagePath != null && !validPagePath(input.pagePath)) return "That page address is not valid.";
  return null;
}

/** A path inside this app, as the browser reports it: "/accounts?fleet=…". */
export function validPagePath(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && v.length <= PAGE_PATH_MAX;
}

export function screenshotRefusal(file: { type: string; size: number }): string | null {
  if (!(file.type in SCREENSHOT_TYPES)) return "The screenshot must be a JPG, PNG or WebP image.";
  if (file.size > SCREENSHOT_MAX_BYTES) return "The screenshot is larger than 5 MB.";
  return null;
}
