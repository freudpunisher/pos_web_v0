import { NextResponse } from "next/server"
import db from "@/lib/db"
import { tables } from "@/lib/db/schema"
import { eq, asc } from "drizzle-orm"

export async function GET() {
    try {
        const allTables = await db.query.tables.findMany({
            orderBy: [asc(tables.number)],
        })
        return NextResponse.json(allTables)
    } catch (error) {
        console.error("Failed to fetch tables:", error)
        return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { number, capacity, section } = body

        if (!number) {
            return NextResponse.json({ error: "Table number is required" }, { status: 400 })
        }

        const [newTable] = await db
            .insert(tables)
            .values({ number, capacity: capacity || 4, section })
            .returning()

        return NextResponse.json(newTable)
    } catch (error) {
        console.error("Failed to create table:", error)
        return NextResponse.json({ error: "Failed to create table" }, { status: 500 })
    }
}
