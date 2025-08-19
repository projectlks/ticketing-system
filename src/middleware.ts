// middleware.ts
import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

const SECRET = process.env.AUTH_SECRET;

// Define role access based on your navItems
const roleAccess: Record<string, string[]> = {
  "/main/dashboard": ["SUPER_ADMIN", "ADMIN", "AGENT", "REQUESTER"],
  "/main/department": ["SUPER_ADMIN", "ADMIN"],
  "/main/tickets": ["SUPER_ADMIN", "ADMIN", "AGENT", "REQUESTER"],
  "/main/reports": ["SUPER_ADMIN", "ADMIN"],
  "/main/accounts": ["SUPER_ADMIN", "ADMIN"],
  "/main/category": ["SUPER_ADMIN", "ADMIN"],
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Get token from next-auth
  const token = await getToken({ req, secret: SECRET });

  // If user is not logged in, redirect to login
  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  // Check access roles for the pathname
  for (const route in roleAccess) {
    if (pathname.startsWith(route)) {
      const allowedRoles = roleAccess[route];
      if (!allowedRoles.includes(token.role)) {
        // Redirect to unauthorized page or dashboard
        return NextResponse.redirect(new URL("/main/dashboard", req.url));
      }
      break;
    }
  }

  // Allow request to continue
  return NextResponse.next();
}

// Match all /main/* routes
export const config = {
  matcher: ["/main/:path*"],
};
