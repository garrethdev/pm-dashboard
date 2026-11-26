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
