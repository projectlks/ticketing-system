// import { getToken } from "next-auth/jwt";
// import { NextRequest, NextResponse } from "next/server";

// const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
// const SIGN_IN_ROUTE = "/auth/signin";
// const HELPDESK_ROUTE_PREFIX = "/helpdesk";

// const ADMIN_ONLY_ROUTES = [
//   "/helpdesk/department",
//   "/helpdesk/category",
//   "/helpdesk/user",
// ] as const;

// const PRIVILEGED_ROLES = new Set(["LEVEL_3", "SUPER_ADMIN"]);

// function isAdminOnlyRoute(pathname: string) {
//   return ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));
// }

// function isSafeInternalCallback(callbackPath: string) {
//   return callbackPath.startsWith("/") && !callbackPath.startsWith("//");
// }

// export async function proxy(req: NextRequest) {
//   const { pathname, search } = req.nextUrl;
//   const token = await getToken({ req, secret: AUTH_SECRET });
//   const isAuthenticated = Boolean(token?.id);

//   // Helpdesk pages ကို guest user မဝင်နိုင်အောင် signin redirect + callbackUrl save လုပ်ထားသည်။
//   if (pathname.startsWith(HELPDESK_ROUTE_PREFIX) && !isAuthenticated) {
//     const signInUrl = new URL(SIGN_IN_ROUTE, req.url);
//     const callbackPath = `${pathname}${search}`;

//     if (isSafeInternalCallback(callbackPath)) {
//       signInUrl.searchParams.set("callbackUrl", callbackPath);
//     }

//     return NextResponse.redirect(signInUrl);
//   }

//   // Authenticated user သည် sign-in page ကိုပြန်မဝင်စေဘဲ dashboard သို့တိုက်ရိုက်ပို့သည်။
//   if (pathname === SIGN_IN_ROUTE && isAuthenticated) {
//     return NextResponse.redirect(new URL(HELPDESK_ROUTE_PREFIX, req.url));
//   }

//   // Configuration routes တွေကို LEVEL_3 / SUPER_ADMIN သာဝင်ခွင့်ပေးသည်။
//   if (pathname.startsWith(HELPDESK_ROUTE_PREFIX) && isAdminOnlyRoute(pathname)) {
//     const role = String(token?.role ?? "");
//     const canAccess = PRIVILEGED_ROLES.has(role);

//     if (!canAccess) {
//       return NextResponse.redirect(new URL(HELPDESK_ROUTE_PREFIX, req.url));
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/helpdesk/:path*", "/auth/signin"],
// };

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

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // ==========================================
  // 🌟 LOGGING အပိုင်း (ဝင်လာသမျှ အားလုံးကို မှတ်မည်)
  // ==========================================

  // IP ကို Header ထဲကနေ ယူပါမည်
  const ip = req.headers.get("x-forwarded-for")?.split(',')[0] || req.headers.get("x-real-ip") || "Unknown";

  const token = await getToken({ req, secret: AUTH_SECRET });
  const isAuthenticated = Boolean(token?.id);

  // အချိန် (Time) ကို မြန်မာစံတော်ချိန်ဖြင့် ယူပါမည်
  const currentTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Yangon" });
  const userIdentifier = token?.email ? `[User: ${token.email}]` : '[Guest]';
  const isPrefetch = req.headers.get("next-router-prefetch") === "1" ||
    req.headers.get("purpose") === "prefetch" ||
    req.headers.get("x-middleware-prefetch") === "1";

  // Frontend မှ Auto-refresh (Background Fetch) လုပ်နေသော အရာများကို ဖယ်ထုတ်မည်
  const isBackgroundFetch = req.headers.get("sec-fetch-dest") === "empty";

  // တကယ့် Page ကို လာကြည့်တာလား စစ်ဆေးမည်
  const isPageVisit = req.headers.get("accept")?.includes("text/html");

  // POST, PUT, DELETE ကဲ့သို့သော Data အပြောင်းအလဲ (Action) များကို အမြဲမှတ်မည်
  const isMutation = req.method !== "GET";

  if (!isPrefetch) {
    // Data ပြင်တဲ့ Action (သို့) တကယ် Page ဖွင့်ကြည့်တဲ့ Action များကိုသာ မှတ်မည်
    // Background ကနေ Auto လာခေါ်တဲ့ GET request များကို လျစ်လျူရှုမည်
    if (isMutation || (isPageVisit && !isBackgroundFetch)) {
      console.log(`[${currentTime}] [ACTION] ${req.method} ${pathname} ${userIdentifier} (IP: ${ip})`);
    }
  }
  // ==========================================
  // 🌟 AUTHENTICATION & AUTHORIZATION အပိုင်း
  // ==========================================

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

// 🌟 Config Matcher အသစ်
export const config = {
  matcher: [
    /*
     * CSS, JS, ပုံဖိုင် စသည့် Static Assets များမှလွဲ၍ ကျန်သည့် API နှင့် Page အားလုံးကို 
     * middleware မှ ဖမ်းယူပြီး Log မှတ်ပေးမည်ဖြစ်ပါသည်။
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};