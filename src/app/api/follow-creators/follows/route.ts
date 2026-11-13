import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { parseAccountId } from "@/lib/data/account-id";
import { FollowRefusal, recordFollow, removeFollow } from "@/lib/data/follow-creators";

/**
 * POST /api/follow-creators/follows — one of our accounts followed a creator
 * (Creators to follow, Y6). DELETE takes it back, for a tick pressed by
 * mistake. Body for both: { creatorId, accountId }, the account id as text
 * (PF-22).
 */
async function parse(request: Request): Promise<{ creatorId: number; accountId: string } | NextResponse> {
  let body: { creatorId?: unknown; accountId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const accountId = parseAccountId(body.accountId);
  const creatorId = body.creatorId;
  if (accountId === null || typeof creatorId !== "number" || !Number.isSafeInteger(creatorId) || creatorId <= 0) {
    return NextResponse.json({ error: "invalid creator or account" }, { status: 400 });
  }
  return { creatorId, accountId };
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const parsed = await parse(request);
  if (parsed instanceof NextResponse) return parsed;
  try {
    await recordFollow(parsed.creatorId, parsed.accountId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FollowRefusal) return NextResponse.json({ error: err.message }, { status: 400 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "save failed" }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const parsed = await parse(request);
  if (parsed instanceof NextResponse) return parsed;
  try {
    await removeFollow(parsed.creatorId, parsed.accountId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "undo failed" }, { status: 502 });
  }
}
