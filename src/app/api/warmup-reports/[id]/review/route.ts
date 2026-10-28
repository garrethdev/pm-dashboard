import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { reviewAvailable, reviewWarmup } from "@/lib/data/warmup-report-review";
import {
  getWarmupReportDiary,
  getWarmupReportScreenshot,
  parseReportId,
  saveWarmupReview,
} from "@/lib/data/warmup-reports";
import { actingUserEmail } from "@/lib/data/writes";

// The diary, the screenshot shrunk, and one model call.
export const maxDuration = 120;

/**
 * POST /api/warmup-reports/:id/review — ask Claude what happened in a warmup
 * (Garreth, 2026-10-28). Anyone signed in, like the Warmups page itself.
 * Answers the saved read; asking again replaces the previous one.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;
  const id = parseReportId((await params).id);
  if (id === null) return NextResponse.json({ error: "No such report." }, { status: 404 });
  if (!reviewAvailable()) {
    return NextResponse.json({ error: "The analysis is not connected: OPENROUTER_API_KEY is not set." }, { status: 503 });
  }
  try {
    const report = await getWarmupReportDiary(id);
    if (!report) return NextResponse.json({ error: "No such report." }, { status: 404 });
    const [screenshot, by] = await Promise.all([
      report.hasScreenshot ? getWarmupReportScreenshot(id) : Promise.resolve(null),
      actingUserEmail(),
    ]);
    const { model, review } = await reviewWarmup(report, screenshot);
    const reviewedAt = await saveWarmupReview(id, { model, review, by });
    return NextResponse.json({ ok: true, review, reviewedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The analysis could not be made." },
      { status: 502 },
    );
  }
}
