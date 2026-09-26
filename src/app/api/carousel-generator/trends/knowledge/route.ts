import { bad, guard, ok } from "@/server/carousel/http";
import { listKnowledge } from "@/server/carousel/repo/trends";

export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    return ok({ rules: await listKnowledge() });
  } catch (err) {
    console.error("carousel knowledge failed", err);
    return bad("The knowledge base could not be loaded", 502);
  }
}

export const dynamic = "force-dynamic";
