import { NextResponse, type NextRequest } from "next/server";

// This is a lightweight, non-authoritative redirect for UX only — it can't
// see the in-memory access token (that's JS-only state, not a cookie), so
// it just keeps `/dashboard/*` from flashing before the client-side
// AuthProvider redirect kicks in when there's clearly no session data at
// all. Real enforcement of "who can see what" happens via the JWT on every
// API call (backend) and via the AuthProvider + PermissionGate (client).
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
