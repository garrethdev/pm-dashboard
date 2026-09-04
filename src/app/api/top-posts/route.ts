import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getTopPosts, type TopRange } from "@/lib/data/top-posts";

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const raw = new URL(request.url).searchParams.get("range");
  const range: TopRange = raw === "all" || raw === "month" ? raw : "week";
  try {
    const posts = await getTopPosts(range);
    return NextResponse.json({ range, posts });
  } catch (err) {
    return NextResponse.json(
      { range, posts: [], error: err instanceof Error ? err.message : "unavailable" },
      { status: 200 },
    );
  }
}
