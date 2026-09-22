import { CONTENT_TYPES_TAG, TTL, cachedFetcher } from "@/lib/data/cache";
import { fetchCharacterOverrides } from "@/lib/data/cadence";
import { sbRpc } from "@/lib/data/supabase";
import type { Fleet } from "@/lib/fleet";

/**
 * Content Types page — the registry as a catalogue, with how each lane is
 * actually performing.
 *
 * Deliberately carries no inventory: how many pieces are left in a lane is the
 * Inventory page's question. This page answers "is this lane worth posting",
 * which is a performance question, so a lane with an empty pool and great
 * numbers still reads as a good lane here.
 *
 * Every row comes from content_type_stats_fleet(), which drives off the
 * registry rather than the performance tables — a paused or retired lane keeps
 * its numbers, because those numbers are the reason to leave it off or bring it
 * back.
 *
 * ONE FLEET AT A TIME (PF-19). The numbers are the same numbers, limited to the
 * accounts in the fleet being looked at, following Garreth's rule that an
 * account's data follows the account. EVERY LANE STILL APPEARS IN BOTH FLEETS:
 * a lane is a lane whichever phones post it, so on a fleet that has not posted
 * it yet it simply reads as a lane with no posts rather than disappearing. The
 * "last updated" time under the numbers is deliberately fleet-wide — it says
 * when the analytics feed last ran, which is one fact for the whole database.
 */

export type Lifecycle = "live" | "paused" | "retired";
export type Tier = "A" | "B" | "C" | "D";
export type Confidence = "low" | "medium" | "high";

export type CtRangeKey = "7d" | "14d" | "30d" | "all";

/** The same four windows the Analytics page offers, so the two read alike. */
export const CT_RANGES: { key: CtRangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "14d", label: "2 weeks", days: 14 },
  { key: "30d", label: "1 month", days: 30 },
  { key: "all", label: "All time", days: null },
];

/**
 * Analytics opens on 7 days; this page opens on a month.
 *
 * A lane posting once a week has a single post in seven days, and a median of
 * one number is not a median. At 30 days the same lane has four or five, which
 * is still thin but at least ranks honestly — and the card says "thin data"
 * when it is not.
 */
export const CT_DEFAULT_RANGE: CtRangeKey = "30d";

export interface ContentTypeRow {
  contentType: string;
  displayName: string;
  character: string;
  bucket: string | null;
  mediaShape: "video" | "image_carousel";
  lifecycle: Lifecycle;
  lifecycleChangedAt: string | null;
  lifecycleNote: string | null;
  /** Posts per week per account this lane is allocated, when live. */
  cadencePerWeek: number | null;
  cadenceCeilingPerWeek: number | null;
  /** What it was allocated before it was paused — the resume default. */
  cadenceBeforePause: number | null;
  posterActive: boolean;
  posts: number;
  views: number;
  avgViews: number | null;
  /** Median beats mean on a lane: one viral post drags an average anywhere. */
  medianViews: number | null;
  bestViews: number;
  engagement: number;
  engRate: number | null;
  /** % of posts that got 10 views or fewer — the suppression signal. */
  pctDead: number | null;
  pctGe500: number | null;
  /** % change in median views, recent half of the window vs the earlier half. */
  momentumPct: number | null;
  score: number | null;
  tier: Tier | null;
  confidence: Confidence;
  tiktokPosts: number;
  instagramPosts: number;
  lastPostedAt: string | null;
  /** Posts already on the calendar for this lane — a pause stops these too. */
  scheduledAhead: number;
  thumbUrl: string | null;
  thumbContentId: string | null;
}

export interface CharacterTypes {
  name: string;
  /** Best first — the card opens on this one. */
  types: ContentTypeRow[];
  /** Weekly GLP allocation currently spent across this character's live lanes. */
  allocated: number;
  /** THIS character's weekly GLP budget: its own override where it has one,
   *  the fleet number otherwise. Character 5 runs 7 a week against a fleet of
   *  11, and measuring it against the fleet painted a correct mix red. */
  glpPerWeek: number;
}

export interface ContentTypesData {
  rangeDays: number | null;
  /** When the performance tables were last filled — this page is not live. */
  lastIngest: string | null;
  /** The FLEET GLP budget. Only correct for a character that has no override
   *  of its own — read CharacterTypes.glpPerWeek per character instead. */
  glpPerWeek: number;
  characters: CharacterTypes[];
  all: ContentTypeRow[];
}

interface RawStat {
  content_type: string;
  display_name: string;
  character_name: string;
  quota_bucket: string | null;
  media_shape: string;
  lifecycle: string;
  lifecycle_changed_at: string | null;
  lifecycle_note: string | null;
  cadence_per_week: number | null;
  cadence_ceiling_per_week: number | null;
  cadence_before_pause: number | null;
  unified_poster_active: boolean;
  posts: number;
  views: number;
  avg_views: number | null;
  median_views: number | null;
  best_views: number;
  engagement: number;
  eng_rate: number | null;
  pct_dead: number | null;
  pct_ge500: number | null;
  momentum_pct: number | null;
  score: number | null;
  tier: string | null;
  confidence: string;
  tiktok_posts: number;
  instagram_posts: number;
  last_posted_at: string | null;
  scheduled_ahead: number;
  thumb_url: string | null;
  thumb_content_id: string | null;
  last_ingest: string | null;
}

const num = (v: number | null | undefined) => (v == null ? 0 : Number(v));
const orNull = (v: number | null | undefined) => (v == null ? null : Number(v));

function toRow(r: RawStat): ContentTypeRow {
  return {
    contentType: r.content_type,
    displayName: r.display_name,
    character: r.character_name,
    bucket: r.quota_bucket,
    mediaShape: r.media_shape === "image_carousel" ? "image_carousel" : "video",
    lifecycle: (["live", "paused", "retired"] as const).includes(r.lifecycle as Lifecycle)
      ? (r.lifecycle as Lifecycle)
      : "live",
    lifecycleChangedAt: r.lifecycle_changed_at,
    lifecycleNote: r.lifecycle_note,
    cadencePerWeek: orNull(r.cadence_per_week),
    cadenceCeilingPerWeek: orNull(r.cadence_ceiling_per_week),
    cadenceBeforePause: orNull(r.cadence_before_pause),
    posterActive: r.unified_poster_active === true,
    posts: num(r.posts),
    views: num(r.views),
    avgViews: orNull(r.avg_views),
    medianViews: orNull(r.median_views),
    bestViews: num(r.best_views),
    engagement: num(r.engagement),
    engRate: orNull(r.eng_rate),
    pctDead: orNull(r.pct_dead),
    pctGe500: orNull(r.pct_ge500),
    momentumPct: orNull(r.momentum_pct),
    score: orNull(r.score),
    tier: (r.tier as Tier | null) ?? null,
    confidence: (r.confidence as Confidence) ?? "low",
    tiktokPosts: num(r.tiktok_posts),
    instagramPosts: num(r.instagram_posts),
    lastPostedAt: r.last_posted_at,
    scheduledAhead: num(r.scheduled_ahead),
    thumbUrl: r.thumb_url,
    thumbContentId: r.thumb_content_id,
  };
}

/**
 * Live lanes first, then paused, then retired — and within each group the
 * better lane first. A retired lane sorted purely on score would open the card
 * on something the scheduler will never post.
 */
const LIFECYCLE_ORDER: Record<Lifecycle, number> = { live: 0, paused: 1, retired: 2 };

function rank(a: ContentTypeRow, b: ContentTypeRow): number {
  const byState = LIFECYCLE_ORDER[a.lifecycle] - LIFECYCLE_ORDER[b.lifecycle];
  if (byState !== 0) return byState;
  // A lane with no posts in the window has no score; it sorts last rather than
  // above a lane that scored badly but at least ran.
  return (b.score ?? -1) - (a.score ?? -1);
}

async function fetchContentTypes(
  days: number | null,
  glpPerWeek: number,
  fleet: Fleet,
): Promise<ContentTypesData> {
  const [raw, overrides] = await Promise.all([
    sbRpc<RawStat[]>("content_type_stats_fleet", { p_days: days, p_fleet: fleet }),
    fetchCharacterOverrides(),
  ]);
  const all = (raw ?? []).map(toRow);

  // The cards are per character, and only GLP lanes belong to a character —
  // filler and podcast are registered against "All" and are fleet-wide.
  const glp = all.filter((t) => t.bucket === "glp" && t.character.startsWith("Character"));
  const names = [...new Set(glp.map((t) => t.character))].sort();

  return {
    rangeDays: days,
    // Identical on every row; the RPC computes it once.
    lastIngest: raw?.[0]?.last_ingest ?? null,
    glpPerWeek,
    characters: names.map((name) => {
      const types = glp.filter((t) => t.character === name).sort(rank);
      return {
        name,
        types,
        allocated: types
          .filter((t) => t.lifecycle === "live")
          .reduce((acc, t) => acc + (t.cadencePerWeek ?? 0), 0),
        glpPerWeek: overrides[name]?.glpWeekCap ?? glpPerWeek,
      };
    }),
    all: all.sort(
      (a, b) => a.character.localeCompare(b.character) || rank(a, b),
    ),
  };
}

export function getContentTypes(
  range: CtRangeKey = CT_DEFAULT_RANGE,
  glpPerWeek = 10,
  fleet: Fleet = "cloud",
) {
  const entry = CT_RANGES.find((r) => r.key === range);
  // `?? 30` would be wrong: "all" carries a deliberate null.
  const days = entry ? entry.days : 30;
  return cachedFetcher(
    // v2, and the fleet is part of the key: two people looking at two fleets
    // must not be served each other's numbers.
    `content-types-v2:${fleet}:${range}`,
    TTL.supabase,
    () => fetchContentTypes(days, glpPerWeek, fleet),
    // One shared tag across every range, so a lifecycle change or the Refresh
    // button expires all three at once rather than only the range on screen.
    { tags: [CONTENT_TYPES_TAG] },
  )();
}
