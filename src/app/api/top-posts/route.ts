import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getTopPosts, type TopPlatform, type TopRange } from "@/lib/data/top-posts";

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const raw = params.get("range");
  const range: TopRange = raw === "all" || raw === "month" ? raw : "week";
  const rawPlatform = params.get("platform");
  const platform: TopPlatform =
    rawPlatform === "tiktok" || rawPlatform === "instagram" ? rawPlatform : "all";
  try {
    const posts = await getTopPosts(range, platform);
    return NextResponse.json({ range, platform, posts });
  } catch (err) {
    return NextResponse.json(
      { range, platform, posts: [], error: err instanceof Error ? err.message : "unavailable" },
      { status: 200 },
    );
  }
}
