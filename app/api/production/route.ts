import { NextResponse } from "next/server"
import db from "@/lib/db"
import { productionRuns, recipes, recipeIngredients, stock, stockMovements, products } from "@/lib/db/schema"
import { eq, desc, sql, and } from "drizzle-orm"
import { resolveWarehouse } from "@/lib/db/location-utils"

export async function GET(request: Request) {
    try {
        const runs = await db.query.productionRuns.findMany({
            with: {
                recipe: {
                    with: {
                        product: true
                    }
                },
                user: true
            },
            orderBy: [desc(productionRuns.startDate)]
        })

        return NextResponse.json(runs)
    } catch (error) {
        console.error("Failed to fetch production runs:", error)
        return NextResponse.json({ error: "Failed to fetch production runs" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { recipeId, quantity, userId } = body

        if (!recipeId || !quantity || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // 1. Fetch Recipe and Ingredients
        const recipe = await db.query.recipes.findFirst({
            where: eq(recipes.id, recipeId),
            with: {
                ingredients: {
                    with: {
                        ingredient: true
                    }
                },
                product: true
            }
        })

        if (!recipe) {
            return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
        }

        const productionRatio = Number(quantity) / Number(recipe.yieldQuantity)

        const result = await db.transaction(async (tx) => {
            const shortages: { ingredientId: string; ingredientName: string; required: number; available: number; unit?: string | null }[] = []
            let productionCost = 0

            for (const item of recipe.ingredients) {
                const requiredQty = Number(item.quantity) * productionRatio
                const warehouse = await resolveWarehouse(tx, 'raw_material')
                const [stockRecord] = await tx
                    .select()
                    .from(stock)
                    .where(and(eq(stock.productId, item.ingredientId), eq(stock.locationId, warehouse.id)))

                const availableQty = Number(stockRecord?.quantityOnHand || 0)
                if (availableQty < requiredQty) {
                    shortages.push({
                        ingredientId: item.ingredientId,
                        ingredientName: item.ingredient.name,
                        required: requiredQty,
                        available: availableQty,
                        unit: item.ingredient.unit,
                    })
                }

                const costPerUnit = Number(item.ingredient.cost || 0)
                productionCost += costPerUnit * requiredQty
            }

            if (shortages.length > 0) {
                throw {
                    message: "Stock insuffisant",
                    status: 400,
                    details: shortages,
                }
            }

            // 2. Create Production Run (start only)
            const [run] = await tx
                .insert(productionRuns)
                .values({
                    recipeId,
                    plannedQuantity: quantity.toString(),
                    actualQuantity: null,
                    productionCost: productionCost.toFixed(2),
                    status: "in_progress",
                    producedBy: userId,
                    batchNumber: `BATCH-${Date.now()}`,
                    endDate: null,
                })
                .returning()

            // 3. Deduct Raw Materials (Ingredients)
            for (const item of recipe.ingredients) {
                const requiredQty = Number(item.quantity) * productionRatio
                const warehouse = await resolveWarehouse(tx, 'raw_material')

                const [stockRecord] = await tx
                    .select()
                    .from(stock)
                    .where(and(eq(stock.productId, item.ingredientId), eq(stock.locationId, warehouse.id)))

                if (stockRecord) {
                    await tx
                        .update(stock)
                        .set({
                            quantityOnHand: sql`${stock.quantityOnHand} - ${requiredQty}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(stock.id, stockRecord.id))
                } else {
                    await tx.insert(stock).values({
                        productId: item.ingredientId,
                        locationId: warehouse.id,
                        quantityOnHand: (-requiredQty).toString(),
                        quantityReserved: "0",
                        reorderLevel: (item.ingredient.minStock || 0).toString(),
                        reorderQuantity: "20",
                        updatedAt: new Date(),
                    })
                }

                await tx
                    .update(products)
                    .set({
                        stock: sql`${products.stock} - ${requiredQty}`,
                    })
                    .where(eq(products.id, item.ingredientId))

                // Log Movement
                await tx.insert(stockMovements).values({
                    productId: item.ingredientId,
                    productName: item.ingredient.name,
                    type: "out",
                    quantity: String(requiredQty),
                    userId: userId,
                    locationId: stockRecord?.locationId || null,
                    referenceId: run.id,
                    referenceType: "production_run",
                    notes: `Used in production run ${run.batchNumber}`,
                })
            }

            return run
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Failed to record production run:", error)
        if (error?.status && error?.details) {
            return NextResponse.json({ error: error.message, details: error.details }, { status: error.status })
        }
        return NextResponse.json({ error: error.message || "Failed to record production run" }, { status: 500 })
    }
}
