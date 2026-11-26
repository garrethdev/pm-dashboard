import { z } from "zod";
import { getAnalytics, getTopContent } from "@/lib/data/analytics";
import { getTopPosts } from "@/lib/data/top-posts";
import { defineTool } from "@/server/mcp/registry";
import { reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, fleetInput, fleetOf, limitInput, listReply, stamp, tableReply } from "@/server/mcp/tools/common";

const AUDIENCE_COLS = "id,platform,account,source,read_at,read_on,timeframe,people,gender,age,country,gap,notes";

/**
 * The Analytics pages. `top_posts` resolves thumbnails as the page does, which
 * refreshes the post_thumbnails cache; nothing else is written.
 */
export const pmAnalytics = defineTool({
  name: "pm_analytics",
  title: "Analytics",
  description:
    "Views and performance, as the Analytics pages show them. view=summary: totals, the daily series, outliers and the account leaderboard for a range and platform. view=top_content: the judged top content for this week, this month or all time. view=top_posts: the most-viewed posts. view=audience: the stored audience readings (gender, age, country) per account, newest first.",
  pages: ["/analytics", "/analytics/analysis"],
  input: {
    view: z.enum(["summary", "top_content", "top_posts", "audience"]).optional().describe("summary (default), top_content, top_posts or audience."),
    fleet: fleetInput,
    range: z
      .enum(["7d", "14d", "30d", "all", "week", "month"])
      .optional()
      .describe("summary: 7d, 14d, 30d or all (default 7d). top_content and top_posts: week, month or all (default week)."),
    platform: z.enum(["all", "tiktok", "instagram", "facebook"]).optional().describe("Default all."),
    account: z.string().optional().describe("For view=audience: only this account handle."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "summary";
    const fleet = fleetOf(args.fleet);
    const platform = args.platform ?? "all";
    const meta = { tool: "pm_analytics", view, fleet };

    if (view === "summary") {
      const range = args.range === "7d" || args.range === "14d" || args.range === "30d" || args.range === "all" ? args.range : "7d";
      const res = await getAnalytics(range, platform, fleet);
      return reply({ range, platform, ...res.data }, { ...meta, ...stamp(res) });
    }

    const range = args.range === "month" || args.range === "all" ? args.range : "week";
    if (view === "top_content") {
      const res = await getTopContent(range, fleet);
      const { posts, ...rest } = res.data;
      return listReply({ ...meta, ...stamp(res) }, posts, args, { range, ...rest });
    }
    if (view === "top_posts") {
      const posts = await getTopPosts(range, platform, fleet);
      return listReply({ ...meta, ...stamp() }, posts, args, { range, platform });
    }

    // audience: the table the weekly Instagram pull and the phone robot fill.
    // Readings are per account, not per fleet, so there is no fleet filter.
    const filters = [
      platform !== "all" ? `&platform=eq.${platform}` : "",
      args.account ? `&account=eq.${encodeURIComponent(args.account.replace(/^@/, ""))}` : "",
    ].join("");
    return tableReply(
      { tool: "pm_analytics", view },
      `audience_readings?select=${AUDIENCE_COLS}${filters}&order=read_at.desc,id.desc`,
      args,
    );
  },
});
