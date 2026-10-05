import { sbRestAll } from "@/lib/data/supabase";

/**
 * Stock counts for the phone-farm production sheet (Garreth, 2026-10-05).
 *
 * The Google Sheet types the weekly cadence by hand and works out "Need to
 * produce" itself; all it asks the dashboard for is "Have" per content table.
 *
 * "Have" is the scheduler pool's own rule, the one every v_scheduler_pool
 * branch uses (WIRE-NEW-CONTENT-TYPE.md §8): approved by the gate, ready for
 * the scheduler, not rated poor, finished media and a caption, and not yet
 * given to an account or posted. It reproduces the pool's live count for
 * every lane listed (on 2026-10-05: Cleora 32, Cleora ASMR 42, the two
 * Character 6 lanes 0). The id column is each table's registry
 * source_id_column; not every table has an `id`.
 *
 * A table is only answered for if it is listed here — the sheet names tables
 * by text, and that text must never reach a query unchecked.
 */
export const SHEET_LANES: { table: string; idCol: string; media: string; extra?: string }[] = [
  { table: "cleora_content", idCol: "content_id", media: "video_url" },
  // The pool's cleora_asmr branch also demands a song, attached at post time.
  { table: "cleora_asmr", idCol: "content_id", media: "video_url", extra: "music_id=not.is.null" },
  { table: "viral_theories_carousel", idCol: "carousel_id", media: "slide_1_url" },
  { table: "journey_3slide_carousel", idCol: "carousel_id", media: "slide_1_url" },
];

export interface SheetLaneStock {
  table: string;
  have: number;
}

function readyFilter(media: string, extra?: string): string {
  return [
    "and=(or(posting_status.is.null,posting_status.eq.),or(quality_status.is.null,quality_status.neq.poor))",
    "geelark_profile=is.null",
    "scheduler_ready=is.true",
    "gatekeep_status=eq.approved",
    `${media}=not.is.null`,
    "caption=not.is.null",
    ...(extra ? [extra] : []),
  ].join("&");
}

export async function getSheetInventory(): Promise<SheetLaneStock[]> {
  return Promise.all(
    SHEET_LANES.map(async ({ table, idCol, media, extra }) => {
      const rows = await sbRestAll<unknown>(`${table}?select=${idCol}&${readyFilter(media, extra)}&order=${idCol}`);
      return { table, have: rows.length };
    }),
  );
}
