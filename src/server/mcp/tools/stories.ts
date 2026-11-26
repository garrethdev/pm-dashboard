import { z } from "zod";
import { sbRest } from "@/lib/data/supabase";
import { defineTool } from "@/server/mcp/registry";
import { failure, reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, limitInput, stamp, tableReply } from "@/server/mcp/tools/common";

/**
 * The story catalog behind the Character 6 writers (Story Research Agent,
 * 2026-11-16 onward). No dashboard page reads these tables yet, so this tool
 * has its own thin reads. Every read names its columns.
 */

const STORY_SUMMARY =
  "id,platform,community,title,theme,judge_score,status,summary,best_line,who_hurt_her,emotion,setting,story_format,hook_pattern,product_entry,views,likes,comments,reaction_count,reaction_mood,created_at,source_url";
const STORY_FULL =
  "id,source_url,platform,kind,parent_url,community,title,text,views,likes,comments,found_by,theme,judge_score,best_line,who_hurt_her,detail,judge_notes,status,routed_to,run_id,judged_by,reviewed_at,reviewed_by,created_at,summary,story_format,hook_pattern,product_entry,setting,emotion,action,media_type,slide_images,slide_text,followers,outlier,reactions_read_at,reaction_count,reaction_mood,reaction_summary,reaction_hot_moments,reaction_questions,reaction_pushback,reaction_me_too,talk_ratio";
const HOOK_COLS =
  "id,hook,status,source,story_id,source_line,theme,story_format,hook_pattern,product_entry,setting,emotion,action,antagonist,char_count,checks,notes,written_by,run_id,reviewed_at,reviewed_by,used_count,last_used_at,created_at,lane,proven_views,proven_at,proven_deck";
const LANE_COLS = "lane,display_name,brief,slide_count,min_score,fallback_score,min_fit,breakout_views,active,created_at,updated_at";
const FIT_COLS = "story_id,lane,fit,reason,judged_by,judged_at";
const USE_COLS =
  "id,story_id,lane,status,run_id,deck_ref,hook_id,hook_text,best_views,views_checked_at,breakout_at,note,reserved_at,used_at,released_at";
const REACTION_COLS = "id,story_id,platform,comment_key,parent_key,is_reply,text,likes,reply_count,posted_at";
const RULE_COLS = "key,body,source_doc,updated_at";

const eq = (col: string, v: string | number | undefined) => (v === undefined || v === "" ? "" : `&${col}=eq.${encodeURIComponent(String(v))}`);

/** Words for a text search, with anything that would break PostgREST's or() syntax taken out. */
function searchTerm(q: string): string {
  return q.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export const pmStories = defineTool({
  name: "pm_stories",
  title: "Story bank and hooks",
  description:
    "The story catalog the Character 6 writers draw from. view=stories: judged real stories (score 1-10, theme, emotion, who hurt her, a summary), filterable by status, theme, platform, minimum score and a text search. view=story: one story with its comments, its fit to each lane, where it was used and its hooks. view=hooks: the hook library (drafted and proven hooks), filterable by status and lane. view=lanes: each lane's brief and score floors. view=lane_fit: stories ranked by fit for one lane. view=uses: which deck used which story. view=writer_rules: the shared rules every writer reads (voice, slide and hook rules).",
  pages: [],
  input: {
    view: z
      .enum(["stories", "story", "hooks", "lanes", "lane_fit", "uses", "writer_rules"])
      .optional()
      .describe("stories (default), story, hooks, lanes, lane_fit, uses or writer_rules."),
    id: z.number().int().optional().describe("For view=story: the story id."),
    q: z.string().optional().describe("For view=stories: words to find in the title, text or summary."),
    status: z.string().optional().describe("For stories, hooks and uses: only this status."),
    theme: z.string().optional().describe("For view=stories: only this theme."),
    platform: z.string().optional().describe("For view=stories: reddit, tiktok and so on."),
    minScore: z.number().int().min(1).max(10).optional().describe("For view=stories: judge score at least this."),
    lane: z.string().optional().describe("For hooks, lane_fit and uses: the lane key, e.g. divorce_recovery."),
    minFit: z.number().int().min(0).max(10).optional().describe("For view=lane_fit: fit at least this. Default 7."),
    detail: z.enum(["summary", "full"]).optional().describe("For view=stories: summary (default) or full, which adds the whole text and the comment reading."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "stories";
    const meta = { tool: "pm_stories", view };

    if (view === "story") {
      if (args.id === undefined) return failure("pm_stories", "view=story needs id.");
      const id = args.id;
      const [story, reactions, fit, uses, hooks] = await Promise.all([
        sbRest<Record<string, unknown>[]>(`story_bank?select=${STORY_FULL}&id=eq.${id}`),
        sbRest<Record<string, unknown>[]>(`story_reactions?select=${REACTION_COLS}&story_id=eq.${id}&order=likes.desc.nullslast&limit=50`),
        sbRest<Record<string, unknown>[]>(`story_lane_fit?select=${FIT_COLS}&story_id=eq.${id}&order=fit.desc`),
        sbRest<Record<string, unknown>[]>(`story_uses?select=${USE_COLS}&story_id=eq.${id}&order=id.desc`),
        sbRest<Record<string, unknown>[]>(`hook_library?select=${HOOK_COLS}&story_id=eq.${id}&order=id.desc&limit=50`),
      ]);
      if (!story[0]) return failure("pm_stories", `No story with id ${id}.`);
      return reply({ story: story[0], topComments: reactions, laneFit: fit, uses, hooks }, { ...meta, ...stamp() });
    }

    if (view === "stories") {
      const term = args.q ? searchTerm(args.q) : "";
      const search = term ? `&or=(${["title", "text", "summary"].map((c) => `${c}.ilike.*${encodeURIComponent(term)}*`).join(",")})` : "";
      const filters =
        eq("status", args.status) +
        eq("theme", args.theme) +
        eq("platform", args.platform) +
        (args.minScore ? `&judge_score=gte.${args.minScore}` : "") +
        search;
      const cols = args.detail === "full" ? STORY_FULL : STORY_SUMMARY;
      return tableReply(meta, `story_bank?select=${cols}${filters}&order=judge_score.desc.nullslast,id.desc`, args);
    }
    if (view === "hooks") {
      return tableReply(meta, `hook_library?select=${HOOK_COLS}${eq("status", args.status)}${eq("lane", args.lane)}&order=id.desc`, args);
    }
    if (view === "lanes") return tableReply(meta, `story_lanes?select=${LANE_COLS}&order=lane.asc`, args);
    if (view === "lane_fit") {
      if (!args.lane) return failure("pm_stories", "view=lane_fit needs lane. view=lanes lists them.");
      return tableReply(
        meta,
        `story_lane_fit?select=${FIT_COLS}${eq("lane", args.lane)}&fit=gte.${args.minFit ?? 7}&order=fit.desc,story_id.desc`,
        args,
      );
    }
    if (view === "uses") {
      return tableReply(meta, `story_uses?select=${USE_COLS}${eq("status", args.status)}${eq("lane", args.lane)}&order=id.desc`, args);
    }
    return tableReply(meta, `writer_resources?select=${RULE_COLS}&order=key.asc`, args);
  },
});
