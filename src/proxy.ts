import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authBypassed, isEmailAllowed } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/auth/confirm"];

/**
 * The warmup script on the Air (PF-13) is not a person and has no session, so
 * its routes skip the sign-in check here and demand their own token instead
 * (`requireRunnerToken` in src/lib/warmup-runner-api.ts, which every route
 * under this prefix calls first). Same string as RUNNER_API_PREFIX there; not
 * imported, to keep this file free of server-only modules.
 */
const RUNNER_API_PREFIX = "/api/warmup-runner/";

/**
 * Scheduled jobs (the daily copy of reference pictures) are not a person
 * either. Their routes demand CRON_SECRET (`requireSchedulerToken` in
 * src/server/carousel/machine.ts). Same string as MAINTENANCE_PREFIX there.
 */
const MAINTENANCE_PREFIX = "/api/carousel-generator/maintenance/";

/**
 * The phone-farm production sheet's hourly Apps Script. It demands
 * SHEET_INVENTORY_TOKEN (src/app/api/sheet-inventory/route.ts).
 */
const SHEET_INVENTORY_PATH = "/api/sheet-inventory";

/**
 * The Facebook analytics robot (PF-24). It demands CRON_SECRET, like the
 * maintenance jobs (src/app/api/facebook-analytics/ingest/route.ts).
 */
const FACEBOOK_INGEST_PATH = "/api/facebook-analytics/ingest";

/**
 * Content tagging (DA-03). It demands CRON_SECRET, like the maintenance jobs
 * (src/app/api/content-tags/run/route.ts).
 */
const CONTENT_TAGS_PATH = "/api/content-tags/run";

/**
 * The analytics-screen reader (DA-06/DA-08), called by the phone robot after
 * it uploads a post's screenshots. It demands CRON_SECRET
 * (src/app/api/screen-readings/run/route.ts).
 */
const SCREEN_READINGS_PATH = "/api/screen-readings/run";

/**
 * Re-links the robot's readings to posts fetched after they were read
 * (DA-06), daily. It demands CRON_SECRET (src/app/api/screen-readings/relink/route.ts).
 */
const SCREEN_READINGS_RELINK_PATH = "/api/screen-readings/relink";

/**
 * The monthly refresh of Creators to follow, on the 1st. It demands CRON_SECRET
 * (src/app/api/follow-creators/refresh/route.ts). Only this path: the rest of
 * /api/follow-creators/ is the page's own and needs a sign-in.
 */
const FOLLOW_CREATORS_REFRESH_PATH = "/api/follow-creators/refresh";

/**
 * The weekly music list refresh, Tuesdays. It demands CRON_SECRET
 * (src/app/api/music-library/refresh/route.ts).
 */
const MUSIC_LIBRARY_REFRESH_PATH = "/api/music-library/refresh";

/**
 * The daily run of the automatic account rules (zero views, robot failing).
 * It demands CRON_SECRET (src/app/api/accounts/auto-holds/run/route.ts).
 */
const AUTO_HOLDS_RUN_PATH = "/api/accounts/auto-holds/run";

/**
 * The weekly Instagram audience pull, Fridays. It demands CRON_SECRET
 * (src/app/api/audience-readings/instagram/route.ts).
 */
const AUDIENCE_INSTAGRAM_PATH = "/api/audience-readings/instagram";

/**
 * The read-only MCP server Claude connects to (Garreth, 2026-11-26). Claude is
 * not a browser and has no cookie, so the route demands a personal token
 * instead (`authenticateMcp` in src/server/mcp/auth.ts). Exactly this path.
 */
const MCP_PATH = "/api/mcp";

/**
 * Auth gate (Next 16 "proxy", formerly middleware): refreshes the Supabase
 * session cookie and redirects unauthenticated / non-allowlisted visitors to
 * /login. API routes re-check the session themselves — this is the outer door.
 */
export async function proxy(request: NextRequest) {
  const p = request.nextUrl.pathname;
  if (authBypassed() || p.startsWith(RUNNER_API_PREFIX) || p.startsWith(MAINTENANCE_PREFIX) || p === SHEET_INVENTORY_PATH || p === FACEBOOK_INGEST_PATH || p === CONTENT_TAGS_PATH || p === SCREEN_READINGS_PATH || p === SCREEN_READINGS_RELINK_PATH || p === FOLLOW_CREATORS_REFRESH_PATH || p === MUSIC_LIBRARY_REFRESH_PATH || p === AUTO_HOLDS_RUN_PATH || p === AUDIENCE_INSTAGRAM_PATH || p === MCP_PATH) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!isPublic && (!user || !isEmailAllowed(user.email))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = user ? "?error=not-allowed" : "";
    return NextResponse.redirect(url);
  }

  if (isPublic && user && isEmailAllowed(user.email) && path.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Everything except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
