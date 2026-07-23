import { NextResponse } from "next/server"
import db from "@/lib/db"
import { userLocations } from "@/lib/db/schema"
import { and, eq } from "drizzle-orm"

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string; locationId: string }> }
) {
    try {
        const { id: userId, locationId } = await params

        await db
            .delete(userLocations)
            .where(and(eq(userLocations.userId, userId), eq(userLocations.locationId, locationId)))

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to remove location from user:", error)
        return NextResponse.json(
            { error: "Failed to remove location" },
            { status: 500 }
        )
    }
}
