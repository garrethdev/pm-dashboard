/**
 * The Rows tab (D15): what is sitting in a type's lane table, and in words
 * why each row cannot post. Read-only; every repair happens on the screen
 * that owns it.
 */
import { dbCount, dbGet } from "@/server/carousel/repo/db";
import type { LaneRow } from "@/server/carousel/repo/types";

interface GlowupRow {
  carousel_id: string | null;
  deck_key: string | null;
  caption: string | null;
  music: string | null;
  posting_date: string | null;
  geelark_profile: string | null;
  posting_status: string | null;
  render_status: string | null;
  gatekeep_status: string | null;
  scheduler_ready: boolean;
  approved: boolean;
  slide_1_url: string | null;
  created_at: string | null;
}

interface CoveredEyeRow {
  carousel_id: string | null;
  caption: string | null;
  music: string | null;
  posting_date: string | null;
  geelark_profile: string | null;
  posting_status: string | null;
  status: string | null;
  gatekeep_status: string | null;
  scheduler_ready: boolean;
  approved: boolean | null;
  slide_1_url: string | null;
  created_at: string | null;
}

const PAGE_SIZE = 25;

function status(r: { posting_status: string | null; scheduler_ready: boolean; rendered: boolean; gate: string | null }): { status: string; blocker: string | null } {
  if (r.posting_status === "Posted") return { status: "Posted", blocker: null };
  if (r.posting_status === "Ready") return { status: "Ready", blocker: null };
  if (r.posting_status === "Hold") return { status: "Hold", blocker: "On hold by hand" };
  if (!r.rendered) return { status: "Not rendered", blocker: "The slides have not been painted yet" };
  if (r.gate === "rejected") return { status: "Rejected", blocker: "The gatekeeper rejected it" };
  if (r.gate === "pending" || r.gate === null) return { status: "Awaiting gate", blocker: "The gatekeeper has not scored it" };
  if (!r.scheduler_ready) return { status: "Not ready", blocker: "The scheduler does not see it as ready" };
  return { status: "In pool", blocker: null };
}

export async function laneRows(table: string, page = 0): Promise<{ rows: LaneRow[]; total: number; ready: number }> {
  const from = page * PAGE_SIZE;
  if (table === "glowup_decks") {
    const [rows, total, ready] = await Promise.all([
      dbGet<GlowupRow[]>(`glowup_decks?select=carousel_id,deck_key,caption,music,posting_date,geelark_profile,posting_status,render_status,gatekeep_status,scheduler_ready,approved,slide_1_url,created_at&order=created_at.desc&limit=${PAGE_SIZE}&offset=${from}`),
      dbCount("glowup_decks"),
      dbCount("glowup_decks?scheduler_ready=eq.true&posting_status=neq.Posted"),
    ]);
    return {
      total,
      ready,
      rows: rows.map((r) => ({
        id: r.carousel_id ?? r.deck_key ?? "",
        caption: r.caption,
        music: r.music,
        postingDate: r.posting_date,
        profile: r.geelark_profile,
        thumbnail: r.slide_1_url,
        deckId: null,
        createdAt: r.created_at,
        ...status({ posting_status: r.posting_status, scheduler_ready: r.scheduler_ready, rendered: r.render_status === "rendered" || Boolean(r.slide_1_url), gate: r.gatekeep_status }),
      })),
    };
  }
  if (table === "covered_eye_carousel") {
    const [rows, total, ready] = await Promise.all([
      dbGet<CoveredEyeRow[]>(`covered_eye_carousel?select=carousel_id,caption,music,posting_date,geelark_profile,posting_status,status,gatekeep_status,scheduler_ready,approved,slide_1_url,created_at&order=created_at.desc&limit=${PAGE_SIZE}&offset=${from}`),
      dbCount("covered_eye_carousel"),
      dbCount("covered_eye_carousel?scheduler_ready=eq.true&posting_status=neq.Posted"),
    ]);
    return {
      total,
      ready,
      rows: rows.map((r) => ({
        id: r.carousel_id ?? "",
        caption: r.caption,
        music: r.music,
        postingDate: r.posting_date,
        profile: r.geelark_profile,
        thumbnail: r.slide_1_url,
        deckId: null,
        createdAt: r.created_at,
        ...status({ posting_status: r.posting_status, scheduler_ready: r.scheduler_ready, rendered: r.status === "rendered" || Boolean(r.slide_1_url), gate: r.gatekeep_status }),
      })),
    };
  }
  return { rows: [], total: 0, ready: 0 };
}
