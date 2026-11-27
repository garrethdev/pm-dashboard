/**
 * Robot updates (2026-11-27, branch RPA-Patch-Feature): the warmup robot's
 * update packages, and whether the MacBook Air is running the newest one.
 *
 * Until now an update reached the Air as a file and a Word guide on WhatsApp,
 * and updates were missed: on 2026-11-27 the Air was still on the 26 November
 * version after the 27 November one had been sent. Now Claude publishes each
 * package here (scripts/publish-robot-update.mjs), Yurie downloads it from
 * Settings -> Robot updates, and the bell and a banner say so until the
 * robot's own warmup reports show the new version.
 *
 * Which version the Air runs comes from `warmup_reports.robot_version`, filled
 * by the database from the first line of each report (the robot writes
 * "Version: warmup-runner-..." there since 2026-11-25). There is one Air, so
 * the newest report is the Air.
 */

import { cachedFetcher, TTL } from "@/lib/data/cache";
import { sbRest } from "@/lib/data/supabase";

/** The private Storage bucket the packages live in. */
export const ROBOT_UPDATES_BUCKET = "robot-updates";

/** The cache key the banner and the bell read through. */
export const ROBOT_UPDATES_TAG = "robot-updates-v1";

/** A step that one version needs on top of the usual ones. */
export interface ExtraStep {
  /** One action, e.g. 'In the air folder, double-click Set the Friday analytics time.' */
  do: string;
  /** What the window says when it worked. Optional. */
  expect?: string;
}

export interface RobotUpdate {
  /** "warmup-runner-2026-11-27-eedde13", the package name without .tar.gz. */
  version: string;
  commitSha: string;
  label: string;
  whatChanged: string;
  extraSteps: ExtraStep[];
  afterwards: string | null;
  filePath: string;
  fileBytes: number;
  publishedAt: string;
  publishedBy: string;
}

/** The version the Air last reported, and when. */
export interface AirVersion {
  version: string;
  /** When the warmup that reported it started. */
  seenAt: string;
}

const VERSION_RE = /^warmup-runner-(\d{4}-\d{2}-\d{2})-([0-9a-f]{7,40})$/;

/** "warmup-runner-2026-11-27-eedde13" -> { date: "2026-11-27", code: "eedde13" }.
 *  Null for anything else, including the robot's "not installed from a package". */
export function versionParts(version: string): { date: string; code: string } | null {
  const m = VERSION_RE.exec(version);
  return m ? { date: m[1]!, code: m[2]! } : null;
}

export function isRobotVersion(version: string): boolean {
  return VERSION_RE.test(version);
}

/** "2026-11-27" -> "27 November" (how the Word guides named them). */
export function versionDay(version: string): string | null {
  const p = versionParts(version);
  if (!p) return null;
  const [y, mo, d] = p.date.split("-").map(Number);
  const when = new Date(Date.UTC(y!, mo! - 1, d!));
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long" }).format(when);
}

/** "64.2 MB". */
export function fileSize(bytes: number): string {
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export type AirState =
  /** No version published yet: nothing to compare. */
  | { kind: "none" }
  /** The Air has never sent a report with a version in it. */
  | { kind: "unknown"; latest: RobotUpdate }
  | { kind: "current"; latest: RobotUpdate; air: AirVersion }
  /** The Air is on an older version than the newest one published. */
  | { kind: "behind"; latest: RobotUpdate; air: AirVersion; airUpdate: RobotUpdate | null };

/**
 * Compare what the Air reported with the newest published version.
 *
 * `updates` newest first. A version the Air runs that is not in the list (one
 * installed before this page existed, or sent by hand) counts as behind when
 * its date is older than the newest one's, and as current when it is the
 * same day or newer: a package made later than the newest listed one cannot
 * be an old one, and nagging about it would be wrong.
 */
export function airState(updates: RobotUpdate[], air: AirVersion | null): AirState {
  const latest = updates[0];
  if (!latest) return { kind: "none" };
  if (!air) return { kind: "unknown", latest };
  if (air.version === latest.version) return { kind: "current", latest, air };
  const airUpdate = updates.find((u) => u.version === air.version) ?? null;
  if (airUpdate) return { kind: "behind", latest, air, airUpdate };
  const airDate = versionParts(air.version)?.date;
  const latestDate = versionParts(latest.version)?.date;
  if (airDate && latestDate && airDate >= latestDate) return { kind: "current", latest, air };
  return { kind: "behind", latest, air, airUpdate: null };
}

/**
 * Which versions count as installed on the Air: the one it runs and every
 * older one. Updates build on each other, so an older version's changes are
 * already in what the Air runs, and downloading it again would only take the
 * robot backwards. Their Download buttons are switched off.
 *
 * `updates` newest first. A version the Air runs that is not in the list
 * counts by its date: everything published that day or before is installed.
 */
export function installedVersions(updates: RobotUpdate[], air: AirVersion | null): Set<string> {
  if (!air) return new Set();
  const at = updates.findIndex((u) => u.version === air.version);
  if (at >= 0) return new Set(updates.slice(at).map((u) => u.version));
  const airDate = versionParts(air.version)?.date;
  if (!airDate) return new Set();
  return new Set(updates.filter((u) => (versionParts(u.version)?.date ?? "") <= airDate).map((u) => u.version));
}

interface UpdateRow {
  version: string;
  commit_sha: string;
  label: string;
  what_changed: string;
  extra_steps: unknown;
  afterwards: string | null;
  file_path: string;
  file_bytes: number | string;
  published_at: string;
  published_by: string;
}

function parseSteps(raw: unknown): ExtraStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s): ExtraStep[] => {
    if (!s || typeof s !== "object") return [];
    const step = s as { do?: unknown; expect?: unknown };
    if (typeof step.do !== "string" || step.do.trim() === "") return [];
    return [{ do: step.do, ...(typeof step.expect === "string" && step.expect.trim() ? { expect: step.expect } : {}) }];
  });
}

export function toRobotUpdate(r: UpdateRow): RobotUpdate {
  return {
    version: r.version,
    commitSha: r.commit_sha,
    label: r.label,
    whatChanged: r.what_changed,
    extraSteps: parseSteps(r.extra_steps),
    afterwards: r.afterwards,
    filePath: r.file_path,
    fileBytes: Number(r.file_bytes),
    publishedAt: r.published_at,
    publishedBy: r.published_by,
  };
}

const UPDATE_COLS =
  "version,commit_sha,label,what_changed,extra_steps,afterwards,file_path,file_bytes,published_at,published_by";

/** Every published version, newest first. */
export async function getRobotUpdates(): Promise<RobotUpdate[]> {
  const rows = await sbRest<UpdateRow[]>(`robot_updates?select=${UPDATE_COLS}&order=published_at.desc&limit=100`);
  return rows.map(toRobotUpdate);
}

/** One version, or null. */
export async function getRobotUpdate(version: string): Promise<RobotUpdate | null> {
  if (!isRobotVersion(version)) return null;
  const rows = await sbRest<UpdateRow[]>(
    `robot_updates?select=${UPDATE_COLS}&version=eq.${encodeURIComponent(version)}&limit=1`,
  );
  return rows[0] ? toRobotUpdate(rows[0]) : null;
}

/** The version in the Air's newest warmup report, or null if none has one. */
export async function getAirVersion(): Promise<AirVersion | null> {
  const rows = await sbRest<{ robot_version: string; started_at: string }[]>(
    "warmup_reports?select=robot_version,started_at&robot_version=not.is.null&order=started_at.desc&limit=1",
  );
  const r = rows[0];
  return r ? { version: r.robot_version, seenAt: r.started_at } : null;
}

/** The list and the Air's version together, read live (the Settings pages). */
export async function getRobotUpdateStatus(): Promise<{
  updates: RobotUpdate[];
  state: AirState;
  installed: Set<string>;
}> {
  const [updates, air] = await Promise.all([getRobotUpdates(), getAirVersion()]);
  return { updates, state: airState(updates, air), installed: installedVersions(updates, air) };
}

/**
 * The same, through the one-minute cache, for what every page reads (the
 * banner and the bell). A failed read is no banner rather than a broken page.
 */
const cachedState = cachedFetcher(ROBOT_UPDATES_TAG, TTL.supabase, async () => {
  const [updates, air] = await Promise.all([getRobotUpdates(), getAirVersion()]);
  return airState(updates.slice(0, 20), air);
});

export async function getCachedAirState(): Promise<AirState> {
  try {
    return (await cachedState()).data;
  } catch {
    return { kind: "none" };
  }
}
