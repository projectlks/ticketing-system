import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

const SECRET = process.env.AUTH_SECRET;

// Role-based access configuration
const roleAccess: Record<string, string[]> = {
  "/main/dashboard": ["SUPER_ADMIN", "ADMIN", "AGENT", "REQUESTER"],
  "/main/department": ["SUPER_ADMIN", "ADMIN"],
  "/main/tickets": ["SUPER_ADMIN", "ADMIN", "AGENT", "REQUESTER"],
  "/main/reports": ["SUPER_ADMIN", "ADMIN"],
  "/main/accounts": ["SUPER_ADMIN", "ADMIN"],
  "/main/category": ["SUPER_ADMIN", "ADMIN"],
  "/main/mail-setting": ["SUPER_ADMIN"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get token from next-auth
  const token = await getToken({ req, secret: SECRET });

  // Redirect unauthenticated users to sign in
  // Redirect unauthenticated users to /auth/signin
  if (!token) {
    return NextResponse.redirect(new URL(`/auth/signin`, req.url));
  }

  // Remove /lang/{locale} prefix from pathname
  const cleanedPath = removeLocaleFromPath(pathname);

  for (const route in roleAccess) {
    if (cleanedPath.startsWith(route)) {
      const allowedRoles = roleAccess[route];
      if (!allowedRoles.includes(token.role)) {
        return NextResponse.redirect(
          new URL(`/${getLocale(pathname)}/main/dashboard`, req.url)
        );
      }
      break;
    }
  }

  return NextResponse.next();
}

// Extract locale from path like /lang/en/main/dashboard
function getLocale(pathname: string): string {
  const segments = pathname.split("/");
  return segments[2] || "en"; // ['', 'lang', 'en', 'main', 'dashboard']
}

// Remove /lang/{locale} prefix from pathname
function removeLocaleFromPath(pathname: string): string {
  const segments = pathname.split("/");
  return "/" + segments.slice(3).join("/"); // removes ['', 'lang', 'en', 'main', 'dashboard'] => '/main/dashboard'
}

// Match all locale-based /lang/*/main/* routes
export const config = {
  matcher: ["/lang/(en|mm|ru)/main/:path*"],
};
