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
 * given to an account or posted. For cleora_content this reproduces the
 * pool's live count (32 on 2026-10-05). Viral Theories and 3-Slide Journey
 * are not registered content types yet, so the pool has no branch for them;
 * the same rule is applied here directly.
 *
 * A table is only answered for if it is listed here — the sheet names tables
 * by text, and that text must never reach a query unchecked.
 */
export const SHEET_LANES: { table: string; media: string }[] = [
  { table: "cleora_content", media: "video_url" },
  { table: "viral_theories_carousel", media: "slide_1_url" },
  { table: "journey_3slide_carousel", media: "slide_1_url" },
];

export interface SheetLaneStock {
  table: string;
  have: number;
}

function readyFilter(media: string): string {
  return [
    "and=(or(posting_status.is.null,posting_status.eq.),or(quality_status.is.null,quality_status.neq.poor))",
    "geelark_profile=is.null",
    "scheduler_ready=is.true",
    "gatekeep_status=eq.approved",
    `${media}=not.is.null`,
    "caption=not.is.null",
  ].join("&");
}

export async function getSheetInventory(): Promise<SheetLaneStock[]> {
  return Promise.all(
    SHEET_LANES.map(async ({ table, media }) => {
      const rows = await sbRestAll<{ id: unknown }>(`${table}?select=id&${readyFilter(media)}&order=id`);
      return { table, have: rows.length };
    }),
  );
}
