import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getTodoBoard } from "@/lib/data/todo";

/**
 * GET /api/todo?day=N — one day's work on the real phones (PF-07).
 *
 * The page is handed today's board by the server on first paint; this is how
 * it fetches another day when you step to one, and how it re-reads after a
 * tick. `day` is a number of days from today, the same as the page's `?day=`.
 *
 * Never cached, for the reason every read in this corner of the app is not: a
 * shared list is written to while it is being looked at.
 */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const raw = new URL(request.url).searchParams.get("day");
  const parsed = Number(raw ?? 0);
  // A day far from today is a mistake or a fiddled URL, not a request: the
  // list only ever steps a day at a time.
  const day = Number.isFinite(parsed) ? Math.max(-365, Math.min(365, Math.trunc(parsed))) : 0;

  try {
    return NextResponse.json(await getTodoBoard(day));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "could not read the list" },
      { status: 502 },
    );
  }
}
