/**
 * Recorded posting sessions (PF-26, Garreth 2026-10-21).
 *
 * The Air records Yurie's manual posting sessions as invisible screenshots
 * (docs/PHONE-SCREEN-QA.md) and sends each one here overnight in three
 * steps: announce the session (operation 8), ask for upload links for its
 * frames in batches and PUT them straight into the private bucket (operation
 * 9), then ask the dashboard to confirm (operation 10). The dashboard lists
 * the bucket and only says "stored" when every frame it was told to expect
 * is there, and only then does the Air delete its copy. A session that is
 * never confirmed stays `open` and is never listed for review.
 *
 * Beside the sessions, the Air logs every plug-in and unplug (operation 11)
 * so a post with no recording can be told apart from a recorder that failed.
 *
 * `phone_sessions` and `phone_plug_events` are service-role only (RLS on, no
 * policies), like `devices`. Reads here are not cached: the page is for two
 * reviewers and is read rarely.
 */

import {
  framePath,
  frameInfo,
  matchDelivery,
  MATCH_BEFORE_MS,
  MAX_FRAMES_PER_SESSION,
  postsWithoutRecording,
  type FrameInfo,
  type MissingReason,
  type PlugSpan,
} from "@/lib/data/phone-session-rules";
import { listFrames, signFrameUpload } from "@/lib/data/phone-session-storage";
import { getPostedDeliveries, type PostDelivery } from "@/lib/data/post-deliveries";
import { getDevices } from "@/lib/data/devices";
import { RunnerError } from "@/lib/data/warmup-runs";
import { sbFetch } from "@/lib/data/warmup-sessions";

export type ReviewSeverity = "low" | "medium" | "high";
export const REVIEW_SEVERITIES: ReviewSeverity[] = ["low", "medium", "high"];

/**
 * What a session was (Czedrick, 2026-10-23): a post being made, a manual
 * warmup (the feed scrolled, accounts switched, likes and follows, a profile
 * left open; nothing posted), or something else. Claude's read sets it; a
 * reviewer can overrule it, and that choice survives a second read.
 */
export type SessionKind = "posting" | "manual_warmup" | "other";
export const SESSION_KINDS: SessionKind[] = ["posting", "manual_warmup", "other"];
export type KindSetBy = "claude" | "reviewer";

export const KIND_LABEL: Record<SessionKind, string> = {
  posting: "Posting",
  manual_warmup: "Manual warmup",
  other: "Other",
};

export function parseKind(raw: unknown): SessionKind | null {
  return SESSION_KINDS.includes(raw as SessionKind) ? (raw as SessionKind) : null;
}

/**
 * What to call the session, and on whose word: a reviewer's or the read's
 * kind when there is one; otherwise a matched post already says "posting"
 * (Czedrick, 2026-10-23: the Post column knew and the Kind column said
 * "not yet known"); otherwise nothing yet.
 */
export function effectiveKind(s: {
  kind: SessionKind | null;
  kindSetBy: KindSetBy | null;
  matchedPost: MatchedPost | null;
}): { kind: SessionKind | null; from: KindSetBy | "post" | null } {
  if (s.kind) return { kind: s.kind, from: s.kindSetBy };
  if (s.matchedPost) return { kind: "posting", from: "post" };
  return { kind: null, from: null };
}

export interface ReviewAnomaly {
  /** The frame it was seen in, by number; null when it is about the session as a whole. */
  frame: number | null;
  severity: ReviewSeverity;
  what: string;
}

/** Claude's read of one session. Stored as sent, cut to size on the way in. */
export interface SessionReview {
  summary: string;
  /** Whether a post was seen going out. Null when Claude could not tell. */
  postSeen: boolean | null;
  /** What kind of session Claude saw, and why in a sentence. Null when it could not tell. */
  kind: SessionKind | null;
  kindNote: string;
  timeline: { frame: number; note: string }[];
  anomalies: ReviewAnomaly[];
}

export interface MatchedPost {
  id: number;
  contentType: string;
  doneAt: string | null;
  username: string | null;
  platform: string | null;
}

export type SessionStatus = "open" | "stored";

export interface PhoneSession {
  id: number;
  deviceId: number;
  deviceName: string | null;
  startedAt: string;
  endedAt: string;
  status: SessionStatus;
  expectedFrames: number;
  frameCount: number;
  storedAt: string | null;
  matchedPost: MatchedPost | null;
  /** What the session was, and who said so. Null until a read or a reviewer sets it. */
  kind: SessionKind | null;
  kindSetBy: KindSetBy | null;
  reviewedAt: string | null;
  reviewModel: string | null;
  reviewSummary: string | null;
  review: SessionReview | null;
}

interface RawSession {
  id: number;
  device_id: number;
  started_at: string;
  ended_at: string;
  status: string;
  expected_frames: number;
  frame_count: number;
  stored_at: string | null;
  kind: string | null;
  kind_set_by: string | null;
  reviewed_at: string | null;
  review_model: string | null;
  review_summary: string | null;
  review: unknown;
  device: { name: string } | null;
  matched: {
    id: number;
    content_type: string;
    done_at: string | null;
    account: { username: string | null; platform: string | null } | null;
  } | null;
}

/** `accounts` carries live credentials: its columns are named, never `*`. */
const COLS =
  "id,device_id,started_at,ended_at,status,expected_frames,frame_count,stored_at," +
  "kind,kind_set_by,reviewed_at,review_model,review_summary,review," +
  "device:devices(name)," +
  "matched:post_deliveries!phone_sessions_matched_delivery_id_fkey(id,content_type,done_at,account:accounts(username,platform))";

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Read a stored review back, tolerating anything that is not the shape. */
export function parseReview(raw: unknown): SessionReview | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const timeline = Array.isArray(r.timeline)
    ? r.timeline
        .map((t) => {
          const o = (t ?? {}) as Record<string, unknown>;
          return { frame: Number(o.frame), note: str(o.note, 300) };
        })
        .filter((t) => Number.isInteger(t.frame) && t.frame > 0 && t.note)
        .slice(0, 60)
    : [];
  const anomalies = Array.isArray(r.anomalies)
    ? r.anomalies
        .map((a): ReviewAnomaly => {
          const o = (a ?? {}) as Record<string, unknown>;
          const frame = Number.isInteger(o.frame) && Number(o.frame) > 0 ? Number(o.frame) : null;
          const severity = REVIEW_SEVERITIES.includes(o.severity as ReviewSeverity) ? (o.severity as ReviewSeverity) : "low";
          return { frame, severity, what: str(o.what, 400) };
        })
        .filter((a) => a.what)
        .slice(0, 30)
    : [];
  return {
    summary: str(r.summary, 1500),
    postSeen: typeof r.postSeen === "boolean" ? r.postSeen : null,
    kind: parseKind(r.kind),
    kindNote: str(r.kindNote, 300),
    timeline,
    anomalies,
  };
}

function toSession(r: RawSession): PhoneSession {
  return {
    id: r.id,
    deviceId: r.device_id,
    deviceName: r.device?.name ?? null,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    status: r.status === "stored" ? "stored" : "open",
    expectedFrames: r.expected_frames,
    frameCount: r.frame_count,
    storedAt: r.stored_at,
    matchedPost: r.matched
      ? {
          id: r.matched.id,
          contentType: r.matched.content_type,
          doneAt: r.matched.done_at,
          username: r.matched.account?.username ?? null,
          platform: r.matched.account?.platform ?? null,
        }
      : null,
    kind: parseKind(r.kind),
    kindSetBy: r.kind_set_by === "claude" || r.kind_set_by === "reviewer" ? r.kind_set_by : null,
    reviewedAt: r.reviewed_at,
    reviewModel: r.review_model,
    reviewSummary: r.review_summary,
    review: parseReview(r.review),
  };
}

async function readRows(path: string, what: string): Promise<PhoneSession[]> {
  const res = await sbFetch(path, {});
  if (!res.ok) throw new Error(`Couldn't read ${what} (HTTP ${res.status})`);
  return ((await res.json()) as RawSession[]).map(toSession);
}

async function deviceExists(deviceId: number): Promise<boolean> {
  const res = await sbFetch(`devices?select=id&id=eq.${deviceId}&limit=1`, {});
  if (!res.ok) throw new Error(`Couldn't read the phone (HTTP ${res.status})`);
  return ((await res.json()) as unknown[]).length > 0;
}

// ── The Air's side ─────────────────────────────────────────────────────

export interface AnnounceInput {
  deviceId: number;
  startedAt: string;
  endedAt: string;
  expectedFrames: number;
}

/**
 * Operation 8: a session is on its way. Named by the phone and the first
 * frame's time, so an announcement sent twice lands on one row. A session
 * already stored is answered as such and nothing changes.
 */
export async function announceSession(
  input: AnnounceInput,
): Promise<{ id: number; status: SessionStatus; alreadyStored: boolean }> {
  if (!(await deviceExists(input.deviceId))) throw new RunnerError("No phone with that id.", 409, "not_found");
  if (input.expectedFrames > MAX_FRAMES_PER_SESSION) {
    throw new RunnerError(`A session may announce at most ${MAX_FRAMES_PER_SESSION} frames.`, 400, "invalid_body");
  }
  const existing = await readRows(
    `phone_sessions?select=${COLS}&device_id=eq.${input.deviceId}&started_at=eq.${encodeURIComponent(input.startedAt)}&limit=1`,
    "the session",
  );
  if (existing[0]?.status === "stored") return { id: existing[0].id, status: "stored", alreadyStored: true };
  if (existing[0]) {
    const res = await sbFetch(`phone_sessions?id=eq.${existing[0].id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ ended_at: input.endedAt, expected_frames: input.expectedFrames }),
    });
    if (!res.ok) throw new Error(`Couldn't update the session (HTTP ${res.status})`);
    return { id: existing[0].id, status: "open", alreadyStored: false };
  }
  const res = await sbFetch("phone_sessions?select=id", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify({
      device_id: input.deviceId,
      started_at: input.startedAt,
      ended_at: input.endedAt,
      expected_frames: input.expectedFrames,
    }),
  });
  if (!res.ok) throw new Error(`Couldn't record the session (HTTP ${res.status})`);
  const rows = (await res.json()) as { id: number }[];
  return { id: rows[0].id, status: "open", alreadyStored: false };
}

export interface FrameRequest {
  /** 0-based position of the frame in the session. */
  index: number;
  /** Seconds since the session's first frame. */
  elapsedSec: number;
  type: string;
}

/** How many frames one operation-9 call may ask links for. */
export const FRAME_BATCH_LIMIT = 200;

/**
 * Operation 9: one-time upload links for a batch of frames. Signed in small
 * parallel groups so two hundred links come back in a couple of seconds.
 * A link for a frame already uploaded overwrites it, so a retry is safe.
 */
export async function signFrameBatch(
  sessionId: number,
  frames: FrameRequest[],
): Promise<{ status: SessionStatus; uploads: { index: number; path: string; url: string }[] }> {
  const session = await getSession(sessionId);
  if (!session) throw new RunnerError("No session with that id.", 404, "session_not_found");
  if (session.status === "stored") return { status: "stored", uploads: [] };
  const uploads: { index: number; path: string; url: string }[] = [];
  const group = 25;
  for (let i = 0; i < frames.length; i += group) {
    const slice = frames.slice(i, i + group);
    const urls = await Promise.all(
      slice.map((f) => {
        const path = framePath(sessionId, f.index, f.elapsedSec, f.type);
        return signFrameUpload(path).then((url) => ({ index: f.index, path, url }));
      }),
    );
    uploads.push(...urls);
  }
  return { status: "open", uploads };
}

export interface CompleteResult {
  stored: boolean;
  found: number;
  expected: number;
}

/**
 * Operation 10: the Air says every frame is up. The dashboard counts what is
 * actually in the bucket and only then marks the session stored and matches
 * it to the hand-out it covers. Fewer frames than expected is a refusal, and
 * the Air keeps its copy; more is fine (the Air may have kept extras).
 */
export async function completeSession(sessionId: number): Promise<CompleteResult> {
  const session = await getSession(sessionId);
  if (!session) throw new RunnerError("No session with that id.", 404, "session_not_found");
  const frames = (await listFrames(`sessions/${sessionId}/`)).filter((p) => frameInfo(p) !== null);
  const found = frames.length;
  if (session.status === "stored") return { stored: true, found, expected: session.expectedFrames };
  if (found < session.expectedFrames || found === 0) return { stored: false, found, expected: session.expectedFrames };

  const since = new Date(Date.parse(session.startedAt) - MATCH_BEFORE_MS).toISOString();
  let matched: PostDelivery | null = null;
  try {
    const candidates = (await getPostedDeliveries({ since, limit: 100 })).filter((d) => d.deviceId === session.deviceId);
    matched = matchDelivery(session, candidates);
  } catch (err) {
    // The frames are safe either way; a match can be made on the next read.
    console.error("matching the session to a hand-out failed:", err);
  }
  const res = await sbFetch(`phone_sessions?id=eq.${sessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "stored",
      frame_count: found,
      stored_at: new Date().toISOString(),
      matched_delivery_id: matched?.id ?? null,
    }),
  });
  if (!res.ok) throw new Error(`Couldn't mark the session stored (HTTP ${res.status})`);
  return { stored: true, found, expected: session.expectedFrames };
}

export interface PlugEventInput {
  deviceId: number;
  pluggedInAt: string;
  unpluggedAt: string | null;
}

/**
 * Operation 11: a plug-in, and later its unplug (the same plug-in time with
 * `unpluggedAt` filled). One row per phone and plug-in time; sending it again
 * updates the unplug time and nothing else.
 */
export async function recordPlugEvent(input: PlugEventInput): Promise<{ id: number }> {
  if (!(await deviceExists(input.deviceId))) throw new RunnerError("No phone with that id.", 409, "not_found");
  const res = await sbFetch("phone_plug_events?select=id&on_conflict=device_id,plugged_in_at", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      device_id: input.deviceId,
      plugged_in_at: input.pluggedInAt,
      unplugged_at: input.unpluggedAt,
    }),
  });
  if (!res.ok) throw new Error(`Couldn't record the plug-in (HTTP ${res.status})`);
  const rows = (await res.json()) as { id: number }[];
  return { id: rows[0].id };
}

// ── The reviewers' side ────────────────────────────────────────────────

/** Stored sessions, newest first. */
export function getSessions(opts: { since?: string; limit?: number } = {}): Promise<PhoneSession[]> {
  const parts = [`select=${COLS}`, "status=eq.stored", "order=started_at.desc", `limit=${opts.limit ?? 100}`];
  if (opts.since) parts.push(`started_at=gte.${encodeURIComponent(opts.since)}`);
  return readRows(`phone_sessions?${parts.join("&")}`, "the recorded sessions");
}

/** One session, any status. Null when it does not exist. */
export async function getSession(id: number): Promise<PhoneSession | null> {
  const rows = await readRows(`phone_sessions?select=${COLS}&id=eq.${id}&limit=1`, "the session");
  return rows[0] ?? null;
}

/** The session's frames, in order, with their number and elapsed time. */
export async function getSessionFrames(id: number): Promise<FrameInfo[]> {
  const paths = await listFrames(`sessions/${id}/`);
  return paths.map(frameInfo).filter((f): f is FrameInfo => f !== null).sort((a, b) => a.number - b.number);
}

/**
 * Save Claude's read. The read's kind goes on the row too, unless a reviewer
 * has set the kind by hand: a person's choice outranks a second read.
 */
export async function saveReview(
  id: number,
  input: { model: string; review: SessionReview; by: string; reviewerSetKind: boolean },
): Promise<void> {
  const kind = !input.reviewerSetKind && input.review.kind ? { kind: input.review.kind, kind_set_by: "claude" } : {};
  const res = await sbFetch(`phone_sessions?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.by,
      review_model: input.model,
      review_summary: input.review.summary,
      review: input.review,
      ...kind,
    }),
  });
  if (!res.ok) throw new Error(`Couldn't save the review (HTTP ${res.status})`);
}

/** A reviewer says what the session was; null clears it, so the next read may set it again. */
export async function setSessionKind(id: number, kind: SessionKind | null): Promise<void> {
  const res = await sbFetch(`phone_sessions?id=eq.${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ kind, kind_set_by: kind ? "reviewer" : null }),
  });
  if (!res.ok) throw new Error(`Couldn't save the kind (HTTP ${res.status})`);
}

export interface PlugEvent extends PlugSpan {
  id: number;
}

interface RawPlug {
  id: number;
  device_id: number;
  plugged_in_at: string;
  unplugged_at: string | null;
}

export async function getPlugEvents(since: string): Promise<PlugEvent[]> {
  const res = await sbFetch(
    `phone_plug_events?select=id,device_id,plugged_in_at,unplugged_at&plugged_in_at=gte.${encodeURIComponent(since)}&order=plugged_in_at.desc&limit=1000`,
    {},
  );
  if (!res.ok) throw new Error(`Couldn't read the plug-in log (HTTP ${res.status})`);
  return ((await res.json()) as RawPlug[]).map((r) => ({
    id: r.id,
    deviceId: r.device_id,
    pluggedInAt: r.plugged_in_at,
    unpluggedAt: r.unplugged_at,
  }));
}

export interface MissingRecording {
  deliveryId: number;
  deviceId: number;
  deviceName: string | null;
  username: string | null;
  platform: string | null;
  contentType: string;
  doneAt: string;
  reason: MissingReason;
}

/** How far back the "Posts with no recording" list looks. */
export const MISSING_LOOKBACK_DAYS = 14;

/**
 * Every post marked done on a phone in the last two weeks that no stored
 * session covers, and why: the phone was not plugged in, or it was and the
 * recorder missed it. Not shown anywhere since 2026-10-23 (Czedrick: the
 * Sessions page lists only what there are frames to read); kept with its
 * rules and tests in case the cross-check is wanted again.
 */
export async function getMissingRecordings(now: Date = new Date()): Promise<MissingRecording[]> {
  const since = new Date(now.getTime() - MISSING_LOOKBACK_DAYS * 86_400_000).toISOString();
  // Sessions and plug-ins from a little earlier, so a post done at the edge of
  // the window still finds the session that covered it.
  const earlier = new Date(Date.parse(since) - 86_400_000).toISOString();
  const [deliveries, sessions, plugs, devices] = await Promise.all([
    getPostedDeliveries({ since, limit: 500 }),
    getSessions({ since: earlier, limit: 1000 }),
    getPlugEvents(earlier),
    getDevices().then((d) => d.data),
  ]);
  const byDevice = new Map(devices.map((d) => [d.id, d]));
  const accountOf = new Map(devices.flatMap((d) => d.accounts.map((a) => [a.id, a] as const)));
  return postsWithoutRecording(deliveries, sessions, plugs).map(({ delivery, reason }) => {
    const account = accountOf.get(delivery.accountId);
    return {
      deliveryId: delivery.id,
      deviceId: delivery.deviceId!,
      deviceName: byDevice.get(delivery.deviceId!)?.name ?? null,
      username: account?.username ?? null,
      platform: account?.platform ?? null,
      contentType: delivery.contentType,
      doneAt: delivery.doneAt!,
      reason,
    };
  });
}
