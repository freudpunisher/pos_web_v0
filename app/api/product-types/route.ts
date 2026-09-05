import { NextResponse } from "next/server"
import db from "@/lib/db"
import { productTypes } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import { requireAuth, requireManagerOrAdmin } from "@/lib/auth-guard"

export async function GET() {
    try {
        const { error } = await requireAuth()
        if (error) return error

        const types = await db.query.productTypes.findMany({
            orderBy: [asc(productTypes.sortOrder)],
        })
        return NextResponse.json(types)
    } catch (error) {
        console.error("Failed to fetch product types:", error)
        return NextResponse.json({ error: "Failed to fetch product types" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const authError = await requireManagerOrAdmin()
        if (authError) return authError

        const body = await request.json()
        const { name, icon, color, sortOrder } = body

        if (!name) {
            return NextResponse.json({ error: "Name is required" }, { status: 400 })
        }

        const slug = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")

        const [newType] = await db
            .insert(productTypes)
            .values({ name, slug, icon: icon || "Package", color: color || "bg-gray-500/20 text-gray-700", sortOrder: sortOrder || 0 })
            .returning()

        return NextResponse.json(newType)
    } catch (error: any) {
        console.error("Failed to create product type:", error)
        if (error.code === "23505") {
            return NextResponse.json({ error: "Ce nom de type existe déjà" }, { status: 409 })
        }
        return NextResponse.json({ error: "Failed to create product type" }, { status: 500 })
    }
}
