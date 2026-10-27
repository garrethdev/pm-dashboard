import { NextResponse } from "next/server";
import { requireSession } from "@/lib/api-auth";
import { getReportPostOptions } from "@/lib/data/reports";
import { validProfile } from "@/lib/data/writes";

/**
 * GET /api/reports/posts?profile=Profile%2021 — one account's newest posts, for
 * the report form's post picker (Garreth, Czedrick and Yurie,
 * 2026-10-27). Asked for once an account is added to the report.
 */
export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;
  const profile = new URL(request.url).searchParams.get("profile");
  if (!validProfile(profile)) return NextResponse.json({ error: "No such account." }, { status: 400 });
  try {
    return NextResponse.json({ posts: await getReportPostOptions(profile) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The posts did not load" },
      { status: 502 },
    );
  }
}
