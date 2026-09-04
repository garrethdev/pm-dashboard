import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getNotifications } from "@/lib/data/notifications";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    const items = await getNotifications();
    return NextResponse.json({ items, count: items.length });
  } catch (err) {
    return NextResponse.json(
      { items: [], count: 0, error: err instanceof Error ? err.message : "unavailable" },
      { status: 200 },
    );
  }
}
