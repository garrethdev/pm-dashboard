import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { WarmupWriteError, logSession } from "@/lib/data/warmup-sessions";

/**
 * POST /api/warmups — record a warmup session done by hand (PF-04).
 *
 * The form itself is design ticket P3: minutes on a stepper that starts at the
 * session's target, and an optional note. `sessionNo` is left out by the
 * screens that do not ask for one — a warmup logged from a phone's page is
 * simply a warmup that happened, and it lands on the first of the day's two
 * sessions that is not finished yet.
 *
 * The warmup script on the Air (PF-13) will write its own rows with
 * `mode: "script"`; this route is the by-hand path only, so it refuses to
 * claim the script did something a person did.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let body: {
    accountId?: unknown;
    deviceId?: unknown;
    minutes?: unknown;
    sessionNo?: unknown;
    note?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (typeof body.accountId !== "number" || !Number.isFinite(body.accountId)) {
    return NextResponse.json({ error: "invalid account" }, { status: 400 });
  }
  if (typeof body.minutes !== "number" || !Number.isInteger(body.minutes)) {
    return NextResponse.json({ error: "minutes must be a whole number" }, { status: 400 });
  }
  if (
    body.sessionNo !== undefined &&
    body.sessionNo !== null &&
    body.sessionNo !== 1 &&
    body.sessionNo !== 2
  ) {
    return NextResponse.json({ error: "session must be 1 or 2" }, { status: 400 });
  }
  if (body.deviceId !== undefined && body.deviceId !== null && typeof body.deviceId !== "number") {
    return NextResponse.json({ error: "invalid phone" }, { status: 400 });
  }
  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
    return NextResponse.json({ error: "invalid note" }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const session = await logSession({
      accountId: body.accountId,
      deviceId: (body.deviceId as number | null | undefined) ?? null,
      minutes: body.minutes,
      sessionNo: (body.sessionNo as number | undefined) ?? undefined,
      mode: "manual",
      note: ((body.note as string | null | undefined) ?? "").trim() || null,
      loggedBy: userEmail,
    });

    await auditLog({
      userEmail,
      action: "warmup_logged",
      target: String(body.accountId),
      newValue: {
        minutes: session.minutes,
        session_no: session.sessionNo,
        device_id: session.deviceId,
      },
    });

    return NextResponse.json({ ok: true, session });
  } catch (err) {
    if (err instanceof WarmupWriteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "saving failed" },
      { status: 502 },
    );
  }
}
