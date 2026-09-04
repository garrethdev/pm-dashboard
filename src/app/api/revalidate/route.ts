import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireSession } from "@/lib/api-auth";
import { DATA_TAGS, accountDetailTag, forensicsTag } from "@/lib/data/cache";

/**
 * POST /api/revalidate — expire every upstream cache entry so the next render
 * re-queries Supabase and n8n.
 *
 * router.refresh() alone re-renders but still reads the same unstable_cache
 * entry, so the Refresh button appeared to do nothing for up to 60s after
 * content landed in Supabase. This makes it an actual re-query.
 */
export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  // The account detail cache is keyed per profile, so it can only be expired
  // when we know which page asked. The path is parsed rather than trusted as a
  // tag, so a caller cannot expire arbitrary keys.
  let path = "";
  try {
    ({ path = "" } = (await request.json()) as { path?: string });
  } catch {
    /* no body — just expire the static set */
  }

  // Matches /accounts/45 and /accounts/45/forensics — both are per-profile
  // caches that the static DATA_TAGS set cannot reach.
  const tags: string[] = [...DATA_TAGS];
  const profile = /^\/accounts\/(\d{1,6})(?:\/forensics)?\/?$/.exec(path)?.[1];
  if (profile) {
    tags.push(accountDetailTag(`Profile ${profile}`), forensicsTag(`Profile ${profile}`));
  }

  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  return NextResponse.json({ ok: true, expired: tags.length });
}
