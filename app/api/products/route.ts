import { NextResponse } from "next/server"
import db from "@/lib/db"
import { products, categories, categoryGroups, measurementUnits, stock, productSellingUnits } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"
import { resolveWarehouse } from "@/lib/db/location-utils"
import { requireAdmin } from "@/lib/auth-guard"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get("categoryId")
    const search = searchParams.get("search")

    try {
        let query = db
            .select({
                id: products.id,
                sku: products.sku,
                name: products.name,
                productType: products.productType,
                price: products.price,
                stock: products.stock,
                minStock: products.minStock,
                trackStock: products.trackStock,
                unit: products.unit,
                unitName: measurementUnits.name,
                image: products.image,
                categoryId: products.categoryId,
                categoryName: categories.name,
                categoryGroupId: categories.groupId,
                categoryGroupName: categoryGroups.name,
                sector: products.sector,
                quantityPerBox: products.quantityPerBox,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .leftJoin(categoryGroups, eq(categories.groupId, categoryGroups.id))
            .leftJoin(measurementUnits, eq(products.unit, measurementUnits.code))

        if (categoryId) {
            query = query.where(eq(products.categoryId, categoryId)) as any
        }

        if (search) {
            query = query.where(sql`${products.name} ILIKE ${`%${search}%`} OR ${products.sku} ILIKE ${`%${search}%`}`) as any
        }

        const allProducts = await query.orderBy(desc(products.name))

        // Attach selling units to each product
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
        const { name, categoryId, productType, price, cost, minStock, unit, trackStock, image, sector, quantityPerBox, sellingUnits } = body
        let { sku } = body

        if (!name || price === undefined) {
            return NextResponse.json({ error: "Missing required fields (name or price)" }, { status: 400 })
        }

        // Auto-generate SKU if not provided
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
                    categoryId,
                    productType: productType || "food",
                    price: price.toString(),
                    cost: cost ? cost.toString() : null,
                    stock: "0",
                    minStock: minStock || 10,
                    unit,
                    trackStock: trackStock || false,
                    image,
                    sector,
                    quantityPerBox: parseInt(quantityPerBox) || 1,
                })
                .returning()

            // Insert selling units if provided
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

            // Initialize stock record at the correct warehouse (only for trackable products)
            const isTrackable = productType === "ingredient" || (productType === "drink" && trackStock)

            if (isTrackable) {
                const warehouse = await resolveWarehouse(tx, productType || "ingredient")

                await tx.insert(stock).values({
                    productId: newProduct.id,
                    locationId: warehouse.id,
                    quantityOnHand: "0",
                    quantityReserved: "0",
                    reorderLevel: minStock || 10,
                    reorderQuantity: 20
                })
            }

            return newProduct
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to create product:", error)
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 })
    }
}
