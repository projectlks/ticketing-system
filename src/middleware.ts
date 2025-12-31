import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

const SECRET = process.env.AUTH_SECRET;

const ADMIN_ONLY_ROUTES = [
    "/helpdesk/department",
    "/helpdesk/category",
    "/helpdesk/user",
];

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const token = await getToken({ req, secret: SECRET });

    // 🔐 Not logged in
    if (!token) {
        return NextResponse.redirect(new URL("/auth/signin", req.url));
    }

    // 🔒 Restrict only these routes
    const isAdminRoute = ADMIN_ONLY_ROUTES.some((route) =>
        pathname.startsWith(route)
    );

    const isAdmin =
        token.role === "ADMIN" || token.role === "SUPER_ADMIN";

    if (isAdminRoute && !isAdmin) {
        return NextResponse.redirect(
            new URL("/helpdesk", req.url)
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/helpdesk/:path*"],
};
