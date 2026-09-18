import { getPhysicalProfiles, limitProxyData } from "@/lib/data/fleet-accounts";
import { getFleet } from "@/lib/fleet-server";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getProxyPhoneData } from "@/lib/data/proxies";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  try {
    return NextResponse.json(
      limitProxyData(
        await getProxyPhoneData(),
        await getFleet(),
        new Set((await getPhysicalProfiles()).data),
      ),
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "proxy data unavailable" },
      { status: 502 },
    );
  }
}
