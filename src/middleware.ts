import { getToken } from "next-auth/jwt";
import { NextResponse, NextRequest } from "next/server";

const SECRET = process.env.AUTH_SECRET;

export async function middleware(req: NextRequest) {

    // Get token from next-auth
    const token = await getToken({ req, secret: SECRET });


    if (!token) {
        return NextResponse.redirect(new URL(`/auth/signin`, req.url));
    }


    return NextResponse.next();
}



// Match all locale-based /lang/*/main/* routes
export const config = {
    matcher: ["/helpdesk/:path*"],
};