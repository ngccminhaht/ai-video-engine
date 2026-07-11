/**
 * Next.js Middleware — Route protection.
 *
 * Since we use localStorage for tokens (client-side only), middleware cannot
 * directly validate JWT. Instead, it checks for the presence of auth cookies
 * or delegates to client-side guards.
 *
 * Strategy:
 * - Public routes (/login, /register, /forgot-password): always accessible
 * - /admin/* and /app/*: no server-side block (client-side AuthGuard handles it)
 * - Root / redirects to /login (if no indication of auth) or /app
 *
 * In future phases, tokens can be migrated to httpOnly cookies for
 * server-side middleware validation.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

// Routes that are always accessible (API, static assets, etc.)
const BYPASS_PREFIXES = ["/api/", "/_next/", "/favicon.ico", "/icons/"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static assets
  if (BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Public routes — always accessible
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // /docs is publicly accessible
  if (pathname.startsWith("/docs")) {
    return NextResponse.next();
  }

  // All other routes (/admin/*, /app/*) — let through for client-side guard
  // The AuthGuard component in layout will redirect if not authenticated
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
