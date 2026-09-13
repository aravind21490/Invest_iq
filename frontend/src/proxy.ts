import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get("investiq_session")?.value;

  // 1. Normalize aliases /sign-in and /sign-up
  if (pathname === "/sign-in") {
    return NextResponse.redirect(new URL("/signin", request.url));
  }
  if (pathname === "/sign-up") {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  // 2. Allow public static assets and system files
  const isPublicAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".ico");

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // 3. Allow public auth APIs and agent bridge APIs (which enforce their own auth)
  const isExcludedApi =
    pathname.startsWith("/api/auth/") || pathname.startsWith("/api/agents/");
  if (isExcludedApi) {
    return NextResponse.next();
  }

  // 4. Auth pages (/signin, /signup)
  const isAuthPage = pathname === "/signin" || pathname === "/signup";

  // If already authenticated and trying to access signin/signup, redirect to dashboard or redirect parameter
  if (sessionCookie && isAuthPage) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const destination = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // If visiting an auth page without a session, permit access
  if (isAuthPage) {
    return NextResponse.next();
  }

  // 5. Protected API routes: return 401 JSON if not authenticated
  if (pathname.startsWith("/api/")) {
    if (!sessionCookie) {
      return NextResponse.json(
        {
          success: false,
          error: "Permission denied. Authentication is mandatory to access the Invest IQ Portal.",
        },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // 6. ALL OTHER PORTAL ROUTES: Mandatory authentication gate
  // If not authenticated, deny permission and redirect to /signin with redirect parameter
  if (!sessionCookie) {
    const redirectUrl = new URL("/signin", request.url);
    const destination = pathname + (search || "");
    if (destination && destination !== "/") {
      redirectUrl.searchParams.set("redirect", destination);
    }
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const proxy = middleware;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
