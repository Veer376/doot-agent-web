import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Paths that don't require authentication (exact match)
const NO_AUTH_EXACT_PATHS = [
  "/", // Allow unauthenticated access to homepage only
];

// Paths that don't require authentication (prefix match)
const NO_AUTH_PREFIX_PATHS = [
  "/debug-auth",
  "/api/auth",
  "/reset-password", // Needs token from email link
];

// Helper to check if a path is allowed without auth
function isPublicPath(pathname: string): boolean {
  // Check exact matches first
  if (NO_AUTH_EXACT_PATHS.includes(pathname)) {
    return true;
  }
  // Check prefix matches
  return NO_AUTH_PREFIX_PATHS.some((path) => pathname.startsWith(path));
}

export async function updateSession(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_LOCAL_MODE === "true") {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase URL or Anon Key");
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options?: Record<string, unknown> }) =>
          supabaseResponse.cookies.set(name, value, options as any),
        );
      },
    },
  });

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    // Check if this is an API request
    if (pathname.startsWith("/api/")) {
      // Return a JSON response with 401 Unauthorized status for API requests
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    // For non-API requests, redirect to homepage with auth dialog
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("auth", "signin");
    return NextResponse.redirect(url);
  }

  // Redirect users from the /inbox page to the homepage
  if (request.nextUrl.pathname.startsWith("/inbox")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
