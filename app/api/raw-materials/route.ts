import { NextResponse } from "next/server"
import db from "@/lib/db"
import { products, stock } from "@/lib/db/schema"
import { eq, desc, sql, and } from "drizzle-orm"
import { resolveWarehouse } from "@/lib/db/location-utils"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    try {
        const conditions: any[] = []
        if (search) {
            conditions.push(sql`${products.name} ILIKE ${`%${search}%`} OR ${products.sku} ILIKE ${`%${search}%`}`)
        }

        const rawMaterials = await db
            .select({
                id: products.id,
                sku: products.sku,
                name: products.name,
                cost: products.cost,
                stock: products.stock,
                minStock: products.minStock,
            })
            .from(products)
                .where(conditions.length ? and(...conditions) : undefined)
            .orderBy(desc(products.name))

        return NextResponse.json(rawMaterials)
    } catch (error) {
        console.error("Failed to fetch raw materials:", error)
        return NextResponse.json({ error: "Failed to fetch raw materials" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { name, cost, minStock } = body
        let { sku } = body

        if (!name || !cost) {
            return NextResponse.json({ error: "Missing required fields (name, cost)" }, { status: 400 })
        }

        // Auto-generate SKU for raw materials
        if (!sku) {
            const prefix = "RM-" + name.substring(0, 3).toUpperCase()
            const random = Math.floor(1000 + Math.random() * 9000)
            sku = `${prefix}-${random}`
        }

        const result = await db.transaction(async (tx) => {
            const [newProduct] = await tx
                .insert(products)
                .values({
                    sku,
                    name,
                    price: '0',
                    cost: (cost || 0).toString(),
                    stock: "0",
                    minStock: (minStock || 0).toString(),
                })
                .returning()

            // Initialize stock record at principal warehouse
            const warehouse = await resolveWarehouse(tx)
            await tx.insert(stock).values({
                productId: newProduct.id,
                locationId: warehouse.id,
                quantityOnHand: "0",
                quantityReserved: "0",
                reorderLevel: (minStock || 0).toString(),
                reorderQuantity: "20"
            })

            return newProduct
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to create raw material:", error)
        return NextResponse.json({ error: "Failed to create raw material" }, { status: 500 })
    }
}
