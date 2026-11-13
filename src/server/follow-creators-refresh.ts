/**
 * Monthly refresh of Creators to follow (Garreth, 2026-11-13).
 *
 * The list started as a snapshot (2026-11-13). Two parts keep it current, each
 * its own scheduled call in vercel.json on the 1st of the month, so each fits
 * the five-minute limit:
 *
 * RECHECK looks every creator up again (one ScrapeCreators credit each):
 * follower count, name and photo are updated; she comes off the list when she
 * grew past 6,000, went private, stopped posting (Instagram, 60 days) or could
 * not be found two months running. Coming off sets `retired_at` and a reason;
 * who followed her is kept.
 *
 * TOPUP runs when a platform has fewer than its target. It searches TikTok with
 * this month's ten phrases, keeps creators in range who replied to a comment on
 * their busiest video, drops seller links, and asks the AI the same question
 * the first list was picked by (CLASSIFY_PROMPT). Then it looks for each new
 * TikTok creator's Instagram (the handle her bio names, else the same handle),
 * which is where the Instagram list comes from: Instagram's own search finds
 * almost no small creators.
 *
 * Each part stops itself before the limit and records a row in
 * `follow_creator_runs`. The oldest checks go first, so a run cut short is
 * finished by the next one. About 110 credits for a recheck and 100 to 250 for
 * a top-up.
 */

import { sbFetch } from "@/lib/data/warmup-sessions";
import {
  CLASSIFY_PROMPT,
  INSTAGRAM_NEW_ACTIVE_DAYS,
  TARGET,
  inRange,
  instagramFromBio,
  isSellerLink,
  looksLikeSamePerson,
  phrasesFor,
  retireReason,
  topicsOf,
} from "@/server/follow-creators-refresh-rules";

const SC = "https://api.scrapecreators.com";
const BUCKET = "creator-photos";
const MODEL = process.env.FOLLOW_CREATORS_MODEL || process.env.CONTENT_TAGS_MODEL || "anthropic/claude-haiku-5.5";
/** Stop starting new work after this long; the route's limit is 300 s. */
const BUDGET_MS = 240_000;
const PARALLEL = 6;
/** New TikTok candidates checked per top-up at most. */
const MAX_CANDIDATES = 60;

type Platform = "tiktok" | "instagram";

export interface RefreshReport {
  part: "recheck" | "topup";
  dry: boolean;
  checked: number;
  retired: { handle: string; platform: Platform; reason: string }[];
  added: { handle: string; platform: Platform; followers: number }[];
  rejected: { handle: string; reason: string }[];
  credits: number;
  stoppedEarly: boolean;
  note: string | null;
}

class Run {
  credits = 0;
  readonly deadline: number;
  constructor(readonly dry: boolean) {
    this.deadline = Date.now() + BUDGET_MS;
  }
  get late() {
    return Date.now() > this.deadline;
  }
}

/** ScrapeCreators is out of credit or refusing the key: stop the run. */
export class ScrapeCreatorsUnavailable extends Error {}

async function sc<T>(run: Run, path: string, params: Record<string, string>): Promise<T | null> {
  const key = process.env.SCRAPECREATORS_API_KEY;
  if (!key) throw new ScrapeCreatorsUnavailable("SCRAPECREATORS_API_KEY is not configured");
  const res = await fetch(`${SC}${path}?${new URLSearchParams(params)}`, {
    headers: { "x-api-key": key },
    signal: AbortSignal.timeout(45_000),
    cache: "no-store",
  }).catch(() => null);
  run.credits += 1;
  if (!res) return null;
  if (res.status === 401 || res.status === 402) {
    throw new ScrapeCreatorsUnavailable(res.status === 402 ? "ScrapeCreators is out of credit" : "ScrapeCreators refused the key");
  }
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as T | null;
}

async function pool<T>(items: T[], run: Run, fn: (item: T) => Promise<void>): Promise<boolean> {
  let i = 0;
  let cut = false;
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      while (i < items.length) {
        if (run.late) {
          cut = true;
          return;
        }
        await fn(items[i++]!);
      }
    }),
  );
  return cut;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

interface Profile {
  found: boolean;
  followers: number;
  name: string | null;
  bio: string;
  link: string | null;
  photo: string | null;
  isPrivate: boolean;
  userId: string | null;
  /** Instagram only. */
  daysSincePost: number | null;
}

const MISSING: Profile = { found: false, followers: 0, name: null, bio: "", link: null, photo: null, isPrivate: false, userId: null, daysSincePost: null };

async function tiktokProfile(run: Run, handle: string): Promise<Profile> {
  const d = await sc<{ user?: Record<string, unknown>; stats?: Record<string, unknown> }>(run, "/v1/tiktok/profile", { handle });
  const u = d?.user;
  if (!u || Object.keys(u).length === 0) return MISSING;
  return {
    found: true,
    followers: Number(d?.stats?.followerCount ?? 0),
    name: typeof u.nickname === "string" ? u.nickname : null,
    bio: typeof u.signature === "string" ? u.signature : "",
    link: ((u.bioLink as { link?: string } | undefined)?.link ?? null) || null,
    photo: (u.avatarLarger ?? u.avatarMedium ?? u.avatarThumb ?? null) as string | null,
    isPrivate: Boolean(u.privateAccount),
    userId: u.id ? String(u.id) : null,
    daysSincePost: null,
  };
}

async function instagramProfile(run: Run, handle: string): Promise<Profile> {
  const d = await sc<{ data?: { user?: Record<string, unknown> } }>(run, "/v1/instagram/profile", { handle });
  const u = d?.data?.user;
  if (!u) return MISSING;
  const media = (u.edge_owner_to_timeline_media ?? {}) as { edges?: { node?: { taken_at_timestamp?: number } }[] };
  const last = Math.max(0, ...(media.edges ?? []).map((e) => e.node?.taken_at_timestamp ?? 0));
  return {
    found: true,
    followers: Number((u.edge_followed_by as { count?: number } | undefined)?.count ?? 0),
    name: typeof u.full_name === "string" ? u.full_name : null,
    bio: typeof u.biography === "string" ? u.biography : "",
    link: typeof u.external_url === "string" ? u.external_url : null,
    photo: (u.profile_pic_url_hd ?? u.profile_pic_url ?? null) as string | null,
    isPrivate: Boolean(u.is_private),
    userId: u.id ? String(u.id) : null,
    daysSincePost: last ? Math.round((Date.now() / 1000 - last) / 86_400) : null,
  };
}

// ---------------------------------------------------------------------------
// Database and storage
// ---------------------------------------------------------------------------

async function db<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await sbFetch(path, init);
  if (!res.ok) throw new Error(`Supabase ${init.method ?? "GET"} ${path.split("?")[0]} answered HTTP ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

const JSON_HEADERS = { "Content-Type": "application/json", Prefer: "return=minimal" };

async function patchCreator(id: number, fields: Record<string, unknown>) {
  await db(`follow_creators?id=eq.${id}`, { method: "PATCH", headers: JSON_HEADERS, body: JSON.stringify(fields) });
}

/** Copy her photo into our bucket (the platforms' links expire). Returns the path, or null. */
async function copyPhoto(platform: Platform, id: number, url: string): Promise<string | null> {
  try {
    const img = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(20_000) });
    if (!img.ok) return null;
    const type = (img.headers.get("content-type") ?? "image/jpeg").split(";")[0]!.trim();
    const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
    const path = `${platform}/${id}.${ext}`;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const up = await fetch(`${process.env.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": ext === "jpg" ? "image/jpeg" : type, "x-upsert": "true" },
      body: await img.arrayBuffer(),
      signal: AbortSignal.timeout(20_000),
    });
    return up.ok ? path : null;
  } catch {
    return null;
  }
}

async function recordRun(report: RefreshReport, startedAt: string) {
  await db("follow_creator_runs", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      part: report.part,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      checked: report.checked,
      retired: report.retired.length,
      added_tiktok: report.added.filter((a) => a.platform === "tiktok").length,
      added_instagram: report.added.filter((a) => a.platform === "instagram").length,
      credits: report.credits,
      stopped_early: report.stoppedEarly,
      dry: report.dry,
      note: report.note,
    }),
  });
}

// ---------------------------------------------------------------------------
// Recheck
// ---------------------------------------------------------------------------

export async function recheckCreators(dry = false): Promise<RefreshReport> {
  const run = new Run(dry);
  const startedAt = new Date().toISOString();
  const report: RefreshReport = { part: "recheck", dry, checked: 0, retired: [], added: [], rejected: [], credits: 0, stoppedEarly: false, note: null };

  const rows = await db<{ id: number; platform: Platform; handle: string; missed_checks: number }[]>(
    "follow_creators?select=id,platform,handle,missed_checks&retired_at=is.null&order=checked_at.asc.nullsfirst,id.asc",
  );

  try {
    report.stoppedEarly = await pool(rows, run, async (r) => {
      const p = r.platform === "tiktok" ? await tiktokProfile(run, r.handle) : await instagramProfile(run, r.handle);
      report.checked += 1;
      const reason = retireReason({ found: p.found, missedBefore: r.missed_checks, followers: p.followers, isPrivate: p.isPrivate, daysSincePost: p.daysSincePost });
      if (reason) report.retired.push({ handle: r.handle, platform: r.platform, reason });
      if (dry) return;

      const now = new Date().toISOString();
      const fields: Record<string, unknown> = { checked_at: now };
      if (!p.found) {
        fields.missed_checks = r.missed_checks + 1;
      } else {
        fields.missed_checks = 0;
        fields.followers = p.followers;
        if (p.name) fields.display_name = p.name;
        if (p.userId) fields.platform_user_id = p.userId;
        if (p.photo && !reason) {
          const path = await copyPhoto(r.platform, r.id, p.photo);
          if (path) fields.photo_path = path;
        }
      }
      if (reason) {
        fields.retired_at = now;
        fields.retired_reason = reason;
      }
      await patchCreator(r.id, fields);
    });
  } catch (err) {
    if (!(err instanceof ScrapeCreatorsUnavailable)) throw err;
    report.note = err.message;
    report.stoppedEarly = true;
  }

  report.credits = run.credits;
  if (!dry) await recordRun(report, startedAt);
  return report;
}

// ---------------------------------------------------------------------------
// Top-up
// ---------------------------------------------------------------------------

export interface Candidate {
  handle: string;
  followers: number;
  bestUrl: string;
  bestComments: number;
  captions: string[];
  replied?: number;
  seen?: number;
  profile?: Profile;
}

export async function topUpCreators(dry = false, now = new Date()): Promise<RefreshReport> {
  const run = new Run(dry);
  const startedAt = now.toISOString();
  const report: RefreshReport = { part: "topup", dry, checked: 0, retired: [], added: [], rejected: [], credits: 0, stoppedEarly: false, note: null };

  const all = await db<{ id: number; platform: Platform; handle: string; display_name: string | null; retired_at: string | null; tiktok_twin: string | null; twin_checked_at: string | null; bio: string | null }[]>(
    "follow_creators?select=id,platform,handle,display_name,retired_at,tiktok_twin,twin_checked_at,bio",
  );
  // Never re-add anyone already seen, retired included: she came off for a reason.
  const known = { tiktok: new Set<string>(), instagram: new Set<string>() };
  const active = { tiktok: 0, instagram: 0 };
  for (const c of all) {
    known[c.platform].add(c.handle);
    if (!c.retired_at) active[c.platform] += 1;
  }
  const needTikTok = Math.max(0, TARGET.tiktok - active.tiktok);
  const needInstagram = Math.max(0, TARGET.instagram - active.instagram);
  if (needTikTok === 0 && needInstagram === 0) {
    report.note = `Both lists full (TikTok ${active.tiktok}, Instagram ${active.instagram}); nothing searched`;
    if (!dry) await recordRun(report, startedAt);
    return report;
  }

  try {
    // 1. Search: this month's phrases, one page each.
    const found = new Map<string, Candidate>();
    for (const q of phrasesFor(now)) {
      if (run.late) break;
      const d = await sc<{ search_item_list?: Record<string, unknown>[] }>(run, "/v1/tiktok/search/keyword", {
        query: q,
        date_posted: "this-month",
        region: "US",
        trim: "true",
      });
      for (const a of d?.search_item_list ?? []) {
        const author = (a.author ?? {}) as { unique_id?: string; follower_count?: number };
        const handle = author.unique_id?.toLowerCase();
        const followers = Number(author.follower_count ?? 0);
        if (!handle || known.tiktok.has(handle) || !inRange(followers) || a.is_ad || a.is_paid_partnership) continue;
        const comments = Number((a.statistics as { comment_count?: number } | undefined)?.comment_count ?? 0);
        const c = found.get(handle) ?? { handle, followers, bestUrl: "", bestComments: -1, captions: [] };
        if (comments > c.bestComments && typeof a.url === "string") {
          c.bestUrl = a.url;
          c.bestComments = comments;
        }
        if (typeof a.desc === "string" && c.captions.length < 3) c.captions.push(a.desc.slice(0, 160));
        found.set(handle, c);
      }
    }
    const candidates = [...found.values()]
      .filter((c) => c.bestComments >= 2 && c.bestUrl)
      .sort((a, b) => b.bestComments - a.bestComments)
      .slice(0, MAX_CANDIDATES);

    // 2. Did she reply to anyone? Then her bio.
    report.stoppedEarly = await pool(candidates, run, async (c) => {
      const d = await sc<{ comments?: { reply_comment?: { user?: { unique_id?: string } }[] }[] }>(run, "/v1/tiktok/video/comments", { url: c.bestUrl });
      const cs = d?.comments ?? [];
      c.seen = cs.length;
      c.replied = cs.filter((x) => (x.reply_comment ?? []).some((r) => r.user?.unique_id?.toLowerCase() === c.handle)).length;
      if (c.replied > 0) c.profile = await tiktokProfile(run, c.handle);
      report.checked += 1;
    });

    const shortlist: Candidate[] = [];
    for (const c of candidates) {
      if (c.replied === undefined) continue; // not reached before the time ran out
      if (!c.replied) report.rejected.push({ handle: c.handle, reason: "no replies to comments seen" });
      else if (!c.profile?.found) report.rejected.push({ handle: c.handle, reason: "profile not found" });
      else if (c.profile.isPrivate) report.rejected.push({ handle: c.handle, reason: "private" });
      else if (!inRange(c.profile.followers)) report.rejected.push({ handle: c.handle, reason: "out of range" });
      else if (isSellerLink(c.profile.link)) report.rejected.push({ handle: c.handle, reason: `seller link ${c.profile.link}` });
      else shortlist.push(c);
    }

    // 3. The AI: the same judgement the first list was picked by. Nobody new
    // is added without it; when it is down the run still goes on to step 5,
    // which needs no AI (her TikTok was already approved).
    let verdicts = new Map<string, { keep: boolean; reason: string }>();
    if (shortlist.length) {
      try {
        verdicts = await classify(shortlist);
      } catch (err) {
        if (!(err instanceof AiUnavailable)) throw err;
        report.note = `${err.message}: no new TikTok creators added`;
      }
    }
    const keep = shortlist.filter((c) => {
      const v = verdicts.get(c.handle);
      if (!v?.keep) report.rejected.push({ handle: c.handle, reason: v ? `AI: ${v.reason}` : report.note ? "AI unavailable" : "AI gave no answer" });
      return v?.keep;
    });

    // 4. Add the TikTok creators the list is short of.
    const newTikTok: { id: number | null; c: Candidate }[] = [];
    for (const c of keep.slice(0, needTikTok)) {
      const p = c.profile!;
      const row = {
        platform: "tiktok",
        handle: c.handle,
        display_name: p.name,
        followers: p.followers,
        bio: p.bio || null,
        topics: topicsOf(`${p.bio} ${c.captions.join(" ")}`),
        replies_seen: `${c.replied} of ${c.seen}`,
        evidence_url: c.bestUrl,
        platform_user_id: p.userId,
        source: "refresh",
        checked_at: new Date().toISOString(),
      };
      report.added.push({ handle: c.handle, platform: "tiktok", followers: p.followers });
      if (dry) {
        newTikTok.push({ id: null, c });
        continue;
      }
      const [saved] = await db<{ id: number }[]>("follow_creators?on_conflict=platform,handle&select=id", {
        method: "POST",
        headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" },
        body: JSON.stringify(row),
      });
      if (saved && p.photo) {
        const path = await copyPhoto("tiktok", saved.id, p.photo);
        if (path) await patchCreator(saved.id, { photo_path: path });
      }
      known.tiktok.add(c.handle);
      newTikTok.push({ id: saved?.id ?? null, c });
    }

    // 5. Instagram: the Instagram account of a TikTok creator we keep. New ones
    // first, then older ones whose Instagram was never looked for.
    if (needInstagram > 0 && !run.late) {
      const twins = new Set(all.filter((c) => c.platform === "instagram" && c.tiktok_twin).map((c) => c.tiktok_twin));
      const older = all
        .filter((c) => c.platform === "tiktok" && !c.retired_at && !c.twin_checked_at && !twins.has(c.handle))
        .map((c) => ({ id: c.id, handle: c.handle, name: c.display_name, bio: c.bio ?? "", link: null as string | null }));
      const queue = [
        ...newTikTok.map(({ id, c }) => ({ id, handle: c.handle, name: c.profile!.name, bio: c.profile!.bio, link: c.profile!.link })),
        ...older,
      ];
      // Look her Instagram up: same woman, in range, public, posting.
      const found: { t: (typeof queue)[number]; ig: string; p: Profile }[] = [];
      const cut = await pool(queue, run, async (t) => {
        // Twice what is needed is plenty to choose from after the AI.
        if (found.length >= needInstagram * 2) return;
        const named = instagramFromBio(t.bio, t.link);
        const ig = named ?? t.handle;
        if (!known.instagram.has(ig) && !found.some((f) => f.ig === ig)) {
          const p = await instagramProfile(run, ig);
          const ok =
            p.found &&
            !p.isPrivate &&
            inRange(p.followers) &&
            p.daysSincePost !== null &&
            p.daysSincePost <= INSTAGRAM_NEW_ACTIVE_DAYS &&
            looksLikeSamePerson(t.name, p.name, named !== null);
          if (ok) found.push({ t, ig, p });
        }
        if (!dry && t.id) await patchCreator(t.id, { twin_checked_at: new Date().toISOString() });
      });
      report.stoppedEarly ||= cut;

      // Her Instagram has to be about the same thing: on 2026-11-13 a TikTok
      // creator's Instagram turned out to be her law page. The AI judges it;
      // when the AI is down, only a bio that names the topic gets through.
      let approved = found;
      if (found.length) {
        try {
          const v = await classify(
            found.map(({ ig, p }) => ({ handle: ig, followers: p.followers, bestUrl: "", bestComments: 0, captions: [], profile: p })),
          );
          approved = found.filter(({ ig }) => {
            const x = v.get(ig);
            if (!x?.keep) report.rejected.push({ handle: `instagram:${ig}`, reason: x ? `AI: ${x.reason}` : "AI gave no answer" });
            return x?.keep;
          });
        } catch (err) {
          if (!(err instanceof AiUnavailable)) throw err;
          report.note ??= `${err.message}: Instagram added only where her bio names the topic`;
          approved = found.filter(({ ig, p }) => {
            const on = topicsOf(p.bio).length > 0;
            if (!on) report.rejected.push({ handle: `instagram:${ig}`, reason: "AI unavailable and her bio does not name the topic" });
            return on;
          });
        }
      }

      for (const { t, ig, p } of approved.slice(0, needInstagram)) {
        known.instagram.add(ig);
        report.added.push({ handle: ig, platform: "instagram", followers: p.followers });
        if (dry) continue;
        const [saved] = await db<{ id: number }[]>("follow_creators?on_conflict=platform,handle&select=id", {
          method: "POST",
          headers: { "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=representation" },
          body: JSON.stringify({
            platform: "instagram",
            handle: ig,
            display_name: p.name,
            followers: p.followers,
            bio: p.bio || null,
            topics: topicsOf(`${p.bio} ${t.bio}`),
            replies_seen: "on her TikTok",
            platform_user_id: p.userId,
            tiktok_twin: t.handle,
            source: "refresh",
            checked_at: new Date().toISOString(),
          }),
        });
        if (saved && p.photo) {
          const path = await copyPhoto("instagram", saved.id, p.photo);
          if (path) await patchCreator(saved.id, { photo_path: path });
        }
      }
    }
  } catch (err) {
    if (!(err instanceof ScrapeCreatorsUnavailable)) throw err;
    report.note = err.message;
    report.stoppedEarly = true;
  }

  report.credits = run.credits;
  if (!dry) await recordRun(report, startedAt);
  return report;
}

// ---------------------------------------------------------------------------
// The AI
// ---------------------------------------------------------------------------

export class AiUnavailable extends Error {}

/** Exported for its test. */
export async function classify(cs: Candidate[]): Promise<Map<string, { keep: boolean; reason: string }>> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new AiUnavailable("The AI is not connected: OPENROUTER_API_KEY is not set");
  const people = cs.map((c) => ({
    handle: c.handle,
    name: c.profile?.name ?? "",
    bio: c.profile?.bio ?? "",
    link: c.profile?.link ?? "",
    captions: c.captions,
  }));
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://pm-dashboard-ashen.vercel.app",
      "X-Title": "PM Dashboard Creators to follow",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: `${CLASSIFY_PROMPT}\n\nCreators:\n${JSON.stringify(people)}\n\nReply with one JSON object and nothing else.` }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (res.status === 401 || res.status === 402 || res.status === 429 || res.status >= 500) {
    throw new AiUnavailable(res.status === 402 ? "The AI account is out of credit" : `The AI could not be reached (HTTP ${res.status})`);
  }
  if (!res.ok) throw new AiUnavailable(`The AI refused the request (HTTP ${res.status})`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  const out = new Map<string, { keep: boolean; reason: string }>();
  if (start < 0 || end <= start) return out;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as { results?: { handle?: string; keep?: boolean; reason?: string }[] };
    for (const r of parsed.results ?? []) {
      if (r.handle) out.set(r.handle.toLowerCase().replace(/^@/, ""), { keep: r.keep === true, reason: r.reason ?? "" });
    }
  } catch {
    // Unreadable answer: every candidate is rejected as "AI gave no answer".
  }
  return out;
}
