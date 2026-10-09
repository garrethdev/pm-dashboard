import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getWarmupReportScreenshot, parseReportId } from "@/lib/data/warmup-reports";

/**
 * GET /api/warmup-reports/:id/screenshot — the screen when a warmup stopped,
 * as a PNG, for the diary on the account page. Signed-in people only.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id: raw } = await params;
  const id = parseReportId(raw);
  if (id === null) return NextResponse.json({ error: "No such screenshot." }, { status: 404 });

  try {
    const png = await getWarmupReportScreenshot(id);
    if (!png) return NextResponse.json({ error: "No such screenshot." }, { status: 404 });
    return new Response(png as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        // A person's browser may keep it a while; it never changes, and after
        // 30 days it is gone from the database anyway.
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The screenshot could not be read." },
      { status: 502 },
    );
  }
}
