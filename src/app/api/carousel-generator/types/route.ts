import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { readCarouselTypes } from "@/server/carousel/types/catalog";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;
  try {
    return NextResponse.json({ types: await readCarouselTypes() }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    // Never expose connection strings or provider errors to the browser.
    return NextResponse.json({ error: "Carousel types could not be loaded. Please retry." }, { status: 502 });
  }
}
