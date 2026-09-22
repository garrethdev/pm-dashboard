import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { parseRowId } from "@/lib/data/device-rules";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import { deleteSession } from "@/lib/data/warmup-sessions";

/**
 * DELETE /api/warmups/:id — take back a warmup logged by mistake (P3's
 * hold-to-undo).
 *
 * It deletes rather than marking the row void: a warmup logged in error did
 * not happen, and there is nothing about it worth keeping on the row. What was
 * taken back is in `dashboard_audit_log`, which is where the record belongs.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseRowId(rawId);
  if (id === null) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  try {
    const userEmail = await actingUserEmail();
    await deleteSession(id);
    await auditLog({
      userEmail,
      action: "warmup_undone",
      target: String(id),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "undo failed" },
      { status: 502 },
    );
  }
}
