import { NextResponse } from "next/server";
import { requireBearerToken } from "@/lib/api-token";
import { getSheetInventory } from "@/lib/data/sheet-inventory";

/**
 * GET /api/sheet-inventory — "Have" for the phone-farm production sheet.
 *
 * Called hourly by the Apps Script in scripts/sheets/inventory-sheet.gs, which
 * has no session, so this route is let past the sign-in gate in `proxy.ts` and
 * demands SHEET_INVENTORY_TOKEN instead. It answers counts and nothing else.
 */
export async function GET(request: Request) {
  const denied = requireBearerToken(
    request,
    process.env.SHEET_INVENTORY_TOKEN,
    "The production sheet's access is not set up on the dashboard.",
  );
  if (denied) return denied;
  try {
    return NextResponse.json({ updatedAt: new Date().toISOString(), lanes: await getSheetInventory() });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Something went wrong.", code: "upstream" },
      { status: 502 },
    );
  }
}
