import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getNotifications, markNotificationsRead } from "@/lib/data/notifications";
import { actingUserEmail } from "@/lib/data/writes";

/**
 * GET  → the bell feed for the signed-in person, each item flagged read/unread.
 * POST → mark ids read for that person.
 *
 * Read state is per person and server-side: it used to live in localStorage,
 * which is keyed by scheme+host+port, so opening the Network URL instead of
 * localhost — or a port fallback, or a second machine — resurfaced everything
 * already seen. See the notification_reads migration.
 */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    // No fleet here on purpose (PF-20, Garreth 2026-09-22): the bell is the
    // one surface that shows both fleets, so it does not read the switch. Each
    // item names the fleet it came from instead.
    const items = await getNotifications(await actingUserEmail());
    return NextResponse.json({
      items,
      count: items.length,
      unread: items.filter((i) => !i.read).length,
    });
  } catch (err) {
    // A dead bell must not take the topbar with it.
    return NextResponse.json(
      {
        items: [],
        count: 0,
        unread: 0,
        error: err instanceof Error ? err.message : "unavailable",
      },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  let ids: unknown;
  try {
    ({ ids } = (await request.json()) as { ids?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  if (!Array.isArray(ids)) {
    return NextResponse.json({ error: "ids must be an array" }, { status: 400 });
  }

  try {
    const marked = await markNotificationsRead(
      await actingUserEmail(),
      ids.filter((i): i is string => typeof i === "string"),
    );
    return NextResponse.json({ ok: true, marked });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "could not save" },
      { status: 502 },
    );
  }
}
