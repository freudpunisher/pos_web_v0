import { NextResponse } from "next/server"
import db from "@/lib/db"
import { categories } from "@/lib/db/schema"
import { asc } from "drizzle-orm"

export async function GET() {
    try {
        const allCategories = await db.select().from(categories).orderBy(asc(categories.name))
        return NextResponse.json(allCategories)
    } catch (error) {
        console.error("Failed to fetch categories:", error)
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, description, groupId } = body

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }

        const [newCategory] = await db
            .insert(categories)
            .values({
                name,
                description,
                groupId: groupId || null,
            })
            .returning()

        return NextResponse.json(newCategory)
    } catch (error) {
        console.error("Failed to create category:", error)
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 })
    }
}
