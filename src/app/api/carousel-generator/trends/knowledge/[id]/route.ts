import { attempt, bad, body, guard } from "@/server/carousel/http";
import { setRuleStatus } from "@/server/carousel/repo/trends";

/** Accept or Reject a proposed rule. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard();
  if (g.denied) return g.denied;
  const { id } = await params;
  const n = Number(id);
  if (!Number.isInteger(n)) return bad("Bad id");
  const b = await body(req);
  const status = b.status === "active" || b.status === "rejected" ? b.status : null;
  if (!status) return bad("status must be active or rejected");
  return attempt(g.email, "carousel.rule.status", String(n), () => setRuleStatus(n, status, g.email), { status });
}

export const dynamic = "force-dynamic";
