/**
 * The rules of a recorded posting session (PF-26), kept pure so they can be
 * tested without a database.
 *
 * A session is the span the Air kept frames for: from the first frame to the
 * last. A hand-out (`post_deliveries`) is marked posted by Yurie in the
 * dashboard, usually right after she posts and sometimes a while later, after
 * the phone is unplugged. So a session "covers" a post when the post was
 * marked done a little before the first frame or up to half an hour after the
 * last one. The same slack says whether a plug-in span covered a post.
 */

/** A post marked done up to this long BEFORE the first frame still belongs to the session. */
export const MATCH_BEFORE_MS = 5 * 60_000;
/** A post marked done up to this long AFTER the last frame still belongs to the session. */
export const MATCH_AFTER_MS = 30 * 60_000;

/** The most frames one session may announce. Twenty minutes of changed screens is a few hundred. */
export const MAX_FRAMES_PER_SESSION = 3000;
/** How many frames Claude is shown. Picked evenly across the session. */
export const REVIEW_FRAME_LIMIT = 40;

export interface SessionSpan {
  deviceId: number;
  startedAt: string;
  endedAt: string;
}

export interface DoneDelivery {
  id: number;
  deviceId: number | null;
  status: string;
  doneAt: string | null;
}

export interface PlugSpan {
  deviceId: number;
  pluggedInAt: string;
  /** Null while the phone is still plugged in. */
  unpluggedAt: string | null;
}

const ms = (iso: string) => Date.parse(iso);

/**
 * True when a span from `from` to `to` (open-ended when `to` is null) touches
 * the window around an instant: the instant may fall up to MATCH_AFTER_MS
 * after the span ends and up to MATCH_BEFORE_MS before it begins.
 */
export function spanCovers(from: string, to: string | null, instant: string): boolean {
  const t = ms(instant);
  const start = ms(from) - MATCH_BEFORE_MS;
  const end = to === null ? Number.POSITIVE_INFINITY : ms(to) + MATCH_AFTER_MS;
  return t >= start && t <= end;
}

/** A session on the same phone whose window holds the post's done time. */
export function sessionCovers(session: SessionSpan, delivery: DoneDelivery): boolean {
  if (delivery.doneAt === null || delivery.deviceId !== session.deviceId) return false;
  return spanCovers(session.startedAt, session.endedAt, delivery.doneAt);
}

/**
 * The hand-out a session recorded: a posted delivery on the same phone inside
 * the window, the one marked done nearest the session's end when several
 * were. Null when nothing was marked done in the window.
 */
export function matchDelivery<T extends DoneDelivery>(session: SessionSpan, deliveries: T[]): T | null {
  const end = ms(session.endedAt);
  let best: T | null = null;
  let bestGap = Number.POSITIVE_INFINITY;
  for (const d of deliveries) {
    // Scheduling a post inside the platform is the same work on the phone as
    // posting it, so a session that did it is matched to it (2026-10-28).
    if ((d.status !== "posted" && d.status !== "scheduled") || !sessionCovers(session, d)) continue;
    const gap = Math.abs(ms(d.doneAt!) - end);
    if (gap < bestGap) {
      best = d;
      bestGap = gap;
    }
  }
  return best;
}

export type MissingReason = "not_plugged_in" | "recorder_missed";

export interface MissingRecording<T extends DoneDelivery> {
  delivery: T;
  reason: MissingReason;
}

/**
 * The cross-check that makes the plug-in rule hold (docs/PHONE-SCREEN-QA.md):
 * every post marked done on a phone with no session covering it. The plug-in
 * log then says which of the two things happened: no plug-in span covered
 * the post either, so the phone was not connected; or one did, so the
 * recorder failed and that is on us.
 *
 * A post with no phone on its row (an account not on a phone) or no done time
 * is not a manual posting session and is left out.
 */
export function postsWithoutRecording<T extends DoneDelivery>(
  deliveries: T[],
  sessions: SessionSpan[],
  plugs: PlugSpan[],
): MissingRecording<T>[] {
  const out: MissingRecording<T>[] = [];
  for (const d of deliveries) {
    if (d.status !== "posted" || d.doneAt === null || d.deviceId === null) continue;
    if (sessions.some((s) => sessionCovers(s, d))) continue;
    const plugged = plugs.some(
      (p) => p.deviceId === d.deviceId && spanCovers(p.pluggedInAt, p.unpluggedAt, d.doneAt!),
    );
    out.push({ delivery: d, reason: plugged ? "recorder_missed" : "not_plugged_in" });
  }
  return out;
}

/** Whole minutes between two instants, never below 0. */
export function spanMinutes(from: string, to: string): number {
  return Math.max(0, Math.round((ms(to) - ms(from)) / 60_000));
}

/**
 * Which of `count` frames to show when only `limit` fit: the first, the last,
 * and the rest spread evenly, so a twenty-minute session is read start to end
 * rather than its first two minutes in detail.
 */
export function sampleEvenly(count: number, limit: number): number[] {
  if (count <= 0 || limit <= 0) return [];
  if (count <= limit) return Array.from({ length: count }, (_, i) => i);
  if (limit === 1) return [0];
  const picked = new Set<number>();
  for (let i = 0; i < limit; i++) {
    picked.add(Math.round((i * (count - 1)) / (limit - 1)));
  }
  return [...picked].sort((a, b) => a - b);
}

/** The file types a frame may be, and the extension each is stored under. */
export const FRAME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Where a frame lives in the bucket: under its session, numbered in order,
 * with the seconds since the session's first frame in the name so the page
 * and the review can say "at 3:12" without reading anything else.
 */
export function framePath(sessionId: number, index: number, elapsedSec: number, type: string): string {
  const ext = FRAME_TYPES[type] ?? "jpg";
  const n = String(index + 1).padStart(4, "0");
  const t = String(Math.max(0, Math.round(elapsedSec))).padStart(6, "0");
  return `sessions/${sessionId}/${n}-t${t}.${ext}`;
}

export interface FrameInfo {
  path: string;
  /** 1-based, as the file is numbered. */
  number: number;
  elapsedSec: number;
}

/** Read a frame's number and time back out of its path. Null for a stray file. */
export function frameInfo(path: string): FrameInfo | null {
  const m = /\/(\d{4})-t(\d{6})\.(?:jpg|png|webp)$/.exec(path);
  if (!m) return null;
  return { path, number: Number(m[1]), elapsedSec: Number(m[2]) };
}

/** "3:12" for 192 seconds; "1:03:05" past an hour. */
export function elapsedLabel(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}
