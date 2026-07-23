import { NextResponse } from "next/server"
import db from "@/lib/db"
import { userLocations, locations as locationsTable } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
    request: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const userId = params.userId

        const userLocs = await db
            .select()
            .from(userLocations)
            .where(eq(userLocations.userId, userId))

        // Enrich with location data
        const enriched = await Promise.all(
            userLocs.map(async (ul) => {
                const location = await db
                    .select()
                    .from(locationsTable)
                    .where(eq(locationsTable.id, ul.locationId))
                    .limit(1)
                    .then((res) => res[0])
                return { ...ul, location }
            })
        )

        return NextResponse.json(enriched)
    } catch (error) {
        console.error("Failed to fetch user locations:", error)
        return NextResponse.json(
            { error: "Failed to fetch user locations" },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    { params }: { params: { userId: string } }
) {
    try {
        const userId = params.userId
        const { locationId } = await request.json()

        if (!locationId) {
            return NextResponse.json(
                { error: "Location ID is required" },
                { status: 400 }
            )
        }

        // Check if already assigned
        const existing = await db
            .select()
            .from(userLocations)
            .where(eq(userLocations.userId, userId))
            .where(eq(userLocations.locationId, locationId))
            .limit(1)

        if (existing.length > 0) {
            return NextResponse.json(
                { error: "User is already assigned to this location" },
                { status: 400 }
            )
        }

        const [newAssignment] = await db
            .insert(userLocations)
            .values({ userId, locationId })
            .returning()

        const location = await db
            .select()
            .from(locationsTable)
            .where(eq(locationsTable.id, locationId))
            .limit(1)
            .then((res) => res[0])

        return NextResponse.json({ ...newAssignment, location }, { status: 201 })
    } catch (error) {
        console.error("Failed to assign location to user:", error)
        return NextResponse.json(
            { error: "Failed to assign location" },
            { status: 500 }
        )
    }
}
