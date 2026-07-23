import { NextResponse } from "next/server"
import db from "@/lib/db"
import { subcategories } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"
import { requireAuth, requireAdmin } from "@/lib/auth-guard"

export async function GET(request: Request) {
    try {
        const { error } = await requireAuth()
        if (error) return error

        const { searchParams } = new URL(request.url)
        const productTypeId = searchParams.get("productTypeId")

        let query = db.query.subcategories.findMany({
            orderBy: [asc(subcategories.sortOrder)],
        })

        if (productTypeId) {
            query = db.query.subcategories.findMany({
                where: eq(subcategories.productTypeId, productTypeId),
                orderBy: [asc(subcategories.sortOrder)],
            })
        }

        const result = await query
        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to fetch subcategories:", error)
        return NextResponse.json({ error: "Failed to fetch subcategories" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const body = await request.json()
        const { name, productTypeId, icon, color, sortOrder } = body

        if (!name || !productTypeId) {
            return NextResponse.json({ error: "Name and product type are required" }, { status: 400 })
        }

        const slug = name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")

        const [newSub] = await db
            .insert(subcategories)
            .values({ name, slug, productTypeId, icon: icon || "Tag", color: color || "bg-gray-500/20 text-gray-700", sortOrder: sortOrder || 0 })
            .returning()

        return NextResponse.json(newSub)
    } catch (error: any) {
        console.error("Failed to create subcategory:", error)
        if (error.code === "23505") {
            return NextResponse.json({ error: "Ce nom de sous-catégorie existe déjà" }, { status: 409 })
        }
        return NextResponse.json({ error: "Failed to create subcategory" }, { status: 500 })
    }
}
