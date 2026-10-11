import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Public paths allowed without authentication
  const isPublicPath =
    path === "/" ||
    path === "/login" ||
    path.startsWith("/_next") ||
    path.startsWith("/api/public") ||
    path.includes("favicon.ico");

  if (!user) {
    if (!isPublicPath) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", path);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  // Fetch user role and must_change_password flag from public.profiles
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, must_change_password, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    // Inactive or invalid user account
    await supabase.auth.signOut();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "Your account is disabled or unprovisioned.");
    return NextResponse.redirect(loginUrl);
  }

  // If user must change password, force redirect to /change-password
  if (profile.must_change_password && path !== "/change-password" && !path.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/change-password", request.url));
  }

  // If user already changed password and visits /change-password, redirect to role dashboard
  if (!profile.must_change_password && path === "/change-password") {
    return NextResponse.redirect(new URL(`/${profile.role}`, request.url));
  }

  // If logged-in user visits /login, redirect to their role home
  if (path === "/login") {
    return NextResponse.redirect(new URL(`/${profile.role}`, request.url));
  }

  // Enforce Role-Based Path Isolation
  if (path.startsWith("/admin") && profile.role !== "admin") {
    return NextResponse.redirect(new URL(`/${profile.role}`, request.url));
  }
  if (path.startsWith("/judge") && profile.role !== "judge") {
    return NextResponse.redirect(new URL(`/${profile.role}`, request.url));
  }
  if (path.startsWith("/team") && profile.role !== "team") {
    return NextResponse.redirect(new URL(`/${profile.role}`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
