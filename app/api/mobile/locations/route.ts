import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import db from "@/lib/db"
import { userLocations, locations } from "@/lib/db/schema"
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

        const userLocs = await db
            .select({
                id: locations.id,
                name: locations.name,
                type: locations.type,
                isActive: locations.isActive,
            })
            .from(userLocations)
            .innerJoin(locations, eq(userLocations.locationId, locations.id))
            .where(eq(userLocations.userId, payload.userId))

        return NextResponse.json(userLocs)
    } catch (error) {
        console.error("Mobile locations fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
    }
}
