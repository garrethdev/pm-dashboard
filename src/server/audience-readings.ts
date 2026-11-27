/**
 * Who each Instagram account reaches, from Instagram itself (Garreth,
 * 2026-11-26): the engaged audience (people who liked, commented, shared or
 * saved this month) by gender, age and country, once a week into
 * `audience_readings` (source 'instagram_api'). Only the audience, never the
 * followers' make-up: on our accounts the followers are mostly India while
 * the people who engage are not (checked live 2026-11-26).
 *
 * Instagram's own limits, both seen live on 2026-11-26:
 *  - under 100 followers it gives nothing at all (gap 'too_few_followers');
 *  - with too few engaged people it answers "Not enough users"
 *    (gap 'not_enough_engagement'). No other time window helps: this_week,
 *    last_14/30/90_days and prev_month all answered the same.
 *
 * Uses the token the Analysis Engine already keeps fresh on each account
 * (`accounts.access_token`); adds no new connection to Meta.
 */

import { AiUnavailable, DEFAULT_MODEL, downloadScreen, SCREEN_PATH_RE } from "./screen-readings";

const GRAPH = "https://graph.instagram.com/v23.0";
const MIN_FOLLOWERS = 100;
const TIMEFRAME = "this_month";

export type AudienceGap = "too_few_followers" | "not_enough_engagement" | "not_shown" | "error";

export interface AudienceRow {
  platform: "instagram" | "tiktok" | "facebook";
  account: string;
  source: "instagram_api" | "robot";
  timeframe: string | null;
  people: number | null;
  gender: Record<string, number> | null;
  age: Record<string, number> | null;
  country: Record<string, number> | null;
  gap: AudienceGap | null;
  notes: string | null;
  raw: unknown;
  /** Robot readings only: the photos in the post-screens bucket, and the AI that read them. */
  screenshots?: string[];
  model?: string | null;
}

interface Result {
  dimension_values: string[];
  value: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
/** "US" → "United States", as the robot's readings name countries. */
export function countryName(code: string): string {
  try {
    return regionNames.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Counts → percentages of their sum, one decimal; null when there is nothing to divide. */
export function toPercents(counts: Record<string, number>): Record<string, number> | null {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  if (!total) return null;
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, round1((v / total) * 100)]));
}

/**
 * Instagram's F / M / U. The app shows Women and Men only, so the share is
 * taken over those two, as the robot's readings are; the unknowns are left
 * out of the split (they stay in `people`).
 */
export function genderSplit(results: Result[]): Record<string, number> | null {
  const counts: Record<string, number> = {};
  for (const r of results) {
    const g = r.dimension_values[0];
    if (g === "F") counts.Women = (counts.Women ?? 0) + r.value;
    else if (g === "M") counts.Men = (counts.Men ?? 0) + r.value;
  }
  return toPercents(counts);
}

export function ageSplit(results: Result[]): Record<string, number> | null {
  const counts: Record<string, number> = {};
  for (const r of results) {
    const a = r.dimension_values[0];
    if (a) counts[a] = (counts[a] ?? 0) + r.value;
  }
  return toPercents(counts);
}

export function countrySplit(results: Result[]): Record<string, number> | null {
  const counts: Record<string, number> = {};
  for (const r of results) {
    const c = r.dimension_values[0];
    if (c) {
      const name = countryName(c);
      counts[name] = (counts[name] ?? 0) + r.value;
    }
  }
  return toPercents(counts);
}

type Fetch = typeof fetch;

async function graph(path: string, token: string, f: Fetch): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; message: string }> {
  const sep = path.includes("?") ? "&" : "?";
  // The token travels in the query, as the Analysis Engine sends it; the URL is never logged.
  const res = await f(`${GRAPH}/${path}${sep}access_token=${encodeURIComponent(token)}`, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const err = body.error as { message?: string } | undefined;
  if (!res.ok || err) return { ok: false, message: err?.message ?? `HTTP ${res.status}` };
  return { ok: true, body };
}

function resultsOf(body: Record<string, unknown>): Result[] {
  const data = body.data as { total_value?: { breakdowns?: { results?: Result[] }[] } }[] | undefined;
  return data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
}

/** One account's engaged audience this month, or the reason Instagram gives none. */
export async function readInstagramAudience(account: string, token: string, f: Fetch = fetch): Promise<AudienceRow> {
  const row: AudienceRow = { platform: "instagram", account, source: "instagram_api", timeframe: TIMEFRAME, people: null, gender: null, age: null, country: null, gap: null, notes: null, raw: null };
  const me = await graph("me?fields=followers_count", token, f);
  if (!me.ok) return { ...row, gap: "error", notes: me.message.slice(0, 300) };
  const followers = typeof me.body.followers_count === "number" ? me.body.followers_count : null;
  if (followers !== null && followers < MIN_FOLLOWERS) return { ...row, gap: "too_few_followers", notes: `${followers} followers`, raw: { followers } };

  const raw: Record<string, Result[]> = {};
  for (const breakdown of ["gender", "age", "country"] as const) {
    const r = await graph(`me/insights?metric=engaged_audience_demographics&period=lifetime&metric_type=total_value&timeframe=${TIMEFRAME}&breakdown=${breakdown}`, token, f);
    if (!r.ok) {
      if (/not enough users/i.test(r.message)) return { ...row, gap: "not_enough_engagement", notes: r.message.slice(0, 300), raw: { followers } };
      return { ...row, gap: "error", notes: `${breakdown}: ${r.message.slice(0, 300)}`, raw: { followers, ...raw } };
    }
    raw[breakdown] = resultsOf(r.body);
  }
  const people = raw.gender!.reduce((s, x) => s + x.value, 0) || null;
  const gender = genderSplit(raw.gender!);
  const age = ageSplit(raw.age!);
  const country = countrySplit(raw.country!);
  const nothing = !gender && !age && !country;
  return { ...row, people, gender, age, country, gap: nothing ? "not_shown" : null, raw: { followers, ...raw } };
}

// ---------------------------------------------------------------------------
// Database

async function db(path: string, init: RequestInit = {}): Promise<Response> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`supabase HTTP ${res.status} on ${path.split("?")[0]} ${detail.slice(0, 200)}`);
  }
  return res;
}

/** One row per account, source and UTC day: a rerun the same day replaces it. */
export async function saveAudienceRows(rows: AudienceRow[]): Promise<void> {
  if (!rows.length) return;
  await db("audience_readings?on_conflict=platform,account,source,read_on", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows.map((r) => ({ ...r, read_at: new Date().toISOString() }))),
  });
}

export interface InstagramAudienceReport {
  dry: boolean;
  accounts: { account: string; people: number | null; gap: AudienceGap | null; notes: string | null; topCountry: string | null; women: number | null }[];
}

/** Every active Instagram account holding a token; `dry` reads Instagram and writes nothing. */
export async function runInstagramAudience(dry: boolean): Promise<InstagramAudienceReport> {
  const res = await db("accounts?select=username,access_token&platform=eq.instagram&is_active=eq.true&access_token=not.is.null&order=username");
  const accounts = ((await res.json()) as { username: string | null; access_token: string }[]).filter((a): a is { username: string; access_token: string } => !!a.username);
  const rows: AudienceRow[] = [];
  for (const a of accounts) {
    try {
      rows.push(await readInstagramAudience(a.username, a.access_token));
    } catch (err) {
      rows.push({ platform: "instagram", account: a.username, source: "instagram_api", timeframe: TIMEFRAME, people: null, gender: null, age: null, country: null, gap: "error", notes: (err instanceof Error ? err.message : String(err)).slice(0, 300), raw: null });
    }
  }
  if (!dry) await saveAudienceRows(rows);
  return {
    dry,
    accounts: rows.map((r) => {
      const top = r.country ? Object.entries(r.country).sort((x, y) => y[1] - x[1])[0] : undefined;
      return { account: r.account, people: r.people, gap: r.gap, notes: r.notes, topCountry: top ? `${top[0]} ${top[1]}%` : null, women: r.gender?.Women ?? null };
    }),
  };
}

// ---------------------------------------------------------------------------
// The robot's readings (Garreth, 2026-11-27)
//
// TikTok has no API for who watches an account, but its own app shows it:
// TikTok Studio > Analytics > Viewers > Viewer insights, by gender, age and
// location, even on accounts with 3 followers (Yurie's recording,
// 2026-11-27). The robot's Friday analytics photographs that page (28 days)
// and hands the photos over here (operation 14, POST
// /api/warmup-runner/audience-readings); the AI reads them into one
// audience_readings row, source 'robot'. Viewers are people who watched, so
// they are the audience, not the followers' make-up (Garreth, 2026-11-26).
// Facebook shows only its followers' make-up: the robot does not read it.

export const ROBOT_AUDIENCE_MODEL = DEFAULT_MODEL;

export interface RobotAudienceItem {
  platform: "tiktok" | "instagram" | "facebook";
  account: string;
  /** The period the robot tapped ("28 days"), or null when the page's own was kept. */
  period: string | null;
  screenshots: string[];
  /** Why the robot could not read it in full, or null. */
  problem: string | null;
}

const PLATFORMS = ["tiktok", "instagram", "facebook"] as const;

/** The robot's hand-off, checked: each item's photos must be this account's, in the bucket's own naming. */
export function parseAudienceHandoff(body: unknown): RobotAudienceItem[] {
  const b = body as { read_by?: unknown; audiences?: unknown };
  if (!b || typeof b !== "object" || b.read_by !== "robot") throw new Error('read_by must be "robot"');
  if (!Array.isArray(b.audiences) || b.audiences.length === 0 || b.audiences.length > 20) throw new Error("audiences must be a list of 1 to 20");
  return b.audiences.map((raw, i) => {
    const a = raw as Record<string, unknown>;
    const platform = a.platform as RobotAudienceItem["platform"];
    if (!PLATFORMS.includes(platform)) throw new Error(`audiences[${i}].platform is not one of ${PLATFORMS.join(", ")}`);
    if (typeof a.account !== "string" || !a.account.trim() || a.account.length > 80) throw new Error(`audiences[${i}].account is missing`);
    const account = a.account.trim().replace(/^@/, "");
    const shots = Array.isArray(a.screenshots) ? a.screenshots : null;
    if (!shots || shots.length > 12 || shots.some((p) => typeof p !== "string" || !SCREEN_PATH_RE.test(p) || !p.startsWith(`${platform}/`))) {
      throw new Error(`audiences[${i}].screenshots must be up to 12 of this platform's bucket paths`);
    }
    const period = typeof a.period === "string" && a.period.trim() ? a.period.trim().slice(0, 40) : null;
    const problem = typeof a.problem === "string" && a.problem.trim() ? a.problem.trim().slice(0, 300) : null;
    return { platform, account, period, screenshots: shots as string[], problem };
  });
}

export const AUDIENCE_SCREEN_PROMPT = `These are screenshots of one account's own analytics in a social media app, from its
"Viewers" page: who watched the account's videos. The first usually shows the total
number of viewers and the dates covered; the others show "Viewer insights" by Gender,
by Age, and by Locations (countries).

Read the numbers exactly as printed. Reply with one JSON object and nothing else:
{
  "timeframe": the dates or period the page covers as printed (e.g. "Oct 30 - Nov 26"), or null,
  "people": the total number of viewers as a whole number ("1.1K" is 1100), or null,
  "gender": {"Women": pct, "Men": pct, "Other": pct} from Female / Male / Other, or null,
  "age": {"18-24": pct, "25-34": pct, ...} using the page's own age groups written with a plain hyphen, or null,
  "country": {"United States": pct, ...} each country shown with its percent, or null,
  "too_few": true when the page says there is not enough data instead of numbers, else false,
  "notes": anything odd, in a few words, or null
}
Percents are numbers without the % sign. Never invent a number: use null for anything
the screenshots do not show. Empty is not 0.`;

/** A percent split as the AI gave it, kept only when every value is a number from 0 to 100. */
function splitOrNull(v: unknown, rename: (k: string) => string = (k) => k): Record<string, number> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const out: Record<string, number> = {};
  for (const [k, raw] of Object.entries(v as Record<string, unknown>)) {
    const n = typeof raw === "string" ? Number(raw.replace("%", "")) : raw;
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 100) continue;
    const name = rename(k.trim());
    if (name) out[name] = round1(n);
  }
  return Object.keys(out).length ? out : null;
}

const GENDER_NAMES: Record<string, string> = { female: "Women", women: "Women", male: "Men", men: "Men", other: "Other" };

/** "18 -24" → "18-24", "55 +" → "55+": the age groups as the other readings name them. */
export function ageGroup(k: string): string {
  return k.replace(/\s+/g, "").replace(/[–—]/g, "-");
}

/** The AI's reading of the robot's photos, as one audience_readings row. */
export function robotAudienceRow(item: RobotAudienceItem, ai: unknown, model: string | null): AudienceRow {
  const r = (ai && typeof ai === "object" ? ai : {}) as Record<string, unknown>;
  const gender = splitOrNull(r.gender, (k) => GENDER_NAMES[k.toLowerCase()] ?? "");
  const age = splitOrNull(r.age, ageGroup);
  const country = splitOrNull(r.country);
  const people = typeof r.people === "number" && Number.isFinite(r.people) && r.people >= 0 ? Math.round(r.people) : null;
  const shown = typeof r.timeframe === "string" && r.timeframe.trim() ? r.timeframe.trim().slice(0, 60) : null;
  const timeframe = [item.period ? `Last ${item.period}` : null, shown].filter(Boolean).join(", ") || null;
  const nothing = !gender && !age && !country;
  const aiNotes = typeof r.notes === "string" && r.notes.trim() ? r.notes.trim() : null;
  const notes = [item.problem ? `robot: ${item.problem}` : null, aiNotes].filter(Boolean).join("; ").slice(0, 300) || null;
  return {
    platform: item.platform,
    account: item.account,
    source: "robot",
    timeframe,
    people,
    gender,
    age,
    country,
    gap: nothing ? (r.too_few === true ? "not_enough_engagement" : item.problem || !ai ? "error" : "not_shown") : null,
    notes,
    raw: ai ?? null,
    screenshots: item.screenshots,
    model,
  };
}

/** One account's photos read by the AI. Throws AiUnavailable when the AI cannot be reached. */
async function readAudienceScreens(item: RobotAudienceItem, model: string): Promise<unknown> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiUnavailable("The AI is not connected: OPENROUTER_API_KEY is not set");
  const shots = await Promise.all(item.screenshots.map((p) => downloadScreen(p)));
  const content: ({ type: "image_url"; image_url: { url: string } } | { type: "text"; text: string })[] = shots.map((s) => ({
    type: "image_url",
    image_url: { url: `data:${s.mediaType};base64,${s.data.toString("base64")}` },
  }));
  content.push({ type: "text", text: AUDIENCE_SCREEN_PROMPT });
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app",
      "X-Title": "PM Dashboard Audience Readings",
    },
    body: JSON.stringify({ model, max_tokens: 4000, response_format: { type: "json_object" }, messages: [{ role: "user", content }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (res.status === 401 || res.status === 402 || res.status === 429 || res.status >= 500) {
    throw new AiUnavailable(res.status === 402 ? "The AI account is out of credit" : `The AI could not be reached (HTTP ${res.status})`);
  }
  if (!res.ok) throw new Error(`the AI refused these screens (HTTP ${res.status}): ${(await res.text().catch(() => "")).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = json.choices?.[0]?.message?.content ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`the AI's reply could not be read: ${text.slice(0, 160) || "(empty)"}`);
  return JSON.parse(text.slice(start, end + 1));
}

export interface RobotAudienceReport {
  dry: boolean;
  audiences: { account: string; platform: string; stored: boolean; gap: AudienceGap | null; problem: string | null; women: number | null; topCountry: string | null }[];
}

/** Reads each account's photos and stores one row per account (a second hand-off the same day replaces it). */
export async function runRobotAudience(items: RobotAudienceItem[], opts: { dry?: boolean; model?: string } = {}): Promise<RobotAudienceReport> {
  const model = opts.model ?? process.env.AUDIENCE_READINGS_MODEL ?? ROBOT_AUDIENCE_MODEL;
  const report: RobotAudienceReport = { dry: !!opts.dry, audiences: [] };
  for (const item of items) {
    let row: AudienceRow;
    let problem: string | null = item.problem;
    if (item.screenshots.length === 0) {
      row = robotAudienceRow(item, null, null);
    } else {
      try {
        row = robotAudienceRow(item, await readAudienceScreens(item, model), model);
      } catch (err) {
        if (err instanceof AiUnavailable) throw err;
        problem = (err instanceof Error ? err.message : String(err)).slice(0, 300);
        row = { ...robotAudienceRow(item, null, model), gap: "error", notes: problem };
      }
    }
    if (!opts.dry) await saveAudienceRows([row]);
    const top = row.country ? Object.entries(row.country).sort((x, y) => y[1] - x[1])[0] : undefined;
    report.audiences.push({
      account: item.account,
      platform: item.platform,
      stored: !opts.dry,
      gap: row.gap,
      problem,
      women: row.gender?.Women ?? null,
      topCountry: top ? `${top[0]} ${top[1]}%` : null,
    });
  }
  return report;
}
