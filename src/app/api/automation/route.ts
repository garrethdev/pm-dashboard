import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getAutomationStatuses } from "@/lib/data/automation";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  try {
    return NextResponse.json(await getAutomationStatuses());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "automation data unavailable" },
      { status: 502 },
    );
  }
}
