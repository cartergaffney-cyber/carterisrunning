import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/", "/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api/cron/* authenticates via a CRON_SECRET bearer header, not a user
  // session -- it's invoked by an external scheduler with no cookie at all,
  // so it must bypass the session gate here and rely on its own check.
  const isPublicPath =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/cron/");

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const hasValidSession = !!token && (await verifySessionToken(token));

  if (!hasValidSession && !isPublicPath) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    if (token) response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (hasValidSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
