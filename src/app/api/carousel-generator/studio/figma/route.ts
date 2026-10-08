import { bad, body, guard, ok, str } from "@/server/carousel/http";
import { logError } from "@/server/carousel/log";
import { FigmaError, copyRepeatedPictures, parseFigmaLink, readFigma, readLayout, sizeFor, templateFromFigma } from "@/server/carousel/services/figma";
import { blankTemplate } from "@/server/carousel/services/studio";
import { validateTemplate } from "@/lib/carousel/template/validate";

/**
 * Start from a Figma link (D11). `peek: true` only reads the file and says
 * what it holds, for the chip under the link. Otherwise the frames become
 * a template: pictures that repeat across samples are copied into our
 * storage and pinned; the rest is for the writer and the library.
 */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const link = str(b.url, 500).trim();
  if (!link) return bad("Paste a Figma link");
  try {
    const { fileKey, nodeId } = parseFigmaLink(link);
    const file = await readFigma(fileKey, nodeId);
    const layout = readLayout(file.node);
    const first = layout.samples[0];
    if (b.peek === true) {
      return ok({ name: file.name, node: file.node.name, frames: first.length, samples: layout.samples.length, width: first[0].width, height: first[0].height, size: sizeFor(first[0]) });
    }
    const pinned = await copyRepeatedPictures(fileKey, layout);
    const character = str(b.character, 40) || "Character 3";
    const base = blankTemplate("draft", file.name.slice(0, 80) || "New carousel", character, sizeFor(first[0]));
    const made = templateFromFigma(base, layout, pinned);
    made.template.source_figma = { file: fileKey, node: nodeId, name: file.name };
    validateTemplate(made.template);
    return ok({ template: made.template, sample: made.sample, notes: made.notes, file: { name: file.name, frames: first.length, samples: layout.samples.length, size: made.size } });
  } catch (err) {
    if (err instanceof FigmaError) return bad(err.message, err.code === "NO_TOKEN" ? 503 : err.code === "FAILED" ? 502 : 400, err.code);
    logError("studio figma", err);
    return bad(err instanceof Error ? err.message : "The Figma file could not be read", 502);
  }
}

export const dynamic = "force-dynamic";
