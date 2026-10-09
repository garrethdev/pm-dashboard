import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getWarmupReportDiary, parseReportId } from "@/lib/data/warmup-reports";

/**
 * GET /api/warmup-reports/:id — one warmup report with its diary, for the
 * account page (Garreth, 2026-10-09).
 *
 * For a signed-in person, not the robot: the robot's token opens only the
 * addresses under /api/warmup-runner/. Fetched when a row is clicked, because
 * a diary can be a megabyte and the list never loads one. The screenshot is
 * its own address (./screenshot), so this answer stays small enough to send.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id: raw } = await params;
  const id = parseReportId(raw);
  if (id === null) return NextResponse.json({ error: "No such report." }, { status: 404 });

  try {
    const report = await getWarmupReportDiary(id);
    if (!report) return NextResponse.json({ error: "No such report." }, { status: 404 });
    return NextResponse.json({ report });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The report could not be read." },
      { status: 502 },
    );
  }
}
