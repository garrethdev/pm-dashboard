import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authBypassed, isEmailAllowed } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/auth/confirm"];

/**
 * Auth gate (Next 16 "proxy", formerly middleware): refreshes the Supabase
 * session cookie and redirects unauthenticated / non-allowlisted visitors to
 * /login. API routes re-check the session themselves — this is the outer door.
 */
export async function proxy(request: NextRequest) {
  if (authBypassed()) {
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
