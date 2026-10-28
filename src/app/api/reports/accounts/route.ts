import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getReportAccountOptions } from "@/lib/data/reports";

/**
 * GET /api/reports/accounts — the accounts the report form can name
 * (Garreth, Czedrick and Yurie, 2026-10-27). Asked for when the form
 * opens, not with every page, since most pages never open it.
 */
export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    return NextResponse.json({ accounts: await getReportAccountOptions() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The accounts did not load" },
      { status: 502 },
    );
  }
}
