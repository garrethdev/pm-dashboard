import type { PillTone } from "@/components/ui/pill";

/**
 * The rules for a report (Garreth, 2026-10-09; observations and accounts
 * Garreth, Czedrick and Yurie, 2026-10-27), shared by the form, the API routes and the Reports page so the
 * three can never disagree. Pure, so the browser can use it as well as the
 * server.
 *
 * A report is an ISSUE (something broken, with a status) or an OBSERVATION
 * (something noticed, no status). The database still calls the table
 * `issues`; its CHECK constraints
 * (supabase/migrations/20261009074838_issues.sql and
 * 20261027065152_reports_observations_and_accounts.sql) list the same values
 * as here.
 */
export const REPORT_KINDS = [
  { value: "issue", label: "Issue" },
  { value: "observation", label: "Observation" },
] as const;

export type ReportKind = (typeof REPORT_KINDS)[number]["value"];

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

/** An issue's status. An observation has none. */
export const ISSUE_STATUSES = [
  { value: "open", label: "Open", tone: "warn" },
  { value: "in_progress", label: "In progress", tone: "info" },
  { value: "fixed", label: "Fixed", tone: "ok" },
] as const satisfies readonly { value: string; label: string; tone: PillTone }[];

export type IssueStatus = (typeof ISSUE_STATUSES)[number]["value"];

export const DESCRIPTION_MAX = 2000;
export const PAGE_PATH_MAX = 300;
/** Accounts one report can name. Enough for "these five did better". */
export const REPORT_ACCOUNTS_MAX = 10;
const POST_ID_MAX = 100;

/** What the server will store. Anything else is shrunk to a JPEG first. */
export const SCREENSHOT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const SCREENSHOT_MAX_BYTES = 5 * 1024 * 1024;

/** An account a report names, by Profile, and optionally one of its posts. */
export interface ReportAccountInput {
  profile: string;
  postId: string | null;
}

export function isReportKind(v: unknown): v is ReportKind {
  return REPORT_KINDS.some((k) => k.value === v);
}

export function isIssueCategory(v: unknown): v is IssueCategory {
  return ISSUE_CATEGORIES.some((c) => c.value === v);
}

export function isIssueStatus(v: unknown): v is IssueStatus {
  return ISSUE_STATUSES.some((s) => s.value === v);
}

export function kindLabel(v: string): string {
  return REPORT_KINDS.find((k) => k.value === v)?.label ?? v;
}

export function categoryLabel(v: string): string {
  return ISSUE_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

export function statusOf(v: string): (typeof ISSUE_STATUSES)[number] {
  return ISSUE_STATUSES.find((s) => s.value === v) ?? ISSUE_STATUSES[0];
}

/** Why a report cannot be saved, or null when it can. */
export function reportRefusal(input: {
  kind: unknown;
  category: unknown;
  description: unknown;
  pagePath: unknown;
  accounts: unknown;
}): string | null {
  if (!isReportKind(input.kind)) return "Choose Issue or Observation.";
  if (!isIssueCategory(input.category)) return "Choose a category.";
  if (typeof input.description !== "string" || input.description.trim() === "") {
    return input.kind === "observation" ? "Say what you noticed." : "Say what happened.";
  }
  if (input.description.trim().length > DESCRIPTION_MAX) {
    return `Keep it under ${DESCRIPTION_MAX} characters.`;
  }
  if (input.pagePath != null && !validPagePath(input.pagePath)) return "That page address is not valid.";
  return accountsRefusal(input.accounts);
}

/** A path inside this app, as the browser reports it: "/accounts?fleet=…". */
export function validPagePath(v: unknown): v is string {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && v.length <= PAGE_PATH_MAX;
}

const PROFILE_RE = /^Profile \d+$/;

/** Why a list of accounts cannot be saved, or null when it can. An empty list is fine. */
export function accountsRefusal(v: unknown): string | null {
  if (!Array.isArray(v)) return "The accounts are not valid.";
  if (v.length > REPORT_ACCOUNTS_MAX) return `Name ${REPORT_ACCOUNTS_MAX} accounts at most.`;
  const seen = new Set<string>();
  for (const a of v as unknown[]) {
    if (!isReportAccount(a)) return "The accounts are not valid.";
    if (seen.has(a.profile)) return `${a.profile} is named twice.`;
    seen.add(a.profile);
  }
  return null;
}

function isReportAccount(v: unknown): v is ReportAccountInput {
  if (typeof v !== "object" || v === null) return false;
  const { profile, postId } = v as Record<string, unknown>;
  if (typeof profile !== "string" || !PROFILE_RE.test(profile)) return false;
  return postId === null || (typeof postId === "string" && postId !== "" && postId.length <= POST_ID_MAX);
}

/**
 * The accounts field of the form, which arrives as JSON text. Anything that is
 * not JSON reads as not-a-list, so `accountsRefusal` refuses it.
 */
export function parseAccountsField(raw: FormDataEntryValue | null): unknown {
  if (raw === null || raw === "") return [];
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function screenshotRefusal(file: { type: string; size: number }): string | null {
  if (!(file.type in SCREENSHOT_TYPES)) return "The screenshot must be a JPG, PNG or WebP image.";
  if (file.size > SCREENSHOT_MAX_BYTES) return "The screenshot is larger than 5 MB.";
  return null;
}
