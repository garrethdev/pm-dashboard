import { NextResponse } from "next/server";
import { requireReviewer } from "@/lib/api-auth";
import { parseRowId } from "@/lib/data/device-rules";
import { getDevice } from "@/lib/data/devices";
import { reviewAvailable, reviewSession } from "@/lib/data/phone-session-review";
import { getSession, getSessionFrames, saveReview } from "@/lib/data/phone-sessions";
import { actingUserEmail } from "@/lib/data/writes";

// Forty frames read from the bucket, shrunk, and one long model call.
export const maxDuration = 120;

/**
 * POST /api/sessions/[id]/review — ask Claude to read a session (PF-26).
 * Reviewers only; anyone else gets 404, the same as the page. Answers the
 * saved review. Asking again replaces the previous read.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireReviewer();
  if (denied) return denied;
  const id = parseRowId((await params).id);
  if (id === null) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!reviewAvailable()) {
    return NextResponse.json({ error: "The reviewer is not connected: OPENROUTER_API_KEY is not set." }, { status: 503 });
  }
  try {
    const session = await getSession(id);
    if (!session || session.status !== "stored") return NextResponse.json({ error: "not found" }, { status: 404 });
    const [frames, device, by] = await Promise.all([
      getSessionFrames(id),
      getDevice(session.deviceId).then((d) => d.data),
      actingUserEmail(),
    ]);
    const result = await reviewSession(session, frames, {
      deviceName: device?.name ?? session.deviceName,
      accounts: device?.accounts.map((a) => ({ username: a.username, platform: a.platform })) ?? [],
    });
    await saveReview(id, { model: result.model, review: result.review, by });
    return NextResponse.json({ ok: true, review: result.review, framesShown: result.framesShown, model: result.model });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The review could not be made." },
      { status: 502 },
    );
  }
}
