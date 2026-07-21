import { NextResponse } from "next/server"
import db from "@/lib/db"
import { products, productSellingUnits } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const { id } = await params
        const body = await request.json()
        const { name, categoryId, productType, price, cost, minStock, unit, trackStock, image, sector, quantityPerBox, sellingUnits } = body

        const result = await db.transaction(async (tx) => {
            const [updatedProduct] = await tx
                .update(products)
                .set({
                    name,
                    categoryId,
                    productType,
                    price: price?.toString(),
                    cost: cost ? cost.toString() : undefined,
                    minStock,
                    unit,
                    trackStock,
                    image,
                    sector,
                    quantityPerBox: quantityPerBox || 1,
                })
                .where(eq(products.id, id))
                .returning()

            if (!updatedProduct) {
                return null
            }

            // Replace selling units: delete existing, insert new
            if (sellingUnits !== undefined) {
                await tx.delete(productSellingUnits).where(eq(productSellingUnits.productId, id))

                if (Array.isArray(sellingUnits) && sellingUnits.length > 0) {
                    for (let i = 0; i < sellingUnits.length; i++) {
                        const su = sellingUnits[i]
                        await tx.insert(productSellingUnits).values({
                            productId: id,
                            name: su.name,
                            unitId: su.unitId || null,
                            price: su.price.toString(),
                            conversionFactor: (su.conversionFactor || 1).toString(),
                            isDefault: su.isDefault || i === 0,
                            sortOrder: i,
                        })
                    }
                }
            }

            return updatedProduct
        })

        if (!result) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to update product:", error)
        return NextResponse.json({ error: "Failed to update product" }, { status: 500 })
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const { id } = await params
        const [deletedProduct] = await db
            .delete(products)
            .where(eq(products.id, id))
            .returning()

        if (!deletedProduct) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Product deleted successfully" })
    } catch (error) {
        console.error("Failed to delete product:", error)
        return NextResponse.json({ error: "Failed to delete product" }, { status: 500 })
    }
}
