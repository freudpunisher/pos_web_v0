import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import db from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.substring(7)
        const payload = await verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const allClients = await db
            .select()
            .from(clients)
            .where(eq(clients.isActive, true))

        return NextResponse.json(allClients)
    } catch (error) {
        console.error("Mobile clients fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
    }
}
