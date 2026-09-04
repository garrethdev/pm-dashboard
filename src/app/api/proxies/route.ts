import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getProxyPhoneData } from "@/lib/data/proxies";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  try {
    return NextResponse.json(await getProxyPhoneData());
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "proxy data unavailable" },
      { status: 502 },
    );
  }
}
