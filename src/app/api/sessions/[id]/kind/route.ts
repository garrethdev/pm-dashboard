import { NextResponse } from "next/server";
import { requireReviewer } from "@/lib/api-auth";
import { parseRowId } from "@/lib/data/device-rules";
import { getSession, parseKind, setSessionKind } from "@/lib/data/phone-sessions";

/**
 * POST /api/sessions/[id]/kind — a reviewer says what the session was
 * (PF-26): { kind: "posting" | "manual_warmup" | "other" | null }. Null
 * clears the choice so Claude's next read may set it again. Reviewers only;
 * anyone else gets 404, the same as the page.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireReviewer();
  if (denied) return denied;
  const id = parseRowId((await params).id);
  if (id === null) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { kind?: unknown } | null;
  if (!body || !("kind" in body)) return NextResponse.json({ error: "Say what kind the session was." }, { status: 400 });
  const kind = body.kind === null ? null : parseKind(body.kind);
  if (body.kind !== null && kind === null) return NextResponse.json({ error: "Not a kind of session." }, { status: 400 });
  try {
    const session = await getSession(id);
    if (!session || session.status !== "stored") return NextResponse.json({ error: "not found" }, { status: 404 });
    await setSessionKind(id, kind);
    return NextResponse.json({ ok: true, kind });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "The kind could not be saved." }, { status: 502 });
  }
}
