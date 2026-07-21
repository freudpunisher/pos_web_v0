import { NextResponse } from "next/server"
import db from "@/lib/db"
import { locations } from "@/lib/db/schema"
import { eq, desc } from "drizzle-orm"

export async function GET() {
    try {
        const allLocations = await db.query.locations.findMany({
            orderBy: [desc(locations.type)],
        })
        return NextResponse.json(allLocations)
    } catch (error) {
        console.error("Failed to fetch locations:", error)
        return NextResponse.json({ error: "Failed to fetch locations" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, type } = body

        if (!name || !type) {
            return NextResponse.json({ error: "Name and type are required" }, { status: 400 })
        }

        const [newLocation] = await db.insert(locations).values({ name, type }).returning()
        return NextResponse.json(newLocation)
    } catch (error) {
        console.error("Failed to create location:", error)
        return NextResponse.json({ error: "Failed to create location" }, { status: 500 })
    }
}
