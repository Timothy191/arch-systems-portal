import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Next.js edge middleware — basic routing
 * TODO: Implement session refresh, role gating, and department resolution
 */
export async function middleware(request: NextRequest) {
  // Basic middleware implementation
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
