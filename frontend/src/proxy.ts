import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get("investiq_session")?.value;

  if (pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  if (pathname === "/sign-up") {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  const isAuthPage = pathname.startsWith("/signin") || pathname.startsWith("/signup");
  const isPublicApi = pathname.startsWith("/api/auth") || pathname.startsWith("/api/market");
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public");

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // If unauthenticated and trying to access an app page or protected API
  if (!sessionCookie) {
    if (isAuthPage || isPublicApi) {
      return NextResponse.next();
    }

    // For any API request, return 401 JSON instead of HTML redirect
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Unauthenticated", authenticated: false },
        { status: 401 }
      );
    }

    // Redirect unauthenticated page requests directly to sign in
    const signInUrl = new URL("/signin", request.url);
    if (pathname !== "/") {
      signInUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(signInUrl);
  }

  // If already authenticated and visiting signin or signup, redirect to dashboard
  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const middleware = proxy;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
