import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { parseRowId } from "@/lib/data/device-rules";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { RetireError, setStepDone } from "@/lib/data/ban-cleanups";

/**
 * POST /api/ban-steps/:id { done } — tick one step of the clean-up after a
 * ban on a real phone, or untick it after a wrong tap (PF-11, design P8).
 *
 * Ticked straight from the list, with no sheet: a step has nothing to record
 * beyond the fact that it was done.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseRowId(rawId);
  if (id === null) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  let body: { done?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (typeof body.done !== "boolean") {
    return NextResponse.json({ error: "done must be true or false" }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const changed = await setStepDone(id, body.done, userEmail);
    // Only a tick that changed something is written down; a second press on
    // an already-ticked step is not an action.
    if (changed)
      await auditLog({
        userEmail,
        action: body.done ? "ban_step_done" : "ban_step_undone",
        target: `ban_cleanup_steps:${id}`,
      });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RetireError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "could not save the tick" },
      { status: 502 },
    );
  }
}
