/**
 * Email allowlist — the only people who may sign in (plan §1: Garreth, Czed, Milan).
 * Comes from ALLOWED_EMAILS (comma-separated), compared case-insensitively.
 */
export function allowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | undefined | null): boolean {
  if (!email) return false;
  return allowedEmails().includes(email.trim().toLowerCase());
}

/**
 * The reviewers (PF-26, Garreth 2026-10-21): the people who may open the
 * Sessions page, where Yurie's recorded posting sessions are read. Comes from
 * REVIEWER_EMAILS, the same shape as ALLOWED_EMAILS. Someone listed here but
 * not in ALLOWED_EMAILS still cannot sign in; this only narrows, never widens.
 *
 * There is no role system in the app, only the one allowlist, so this is a
 * second list rather than a column: the page is for two people and must not
 * exist for the third.
 */
export function reviewerEmails(): string[] {
  return (process.env.REVIEWER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isReviewer(email: string | undefined | null): boolean {
  if (!email) return false;
  const e = email.trim().toLowerCase();
  return isEmailAllowed(e) && reviewerEmails().includes(e);
}

/**
 * Dev-only auth bypass so the design shell can be previewed before Supabase
 * Auth email delivery is configured. Never honored in production builds.
 */
export function authBypassed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_BYPASS === "true";
}
