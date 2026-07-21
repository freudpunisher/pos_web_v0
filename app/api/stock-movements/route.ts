import { products, stockMovements } from "@/lib/db/schema"
import { desc, eq, sql, gte, lte, and } from "drizzle-orm"
import db from "@/lib/db/index"
import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import type { ExtractTablesWithRelations } from "drizzle-orm"
import type { PgTransaction } from "drizzle-orm/pg-core"
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js"

type Transaction = PgTransaction<PostgresJsQueryResultHKT, typeof import("@/lib/db/schema"), ExtractTablesWithRelations<typeof import("@/lib/db/schema")>>

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const dateFrom = searchParams.get("dateFrom")
        const dateTo = searchParams.get("dateTo")
        const productId = searchParams.get("productId")
        const locationId = searchParams.get("locationId")
        const type = searchParams.get("type")
        const search = searchParams.get("search")

        const conditions: any[] = []
        function fmt(date: Date) {
          const p = (n: number) => String(n).padStart(2, "0")
          return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
        }
        if (dateFrom) {
          const d = new Date(dateFrom)
          d.setHours(0, 0, 0, 0)
          conditions.push(gte(stockMovements.date, sql`${fmt(d)}::timestamp`))
        }
        if (dateTo) {
          const d = new Date(dateTo)
          d.setHours(23, 59, 59, 999)
          conditions.push(lte(stockMovements.date, sql`${fmt(d)}::timestamp`))
        }
        if (productId) conditions.push(eq(stockMovements.productId, productId))
        if (locationId) conditions.push(eq(stockMovements.locationId, locationId))
        if (type && type !== "all") conditions.push(eq(stockMovements.type, type))
        if (search) conditions.push(sql`${stockMovements.productName} ILIKE ${`%${search}%`}`)

        const allMovements = await db.query.stockMovements.findMany({
            where: conditions.length ? and(...conditions) : undefined,
            orderBy: [desc(stockMovements.date)],
            with: {
                product: true,
                user: true,
                location: true,
            },
        })
        return NextResponse.json(allMovements)
    } catch (error) {
        console.error("Failed to fetch stock movements:", error)
        return NextResponse.json({ error: "Failed to fetch stock movements" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { productId, type, quantity, notes, userId, locationId, referenceId, referenceType } = body

        if (!productId || !type || quantity === undefined || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Perform in a transaction
        const result = await db.transaction(async (tx: Transaction) => {
            // 1. Get product to ensure it exists and get its name
            const [product] = await tx.select().from(products).where(eq(products.id, productId))
            if (!product) throw new Error("Product not found")

            // 2. Insert stock movement
            const [newMovement] = await tx
                .insert(stockMovements)
                .values({
                    productId,
                    productName: product.name,
                    type,
                    quantity,
                    userId,
                    locationId,
                    referenceId,
                    referenceType,
                    notes,
                })
                .returning()

            // 3. Update product stock
            await tx
                .update(products)
                .set({
                    stock: sql`${products.stock} + ${quantity}`,
                })
                .where(eq(products.id, productId))

            return newMovement
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Failed to create stock movement:", error)
        return NextResponse.json({ error: error.message || "Failed to create stock movement" }, { status: 500 })
    }
}
