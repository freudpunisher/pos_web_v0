import { NextResponse } from "next/server"
import db from "@/lib/db"
import { suppliers } from "@/lib/db/schema"
import { desc } from "drizzle-orm"
import { requireAuth } from "@/lib/auth-guard"

export async function GET() {
    const auth = await requireAuth()
    if (auth.error) return auth.error

    try {
        const allSuppliers = await db.select().from(suppliers).orderBy(desc(suppliers.name))
        return NextResponse.json(allSuppliers)
    } catch (error) {
        console.error("Failed to fetch suppliers:", error)
        return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    if (auth.payload?.role !== "admin" && auth.payload?.role !== "manager") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const body = await request.json()
        const { name, email, phone, address } = body

        if (!name || !email || !phone || !address) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const [newSupplier] = await db
            .insert(suppliers)
            .values({
                name,
                email,
                phone,
                address,
            })
            .returning()

        return NextResponse.json(newSupplier)
    } catch (error) {
        console.error("Failed to create supplier:", error)
        return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 })
    }
}
