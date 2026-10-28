/**
 * The shape of Claude's read of a warmup report (Garreth, 2026-10-28), apart
 * from the call itself so the screen can import it: the call pulls in the
 * image library, which has no place in a browser bundle.
 */

/** Where the trouble lies, which says who has to act on it. */
export const REVIEW_CAUSES = ["phone", "platform", "robot", "account", "none", "unknown"] as const;
export type ReviewCause = (typeof REVIEW_CAUSES)[number];

export const CAUSE_LABEL: Record<ReviewCause, string> = {
  phone: "The phone",
  platform: "The app",
  robot: "The robot",
  account: "The account",
  none: "Nothing wrong",
  unknown: "Unclear",
};

export interface ReviewMoment {
  /** "14:05:09", New York, as the diary shows it; null when not tied to a time. */
  time: string | null;
  note: string;
}

export interface WarmupReview {
  summary: string;
  cause: ReviewCause;
  causeNote: string;
  nextStep: string;
  /** The platform showed a warning, a restriction or a login wall. */
  accountRisk: boolean;
  moments: ReviewMoment[];
}

const str = (v: unknown, max = 2000): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Read a stored or fresh review, tolerating anything that is not the shape. */
export function parseWarmupReview(raw: unknown): WarmupReview | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const summary = str(o.summary);
  if (!summary) return null;
  const cause = REVIEW_CAUSES.includes(o.cause as ReviewCause) ? (o.cause as ReviewCause) : "unknown";
  const moments = Array.isArray(o.moments)
    ? o.moments
        .map((m): ReviewMoment | null => {
          if (!m || typeof m !== "object") return null;
          const mm = m as Record<string, unknown>;
          const note = str(mm.note, 400);
          if (!note) return null;
          const time = str(mm.time, 8);
          return { time: /^\d{2}:\d{2}:\d{2}$/.test(time) ? time : null, note };
        })
        .filter((m): m is ReviewMoment => m !== null)
        .slice(0, 6)
    : [];
  return {
    summary,
    cause,
    causeNote: str(o.causeNote, 600),
    nextStep: str(o.nextStep, 600),
    accountRisk: o.accountRisk === true,
    moments,
  };
}
