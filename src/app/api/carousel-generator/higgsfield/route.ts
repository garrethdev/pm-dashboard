import { attempt, bad, guard, ok } from "@/server/carousel/http";
import { connectionStatus, disconnect } from "@/server/carousel/services/higgsfield";

/** What Settings shows: whether Higgsfield is connected, as whom, and whether the tokens work right now. */
export async function GET() {
  const g = await guard();
  if (g.denied) return g.denied;
  try {
    return ok(await connectionStatus());
  } catch (err) {
    console.error("higgsfield status failed", err);
    return bad("The Higgsfield connection could not be read", 502);
  }
}

/** Drop the connection (DEV-30, step one). The next generation will say Higgsfield is not connected. */
export async function DELETE() {
  const g = await guard();
  if (g.denied) return g.denied;
  return attempt(g.email, "carousel.higgsfield.disconnect", "higgsfield", disconnect);
}

export const dynamic = "force-dynamic";
