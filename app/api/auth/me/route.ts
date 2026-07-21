import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import db from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyToken } from "@/lib/auth"

export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("auth-token")?.value

        if (!token) {
            return NextResponse.json(
                { error: "Not authenticated" },
                { status: 401 }
            )
        }

        // Verify token
        const payload = await verifyToken(token)
        if (!payload) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            )
        }

        // Fetch user from database
        const [user] = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
                role: users.role,
                avatar: users.avatar,
            })
            .from(users)
            .where(eq(users.id, payload.userId))
            .limit(1)

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            )
        }

        return NextResponse.json({ user })
    } catch (error) {
        console.error("Get current user error:", error)
        return NextResponse.json(
            { error: "An error occurred" },
            { status: 500 }
        )
    }
}
