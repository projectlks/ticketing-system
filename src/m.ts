// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import { getToken } from "next-auth/jwt";

// // --- Proxy မှ Configuration များ ---
// const AUTH_SECRET = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
// const SIGN_IN_ROUTE = "/auth/signin";
// const HELPDESK_ROUTE_PREFIX = "/helpdesk";

// const ADMIN_ONLY_ROUTES = [
//     "/helpdesk/department",
//     "/helpdesk/category",
//     "/helpdesk/user",
// ] as const;

// const PRIVILEGED_ROLES = new Set(["LEVEL_3", "SUPER_ADMIN"]);

// function isAdminOnlyRoute(pathname: string) {
//     return ADMIN_ONLY_ROUTES.some((route) => pathname.startsWith(route));
// }

// function isSafeInternalCallback(callbackPath: string) {
//     return callbackPath.startsWith("/") && !callbackPath.startsWith("//");
// }

// export async function middleware(req: NextRequest) {
//     const { pathname, search } = req.nextUrl;

//     // ==========================================
//     // အပိုင်း (၁): Authentication နှင့် Authorization 
//     // ==========================================

//     const isHelpdeskRoute = pathname.startsWith(HELPDESK_ROUTE_PREFIX);
//     const isAuthRoute = pathname === SIGN_IN_ROUTE;

//     // လိုအပ်သော လမ်းကြောင်းများတွင်သာ Token ကို ဆွဲယူစစ်ဆေးမည် (Performance အတွက်)
//     if (isHelpdeskRoute || isAuthRoute) {
//         const token = await getToken({ req, secret: AUTH_SECRET });
//         const isAuthenticated = Boolean(token?.id);

//         // Helpdesk pages ကို guest user မဝင်နိုင်အောင် signin သို့ redirect လုပ်ခြင်း
//         if (isHelpdeskRoute && !isAuthenticated) {
//             const signInUrl = new URL(SIGN_IN_ROUTE, req.url);
//             const callbackPath = `${pathname}${search}`;

//             if (isSafeInternalCallback(callbackPath)) {
//                 signInUrl.searchParams.set("callbackUrl", callbackPath);
//             }
//             return NextResponse.redirect(signInUrl);
//         }

//         // Authenticated user သည် sign-in page သို့ ပြန်ရောက်လာပါက dashboard သို့ တိုက်ရိုက်ပို့ခြင်း
//         if (isAuthRoute && isAuthenticated) {
//             return NextResponse.redirect(new URL(HELPDESK_ROUTE_PREFIX, req.url));
//         }

//         // Configuration routes များကို LEVEL_3 / SUPER_ADMIN သာ ဝင်ခွင့်ပေးခြင်း
//         if (isHelpdeskRoute && isAdminOnlyRoute(pathname)) {
//             const role = String(token?.role ?? "");
//             const canAccess = PRIVILEGED_ROLES.has(role);

//             if (!canAccess) {
//                 return NextResponse.redirect(new URL(HELPDESK_ROUTE_PREFIX, req.url));
//             }
//         }
//     }

//     // ==========================================
//     // အပိုင်း (၂): Security Headers (Nonce & CSP) 
//     // ==========================================

//     // ၁။ ကျပန်း Nonce ဖန်တီးခြင်း
//     const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

//     // ၂။ CSP ကို တည်ဆောက်ခြင်း
//     const cspHeader = `
//     default-src 'self';
//     script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
//     style-src 'self' 'nonce-${nonce}';
//     img-src 'self' blob: data: https:;
//     font-src 'self';
//     object-src 'none';
//     base-uri 'self';
//     form-action 'self';
//     frame-ancestors 'none';
//     upgrade-insecure-requests;
//   `.replace(/\s{2,}/g, ' ').trim();

//     // ၃။ Request Headers များကို ယူပြီး x-nonce နှင့် CSP ကို ထည့်ပါ
//     const requestHeaders = new Headers(req.headers);
//     requestHeaders.set('x-nonce', nonce);
//     requestHeaders.set('Content-Security-Policy', cspHeader);

//     // ၄။ Header အသစ်များဖြင့် Response ကို ဆက်သွားခွင့်ပြုပါ
//     const response = NextResponse.next({
//         request: {
//             headers: requestHeaders,
//         },
//     });

//     // ၅။ Browser ဆီ ပြန်ပို့မည့် Response တွင်လည်း CSP ကို တပ်ပေးပါ
//     response.headers.set('Content-Security-Policy', cspHeader);

//     return response;
// }

// // ==========================================
// // အပိုင်း (၃): Matcher Configuration
// // ==========================================
// export const config = {
//     // API များ၊ Static ဖိုင်များနှင့် ပုံများကို ကျော်သွားစေရန် (Website မလေးသွားစေရန်)
//     // (Proxy ရဲ့ "/helpdesk/:path*" ကလည်း ဒီအောက်မှာ အကျုံးဝင်သွားပါပြီ)
//     matcher: [
//         '/((?!api|_next/static|_next/image|favicon.ico).*)',
//     ],
// };