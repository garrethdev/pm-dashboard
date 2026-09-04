import { NextResponse } from "next/server";
import { sbRest } from "@/lib/data/supabase";
import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/api-auth";
import { ACCOUNTS_TAG, accountDetailTag } from "@/lib/data/cache";
import {
  actingUserEmail,
  auditLog,
  getAccountState,
  recordHealthReview,
  validHumanVerdict,
  validProfile,
} from "@/lib/data/writes";

/**
 * POST /api/accounts/health-review — record a human's read of a system verdict.
 *
 * The detector recommends; a person decides. This endpoint stores that decision
 * and nothing else: it never touches `accounts`, never writes health_status,
 * and never sets is_active. Retiring remains a separate, explicit action.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: { profile?: unknown; systemVerdict?: unknown; verdict?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!validProfile(body.profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }
  if (!validHumanVerdict(body.verdict)) {
    return NextResponse.json({ error: "invalid verdict" }, { status: 400 });
  }
  // The verdict on screen when the reviewer decided. Required, because a review
  // only means anything against the evidence it was made on.
  if (typeof body.systemVerdict !== "string" || !body.systemVerdict.trim()) {
    return NextResponse.json({ error: "systemVerdict is required" }, { status: 400 });
  }
  const note =
    typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 500) : null;

  try {
    const userEmail = await actingUserEmail();
    const state = await getAccountState(body.profile);
    if (!state) return NextResponse.json({ error: "account not found" }, { status: 404 });

    await recordHealthReview({
      profile: body.profile,
      systemVerdict: body.systemVerdict,
      humanVerdict: body.verdict,
      note,
      userEmail,
    });

    await auditLog({
      userEmail,
      action: "health_review",
      target: body.profile,
      oldValue: { system_verdict: body.systemVerdict },
      newValue: { human_verdict: body.verdict, note },
    });

    revalidateTag(ACCOUNTS_TAG, { expire: 0 });
    revalidateTag(accountDetailTag(body.profile), { expire: 0 });

    return NextResponse.json({ ok: true, profile: body.profile, verdict: body.verdict });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "review failed" },
      { status: 502 },
    );
  }
}

/**
 * GET /api/accounts/health-review?profile=Profile%208 — the review trail.
 *
 * Fetched when the review modal opens rather than shipped with every accounts
 * row: the table renders ~30 accounts and almost none of them are being
 * reviewed at any moment.
 */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const profile = new URL(request.url).searchParams.get("profile");
  if (!validProfile(profile)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }

  try {
    const rows = await sbRest<
      {
        human_verdict: string;
        system_verdict: string;
        reviewed_by: string;
        reviewed_at: string;
        note: string | null;
      }[]
    >(
      "account_health_reviews?select=human_verdict,system_verdict,reviewed_by,reviewed_at,note" +
        `&geelark_profile=eq.${encodeURIComponent(profile)}&order=reviewed_at.desc&limit=30`,
    );
    return NextResponse.json({
      history: rows.map((r) => ({
        verdict: r.human_verdict,
        systemVerdict: r.system_verdict,
        by: r.reviewed_by,
        at: r.reviewed_at,
        note: r.note,
      })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "history unavailable" },
      { status: 502 },
    );
  }
}
