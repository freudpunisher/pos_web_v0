import { NextResponse } from "next/server"
import db from "@/lib/db"
import { menuPermissions } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"

export async function GET() {
    try {
        const cookieStore = await cookies()
        const token = cookieStore.get("auth-token")?.value
        let userRole = "cashier"

        if (token) {
            const payload = await verifyToken(token)
            if (payload) {
                userRole = payload.role
            }
        }

        const menus = await db
            .select()
            .from(menuPermissions)
            .orderBy(asc(menuPermissions.sortOrder))

        const filtered = menus.filter(m => m.roles?.includes(userRole))

        return NextResponse.json(filtered)
    } catch (error) {
        console.error("Failed to fetch menus:", error)
        return NextResponse.json({ error: "Failed to fetch menus" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { updates } = body

        if (!updates || !Array.isArray(updates)) {
            return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
        }

        for (const item of updates) {
            if (item.id && item.roles) {
                await db
                    .update(menuPermissions)
                    .set({ roles: item.roles })
                    .where(eq(menuPermissions.id, item.id))
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to update menus:", error)
        return NextResponse.json({ error: "Failed to update menus" }, { status: 500 })
    }
}
