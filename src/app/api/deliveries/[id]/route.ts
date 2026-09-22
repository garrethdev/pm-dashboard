import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { parseRowId } from "@/lib/data/device-rules";
import { actingUserEmail, auditLog } from "@/lib/data/writes";
import {
  DeliveryWriteError,
  getDelivery,
  markDelivery,
  setDeliveryUrl,
  type DeliveryStatus,
} from "@/lib/data/post-deliveries";

/**
 * POST /api/deliveries/:id — what happened to a post handed out by hand
 * (PF-07). The four things the sheet can do to an item:
 *
 *  - `posted` — it went up. The link is OPTIONAL (decision 7, Garreth
 *    2026-09-19): saving without one leaves the item showing as posted and
 *    still owing its link, which is what attribution actually needs.
 *  - `link` — pasting that link afterwards.
 *  - `failed` — it could not be posted. That is the END of the post
 *    (Garreth, 2026-09-22): marked failed and never handed out again.
 *  - `undo` — a wrong tap, put back on the list. Not available for `failed`,
 *    because a dumped post is not something the app un-dumps.
 *
 * TWO OF PF-07's SIX STATES LIVE HERE, and they are the reason this route
 * takes `expect` — what the screen believed the item was when the sheet was
 * opened:
 *
 *  - STATE 5, somebody else finished it while your sheet was open. Two people
 *    on one shared list is the ordinary case. If the row has moved on since
 *    the sheet opened, the write is REFUSED with what actually happened,
 *    rather than quietly overwriting their answer with yours.
 *  - STATE 3's second half, "Try again must not double-save if the first
 *    attempt actually landed." A retry that asks for exactly what the row
 *    already says is answered ok rather than as a conflict — the timeout was
 *    in the reply, not the write.
 */

type Action = "posted" | "failed" | "link" | "undo";

/** The item statuses the screen knows, mapped to what the row actually holds.
 *  `postedNoLink` is not a fifth status: it is `posted` with no link yet. */
function expectedRowStatus(seen: string): DeliveryStatus | null {
  if (seen === "todo") return "queued";
  if (seen === "posted" || seen === "postedNoLink") return "posted";
  if (seen === "failed") return "failed";
  if (seen === "skipped") return "skipped";
  return null;
}

/** What a row that has moved on says, in words for the sheet. */
function movedOn(status: DeliveryStatus, hasUrl: boolean): string {
  if (status === "posted") {
    return hasUrl
      ? "Somebody else already marked this posted, with its link."
      : "Somebody else already marked this posted.";
  }
  if (status === "failed") return "Somebody else already marked this failed.";
  if (status === "skipped") return "Somebody else already skipped this.";
  return "Somebody else has put this back on the list.";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseRowId(rawId);
  if (id === null) return NextResponse.json({ error: "invalid id" }, { status: 400 });

  let body: { action?: unknown; postUrl?: unknown; note?: unknown; expect?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const action = body.action as Action;
  if (!["posted", "failed", "link", "undo"].includes(action)) {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
  const postUrl = typeof body.postUrl === "string" ? body.postUrl.trim() : null;
  const note = typeof body.note === "string" ? body.note.trim() : null;

  try {
    const row = await getDelivery(id);
    if (!row) {
      return NextResponse.json({ error: "That post is no longer on the list." }, { status: 404 });
    }

    // The retry that already landed (state 3). Answering ok here is what stops
    // Try again from writing a second time over a save that actually worked.
    const alreadyThere =
      (action === "posted" && row.status === "posted" && (postUrl ?? "") === (row.postUrl ?? "")) ||
      (action === "failed" && row.status === "failed") ||
      (action === "link" && row.postUrl === postUrl) ||
      (action === "undo" && row.status === "queued");
    if (alreadyThere) {
      return NextResponse.json({ ok: true, delivery: row, alreadyThere: true });
    }

    // Somebody else got there first (state 5).
    const expected = typeof body.expect === "string" ? expectedRowStatus(body.expect) : null;
    if (expected && row.status !== expected) {
      return NextResponse.json(
        { error: movedOn(row.status, Boolean(row.postUrl)), conflict: true, delivery: row },
        { status: 409 },
      );
    }

    const userEmail = await actingUserEmail();
    let delivery = row;

    if (action === "link") {
      if (!postUrl) return NextResponse.json({ error: "no link given" }, { status: 400 });
      delivery = await setDeliveryUrl(id, postUrl);
    } else if (action === "undo") {
      // A dumped post stays dumped (Garreth, 2026-09-22).
      if (row.status === "failed") {
        return NextResponse.json(
          { error: "A failed post is finished with; it cannot be put back." },
          { status: 409 },
        );
      }
      delivery = await markDelivery(id, { status: "queued", postUrl: null, note: null });
    } else {
      delivery = await markDelivery(id, {
        status: action === "posted" ? "posted" : "failed",
        postUrl: action === "posted" ? postUrl : null,
        note,
        doneBy: userEmail,
      });
    }

    await auditLog({
      userEmail,
      action: `delivery_${action}`,
      target: String(id),
      oldValue: { status: row.status, post_url: row.postUrl },
      newValue: { status: delivery.status, post_url: delivery.postUrl },
    });

    return NextResponse.json({ ok: true, delivery });
  } catch (err) {
    if (err instanceof DeliveryWriteError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "saving failed" },
      { status: 502 },
    );
  }
}
