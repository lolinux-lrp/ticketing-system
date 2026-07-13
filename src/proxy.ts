import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(req: NextRequest) {
  // 1. Token Check Method: Uses NextAuth's getToken which reads the JWT cookie
  const token = await getToken({ req });
  
  if (!token) {
    const isApiRoute = req.nextUrl.pathname.startsWith('/api/');
    
    // 2. Response Logic: Differentiate between API requests and Page requests
    if (isApiRoute) {
      // API routes should fail with a strict 401 JSON response
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    } else {
      // Page routes should redirect to login and preserve the intended destination
      const signInUrl = new URL('/login', req.url);
      signInUrl.searchParams.set('callbackUrl', req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

// 3. Matcher Config: We use a positive matcher to protect ONLY specific directories.
// This is much safer than a negative lookahead, as it naturally allows the public 
// landing page (`/`), `login`, `signup`, `set-password`, and static assets to pass through.
export const config = {
  matcher: [
    // --- Protected App Pages ---
    "/dashboard/:path*",
    "/tickets/:path*",
    "/account/:path*",
    "/schedule/:path*",
    "/admin/:path*",
    
    // --- Protected API Routes ---
    "/api/tickets/:path*",
    "/api/comments/:path*",
    "/api/meetings/:path*",
    "/api/users/agents",
    "/api/users/change-password",
    "/api/users/invite" 
  ],
};
