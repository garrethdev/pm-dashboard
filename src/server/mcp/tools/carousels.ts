import { z } from "zod";
import { getBatch, getDeckRow, listBatches } from "@/server/carousel/repo/batches";
import { getCarouselType, listCarouselTypes } from "@/server/carousel/repo/catalog";
import { getLibrary, listLibraries } from "@/server/carousel/repo/libraries";
import { getTemplateRecord, listTemplateRecords } from "@/server/carousel/repo/templates";
import { listWriting } from "@/server/carousel/repo/writing";
import { defineTool } from "@/server/mcp/registry";
import { failure, reply } from "@/server/mcp/shape";
import { cursorInput, fieldsInput, limitInput, listReply, stamp } from "@/server/mcp/tools/common";

/** The Carousel Generator: types, batches, decks, templates, writing and image libraries. */
export const pmCarousels = defineTool({
  name: "pm_carousels",
  title: "Carousel Generator",
  description:
    "The Carousel Generator. view=types: every carousel type with its character, status, posts left, days of cover, median views and latest batch. view=type: one type by id or slug, with its writing versions and recent batches. view=batches: batches newest first, optionally for one type. view=batch: one batch with its decks. view=deck: one deck by id. view=templates: the slide templates (without their layout data). view=template: one template with its layout. view=libraries: the image libraries. view=library: one library with its pictures (links to small copies).",
  pages: [
    "/carousel-generator",
    "/carousel-generator/types",
    "/carousel-generator/types/[slug]",
    "/carousel-generator/history",
    "/carousel-generator/batches/[id]",
    "/carousel-generator/library",
    "/carousel-generator/library/[id]",
    "/carousel-generator/studio",
    "/carousel-generator/studio/[template]",
  ],
  input: {
    view: z
      .enum(["types", "type", "batches", "batch", "deck", "templates", "template", "libraries", "library"])
      .optional()
      .describe("types (default), type, batches, batch, deck, templates, template, libraries or library."),
    id: z.string().optional().describe("The type id or slug, batch id, deck id, template id or slug, or library id the view needs."),
    type: z.string().optional().describe("For view=batches: only this type id."),
    fields: fieldsInput,
    limit: limitInput,
    cursor: cursorInput,
  },
  run: async (args) => {
    const view = args.view ?? "types";
    const meta = { tool: "pm_carousels", view, ...stamp() };
    const need = (what: string) => failure("pm_carousels", `view=${view} needs id (${what}).`);

    switch (view) {
      case "types":
        return listReply(meta, await listCarouselTypes(), args);
      case "type": {
        if (!args.id) return need("a type id or slug");
        const t = await getCarouselType(args.id);
        if (!t) return failure("pm_carousels", `No carousel type "${args.id}".`);
        const [writing, batches] = await Promise.all([listWriting(t.id), listBatches({ typeId: t.id, limit: 20 })]);
        return reply({ ...t, writingVersions: writing, recentBatches: batches }, meta);
      }
      case "batches":
        return listReply(meta, await listBatches({ typeId: args.type, limit: 500 }), args);
      case "batch": {
        if (!args.id) return need("a batch id");
        const b = await getBatch(args.id);
        return b ? reply(b, meta) : failure("pm_carousels", `No batch "${args.id}".`);
      }
      case "deck": {
        if (!args.id) return need("a deck id");
        const d = await getDeckRow(args.id);
        return d ? reply(d, meta) : failure("pm_carousels", `No deck "${args.id}".`);
      }
      case "templates": {
        // The layout data is large; view=template returns it for one template.
        const rows = (await listTemplateRecords()).map((t) => ({ ...t, template: undefined }));
        return listReply(meta, rows, args);
      }
      case "template": {
        if (!args.id) return need("a template id or slug");
        const t = await getTemplateRecord(args.id);
        return t ? reply(t, meta) : failure("pm_carousels", `No template "${args.id}".`);
      }
      case "libraries":
        return listReply(meta, await listLibraries(), args);
      case "library": {
        if (!args.id) return need("a library id");
        const lib = await getLibrary(args.id);
        if (!lib) return failure("pm_carousels", `No library "${args.id}".`);
        const { images, ...rest } = lib;
        return listReply(meta, images, args, rest);
      }
    }
  },
});
