import { NextResponse } from "next/server"
import db from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { desc, sql } from "drizzle-orm"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    try {
        let query = db.select().from(clients)

        if (search) {
            query = query.where(
                sql`${clients.name} ILIKE ${`%${search}%`} OR ${clients.email} ILIKE ${`%${search}%`} OR ${clients.phone} ILIKE ${`%${search}%`}`,
            ) as any
        }

        const allClients = await query.orderBy(desc(clients.createdAt))
        return NextResponse.json(allClients)
    } catch (error) {
        console.error("Failed to fetch clients:", error)
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, email, phone, address, creditLimit, isActive } = body

        if (!name || !email || !phone || !address) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const [newClient] = await db
            .insert(clients)
            .values({
                name,
                email,
                phone,
                address,
                creditLimit: creditLimit?.toString() || "0",
                creditBalance: "0",
                isActive: isActive !== undefined ? isActive : true,
            })
            .returning()

        return NextResponse.json(newClient)
    } catch (error) {
        console.error("Failed to create client:", error)
        return NextResponse.json({ error: "Failed to create client" }, { status: 500 })
    }
}
