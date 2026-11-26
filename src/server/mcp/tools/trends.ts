import { z } from "zod";
import {
  getAnalysis,
  getReference,
  listDigests,
  listKnowledge,
  savedFeed,
  seenFeed,
  trending,
  unseenFeed,
} from "@/server/trends/repo";
import { defineTool } from "@/server/mcp/registry";
import { failure, reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/**
 * The Trends page. Reading the feed here never marks anything as seen: that
 * only happens when a person scrolls past a card on the page.
 */
export const pmTrends = defineTool({
  name: "pm_trends",
  title: "Trends",
  description:
    "The Trends page: outside carousels the research robots found, scored, and studied. view=feed: the next carousels you have not seen yet, best first (niche main or other). view=seen: what you have already looked at. view=saved: what you saved. view=trending: today's top few. view=reference: one carousel by id with its full study (how it works, what to keep, limits). view=digests: the recent study digests. view=knowledge: the content rules learned from them.",
  pages: ["/trends"],
  input: {
    view: z
      .enum(["feed", "seen", "saved", "trending", "reference", "digests", "knowledge"])
      .optional()
      .describe("feed (default), seen, saved, trending, reference, digests or knowledge."),
    id: z.number().int().optional().describe("For view=reference: the carousel's id. For view=feed: continue after this id."),
    niche: z.enum(["main", "other"]).optional().describe("For view=feed. Default main."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args, caller) => {
    const view = args.view ?? "feed";
    const meta = { tool: "pm_trends", view, ...stamp() };
    const viewer = caller.email;
    switch (view) {
      case "feed": {
        const { items, more } = await unseenFeed(viewer, args.id ?? null, args.niche ?? "main");
        const last = items[items.length - 1];
        return listReply(meta, items, args, { more, continueAfterId: more && last ? last.id : null });
      }
      case "seen": {
        const { items, more } = await seenFeed(viewer, null);
        return listReply(meta, items, args, { more });
      }
      case "saved":
        return listReply(meta, await savedFeed(viewer), args);
      case "trending":
        return reply(await trending(viewer), meta);
      case "reference": {
        if (args.id === undefined) return failure("pm_trends", "view=reference needs id.");
        const [ref, analysis] = await Promise.all([getReference(viewer, args.id), getAnalysis(args.id)]);
        return ref ? reply({ ...ref, analysis }, meta) : failure("pm_trends", `No carousel with id ${args.id}.`);
      }
      case "digests":
        return listReply(meta, await listDigests(viewer), args);
      case "knowledge":
        return listReply(meta, await listKnowledge(), args);
    }
  },
});
