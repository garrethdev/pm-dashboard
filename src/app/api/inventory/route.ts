import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { INVENTORY_RANGES, getDemandSupply } from "@/lib/data/inventory";

/** GET /api/inventory?range=14d&newAccounts=2&character=Character%203
 *  Powers the Demand vs supply window switcher and the new-account what-if
 *  without a full navigation. */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "14d";
  const match = INVENTORY_RANGES.find((r) => r.key === range);
  if (!match) return NextResponse.json({ error: "invalid range" }, { status: 400 });

  // The what-if is capped rather than trusted — an unbounded count would let a
  // query string drive an arbitrarily large generate_series in Postgres.
  const rawAccts = Number(url.searchParams.get("newAccounts") ?? 0);
  const newAccounts =
    Number.isFinite(rawAccts) ? Math.min(Math.max(Math.trunc(rawAccts), 0), 50) : 0;
  const character = url.searchParams.get("character");

  try {
    const { data, fetchedAt } = await getDemandSupply(
      match.days,
      newAccounts,
      newAccounts > 0 ? character : null,
    );
    return NextResponse.json({ data, fetchedAt });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 502 },
    );
  }
}
