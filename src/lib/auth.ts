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
 * Dev-only auth bypass so the design shell can be previewed before Supabase
 * Auth email delivery is configured. Never honored in production builds.
 */
export function authBypassed(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.AUTH_BYPASS === "true";
}
