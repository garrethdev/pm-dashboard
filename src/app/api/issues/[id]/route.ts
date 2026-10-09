import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { isIssueStatus } from "@/lib/data/issue-rules";
import { setIssueStatus } from "@/lib/data/issues";
import { actingUserEmail, auditLog } from "@/lib/data/writes";

/** PATCH /api/issues/:id — `{ status: "open" | "in_progress" | "fixed" }`, from the Issues page. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id: raw } = await params;
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "No such issue." }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  if (!isIssueStatus(body?.status)) {
    return NextResponse.json({ error: "Choose Open, In progress or Fixed." }, { status: 400 });
  }

  try {
    const userEmail = await actingUserEmail();
    const old = await setIssueStatus(id, body.status);
    if (old === null) return NextResponse.json({ error: "No such issue." }, { status: 404 });
    await auditLog({
      userEmail,
      action: "issue_status",
      target: `issue ${id}`,
      oldValue: { status: old },
      newValue: { status: body.status },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The status did not save" },
      { status: 502 },
    );
  }
}
