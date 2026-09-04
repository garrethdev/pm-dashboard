import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { INCIDENT_RANGES, getIncidentHistory, type IncidentRange } from "@/lib/data/incidents";

/** GET /api/incidents?range=30d — powers the range switcher on /incidents
 *  without a full navigation. */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "30d";

  // Validate against the known set rather than trusting the query string.
  if (!INCIDENT_RANGES.some((r) => r.key === range)) {
    return NextResponse.json({ error: "invalid range" }, { status: 400 });
  }

  try {
    const { data, fetchedAt } = await getIncidentHistory(range as IncidentRange);
    return NextResponse.json({ data, fetchedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}
