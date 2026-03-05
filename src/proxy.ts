import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
const SIGN_IN_ROUTE = "/auth/signin";
const HELPDESK_ROUTE_PREFIX = "/helpdesk";

const ADMIN_ONLY_ROUTES = [
  "/helpdesk/department",
  "/helpdesk/category",
  "/helpdesk/user",
] as const;

const PRIVILEGED_ROLES = new Set(["LEVEL_3", "SUPER_ADMIN"]);

function isAdminOnlyRoute(pathname: string) {
  return ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

function isSafeInternalCallback(callbackPath: string) {
  return callbackPath.startsWith("/") && !callbackPath.startsWith("//");
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const token = await getToken({ req, secret: AUTH_SECRET });
  const isAuthenticated = Boolean(token?.id);

  // Helpdesk pages ကို guest user မဝင်နိုင်အောင် signin redirect + callbackUrl save လုပ်ထားသည်။
  if (pathname.startsWith(HELPDESK_ROUTE_PREFIX) && !isAuthenticated) {
    const signInUrl = new URL(SIGN_IN_ROUTE, req.url);
    const callbackPath = `${pathname}${search}`;

    if (isSafeInternalCallback(callbackPath)) {
      signInUrl.searchParams.set("callbackUrl", callbackPath);
    }

    return NextResponse.redirect(signInUrl);
  }

  // Authenticated user သည် sign-in page ကိုပြန်မဝင်စေဘဲ dashboard သို့တိုက်ရိုက်ပို့သည်။
  if (pathname === SIGN_IN_ROUTE && isAuthenticated) {
    return NextResponse.redirect(new URL(HELPDESK_ROUTE_PREFIX, req.url));
  }

  // Configuration routes တွေကို LEVEL_3 / SUPER_ADMIN သာဝင်ခွင့်ပေးသည်။
  if (pathname.startsWith(HELPDESK_ROUTE_PREFIX) && isAdminOnlyRoute(pathname)) {
    const role = String(token?.role ?? "");
    const canAccess = PRIVILEGED_ROLES.has(role);

    if (!canAccess) {
      return NextResponse.redirect(new URL(HELPDESK_ROUTE_PREFIX, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/helpdesk/:path*", "/auth/signin"],
};
