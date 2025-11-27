import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const redirectTo = requestUrl.searchParams.get("redirect") || "/";

    if (code) {
      const cookieStore = await cookies();

      // Create server-side Supabase client with cookie access
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: any) {
              cookieStore.set({ name, value, ...options });
            },
            remove(name: string, options: any) {
              cookieStore.set({ name, value: "", ...options });
            },
          },
        }
      );

      // Exchange the code for a session (PKCE code verifier is in cookies)
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error("Error exchanging code for session:", error);
        throw error;
      }

      // Successfully authenticated - redirect to destination
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // No code parameter - redirect to sign-in
    const signinUrl = new URL("/signin", request.url);
    signinUrl.searchParams.set("from_oauth", "true");
    return NextResponse.redirect(signinUrl);
  } catch (error) {
    console.error("Auth callback error:", error);

    // In case of error, redirect to sign-in with error message
    const errorUrl = new URL("/signin", request.url);
    errorUrl.searchParams.set(
      "error",
      "Authentication failed. Please try again.",
    );

    return NextResponse.redirect(errorUrl);
  }
}
