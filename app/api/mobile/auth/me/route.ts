import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import db from "@/lib/db"
import { users, userLocations, locations } from "@/lib/db/schema"
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

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, payload.userId))
            .limit(1)

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        const userLocs = await db
            .select({
                locationId: userLocations.locationId,
                locationName: locations.name,
                locationType: locations.type,
            })
            .from(userLocations)
            .innerJoin(locations, eq(userLocations.locationId, locations.id))
            .where(eq(userLocations.userId, user.id))

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
            locations: userLocs,
        })
    } catch (error) {
        console.error("Mobile me error:", error)
        return NextResponse.json(
            { error: "An error occurred" },
            { status: 500 }
        )
    }
}
