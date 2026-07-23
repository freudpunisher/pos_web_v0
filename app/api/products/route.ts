import { NextResponse } from "next/server"
import db from "@/lib/db"
import { products, productSellingUnits, measurementUnits, subcategories } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")

    try {
        let query = db
            .select({
                id: products.id,
                sku: products.sku,
                name: products.name,
                productTypeId: products.productTypeId,
                subcategoryId: products.subcategoryId,
                subcategoryName: subcategories.name,
                price: products.price,
                stock: products.stock,
                minStock: products.minStock,
            })
            .from(products)
            .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))

        if (search) {
            query = query.where(sql`${products.name} ILIKE ${`%${search}%`} OR ${products.sku} ILIKE ${`%${search}%`}`) as any
        }

        const allProducts = await query.orderBy(desc(products.name))

        const productsWithUnits = await Promise.all(
            allProducts.map(async (product) => {
                const sellingUnits = await db
                    .select({
                        id: productSellingUnits.id,
                        name: productSellingUnits.name,
                        unitId: productSellingUnits.unitId,
                        unitName: measurementUnits.name,
                        price: productSellingUnits.price,
                        conversionFactor: productSellingUnits.conversionFactor,
                        isDefault: productSellingUnits.isDefault,
                        sortOrder: productSellingUnits.sortOrder,
                    })
                    .from(productSellingUnits)
                    .leftJoin(measurementUnits, eq(productSellingUnits.unitId, measurementUnits.id))
                    .where(eq(productSellingUnits.productId, product.id))
                    .orderBy(productSellingUnits.sortOrder)

                return { ...product, stock: Number(product.stock), sellingUnits }
            })
        )

        return NextResponse.json(productsWithUnits)
    } catch (error) {
        console.error("Failed to fetch products:", error)
        return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const body = await request.json()
        const { name, productTypeId, subcategoryId, price, cost, minStock, sellingUnits } = body
        let { sku } = body

        if (!name || price === undefined) {
            return NextResponse.json({ error: "Missing required fields (name or price)" }, { status: 400 })
        }

        if (!sku) {
            const prefix = name.substring(0, 3).toUpperCase()
            const random = Math.floor(1000 + Math.random() * 9000)
            sku = `${prefix}-${random}`
        }

        const result = await db.transaction(async (tx) => {
            const [newProduct] = await tx
                .insert(products)
                .values({
                    sku,
                    name,
                    productTypeId: productTypeId || null,
                    subcategoryId: subcategoryId || null,
                    price: price.toString(),
                    cost: cost ? cost.toString() : null,
                    stock: "0",
                    minStock: minStock || 10,
                })
                .returning()

            if (sellingUnits && Array.isArray(sellingUnits) && sellingUnits.length > 0) {
                for (let i = 0; i < sellingUnits.length; i++) {
                    const su = sellingUnits[i]
                    await tx.insert(productSellingUnits).values({
                        productId: newProduct.id,
                        name: su.name,
                        unitId: su.unitId || null,
                        price: su.price.toString(),
                        conversionFactor: (su.conversionFactor || 1).toString(),
                        isDefault: su.isDefault || i === 0,
                        sortOrder: i,
                    })
                }
            }

            return newProduct
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to create product:", error)
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }
}
