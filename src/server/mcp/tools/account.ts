import { z } from "zod";
import { getAccountAnalytics } from "@/lib/data/account-analytics";
import { getAccountDeep } from "@/lib/data/account-deep-build";
import { getAccountDetail } from "@/lib/data/account-detail";
import { getAccountPosts } from "@/lib/data/account-posts";
import { getAccounts } from "@/lib/data/accounts";
import { getForensicsReport } from "@/lib/data/forensics";
import { getWarmupReportsForProfile } from "@/lib/data/warmup-reports";
import { hasAnalytics } from "@/lib/platform";
import { defineTool } from "@/server/mcp/registry";
import { failure, paginate, reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, limitInput, listReply, matchesAccount, stamp } from "@/server/mcp/tools/common";

/**
 * One account's page and its tabs.
 *
 * Two of these readers refresh display caches as they read, exactly as opening
 * the account page does: post thumbnails (post_thumbnails, through TikTok's
 * oEmbed) and the profile card (account_profile_cards, through ScrapeCreators).
 * Nothing else is written.
 */
export const pmAccount = defineTool({
  name: "pm_account",
  title: "One account",
  description:
    'One account in depth, found by "Profile 20", "20" or its @handle. view=row: its Accounts-page row with every field. view=detail: followers, view totals, allowed content types, the task log and the queued tasks. view=posts: every post with its views. view=analytics: views over a range with its best posts. view=deep: the deep analysis (hooks, carousels, watch curve, audience). view=forensics: the ban forensics report. view=warmup_reports: the warmup robot\'s reports.',
  pages: ["/accounts/[profile]", "/accounts/[profile]/forensics"],
  input: {
    account: z.string().min(1).describe('"Profile 20", "20", or the handle with or without @.'),
    view: z
      .enum(["row", "detail", "posts", "analytics", "deep", "forensics", "warmup_reports"])
      .optional()
      .describe("row (default), detail, posts, analytics, deep, forensics or warmup_reports."),
    range: z.enum(["7d", "14d", "30d", "all"]).optional().describe("For view=analytics. Default 7d."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "row";
    const accounts = await getAccounts();
    const matches = accounts.data.filter((a) => matchesAccount(a, args.account));
    if (matches.length === 0) return failure("pm_account", `No account matches "${args.account}". Use pm_accounts to list them.`);
    if (matches.length > 1) {
      return failure(
        "pm_account",
        `"${args.account}" matches ${matches.length} accounts: ${matches.map((m) => `${m.profile} (${m.platform})`).join(", ")}. Use the Profile name.`,
      );
    }
    const a = matches[0];
    const meta = { tool: "pm_account", view };
    const who = { profile: a.profile, username: a.username, platform: a.platform, character: a.character };

    if (view === "row") return reply(a, { ...meta, ...stamp(accounts) });

    if (view === "detail") {
      const res = await getAccountDetail(a.profile);
      if (!res.data) return failure("pm_account", `No detail recorded for ${a.profile}.`);
      const limit = args.limit ?? 50;
      const { tasks, pendingTasks, ...rest } = res.data;
      return reply(
        {
          ...rest,
          tasks: tasks.slice(0, limit),
          pendingTasks: pendingTasks.slice(0, limit),
          taskCounts: { tasks: tasks.length, pendingTasks: pendingTasks.length },
        },
        { ...meta, ...stamp(res), truncated: tasks.length > limit || pendingTasks.length > limit, note: tasks.length > limit || pendingTasks.length > limit ? `Task lists cut to ${limit}; raise limit for more.` : undefined },
      );
    }

    if (view === "forensics") {
      const res = await getForensicsReport(a.profile);
      return reply({ account: who, report: res.data }, { ...meta, ...stamp(res) });
    }

    if (view === "warmup_reports") {
      const reports = await getWarmupReportsForProfile(a.profile, 200);
      return listReply({ ...meta, ...stamp() }, reports, args, { account: who });
    }

    // The views below read the views feeds, which are keyed by handle.
    if (!hasAnalytics(a.platform)) return failure("pm_account", `Views are not collected for ${a.platform} accounts.`);
    if (!a.username) return failure("pm_account", `${a.profile} has no username recorded, so there are no posts to read.`);

    if (view === "posts") {
      const res = await getAccountPosts(a.username, a.platform);
      return listReply({ ...meta, ...stamp(res) }, res.data, args, { account: who });
    }
    if (view === "analytics") {
      const res = await getAccountAnalytics(a.username, a.platform, args.range ?? "7d");
      return reply({ account: who, range: args.range ?? "7d", analytics: res.data }, { ...meta, ...stamp(res) });
    }
    // deep
    const res = await getAccountDeep(a.username, a.platform);
    const page = paginate([res.data], 1);
    return reply({ account: who, deep: page.rows[0] }, { ...meta, ...stamp(res) });
  },
});
