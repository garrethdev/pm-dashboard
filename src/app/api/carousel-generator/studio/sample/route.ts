import { bad, body, guard, ok, str } from "@/server/carousel/http";
import { sampleCopy } from "@/server/carousel/services/studio";

/** Regenerate sample (DEV-22): new sample copy under the current direction. */
export async function POST(req: Request) {
  const g = await guard();
  if (g.denied) return g.denied;
  const b = await body(req);
  const template = b.template as Record<string, unknown> | undefined;
  if (!template) return bad("A template is required");
  try {
    return ok({ copy: await sampleCopy(template, str(b.writing, 20_000) || null) });
  } catch (err) {
    return bad(err instanceof Error ? err.message : "The writer failed", 502);
  }
}

export const dynamic = "force-dynamic";
