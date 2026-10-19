import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password"];

function matches(pathname: string, list: string[]) {
  return list.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/**
 * Runs before every page request. It only does two quick things:
 *  1. keeps the Supabase login cookie fresh,
 *  2. sends visitors who have no login cookie to /login (this is the "/login?reason=required" redirect).
 *
 * It deliberately makes NO call to Supabase Auth, so it adds almost no time to a page load.
 * Who the user is and what role they have is checked, with the database, in requireProfile()
 * (src/lib/auth.ts) on every page and Server Action, and finally by Row Level Security.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Reads the login cookie and refreshes it when it is about to expire. Normally no network call.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  const redirectTo = (target: string) => {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!session) {
    if (pathname === "/" || pathname.startsWith("/auth/") || matches(pathname, PUBLIC_PATHS)) {
      return response;
    }
    return redirectTo("/login?reason=required");
  }

  // Already logged in: skip the login / register screens.
  if (matches(pathname, PUBLIC_PATHS)) {
    return redirectTo("/");
  }

  return response;
}
