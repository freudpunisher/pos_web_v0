import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifyToken } from "./lib/auth"

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl

    // Public routes that don't require authentication
    const publicRoutes = ["/login"]
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

    // Allow public routes
    if (isPublicRoute) {
        return NextResponse.next()
    }

    // Check for auth token
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
        // Redirect to login if no token
        const loginUrl = new URL("/login", request.url)
        return NextResponse.redirect(loginUrl)
    }

    // Verify token
    const payload = await verifyToken(token)
    if (!payload) {
        // Redirect to login if token is invalid
        const loginUrl = new URL("/login", request.url)
        const response = NextResponse.redirect(loginUrl)
        // Clear invalid token
        response.cookies.delete("auth-token")
        return response
    }

    // Token is valid, allow request
    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes (handled separately)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (public folder)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|login).*)",
    ],
}
