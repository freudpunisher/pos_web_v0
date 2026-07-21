import { NextResponse } from "next/server"
import db from "@/lib/db"
import { categoryGroups } from "@/lib/db/schema"
import { asc } from "drizzle-orm"

export async function GET() {
    try {
        const allGroups = await db.select().from(categoryGroups).orderBy(asc(categoryGroups.name))
        return NextResponse.json(allGroups)
    } catch (error) {
        console.error("Failed to fetch category groups:", error)
        return NextResponse.json({ error: "Failed to fetch category groups" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, description } = body

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }

        const [newGroup] = await db
            .insert(categoryGroups)
            .values({ name, description })
            .returning()

        return NextResponse.json(newGroup)
    } catch (error) {
        console.error("Failed to create category group:", error)
        return NextResponse.json({ error: "Failed to create category group" }, { status: 500 })
    }
}
