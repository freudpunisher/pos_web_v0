import { NextResponse } from "next/server"
import db from "@/lib/db"
import { recipes, recipeIngredients, products, stock, stockMovements } from "@/lib/db/schema"
import { eq, desc, sql } from "drizzle-orm"

export async function GET(request: Request) {
    try {
        const recipesList = await db.query.recipes.findMany({
            with: {
                product: true,
                ingredients: {
                    with: {
                        ingredient: true
                    }
                }
            },
            orderBy: [desc(recipes.name)]
        })

        return NextResponse.json(recipesList)
    } catch (error) {
        console.error("Failed to fetch recipes:", error)
        return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { productId, name, description, yieldQuantity, grs, ingredients, userId } = body

        if (!productId || !name || !ingredients || !Array.isArray(ingredients)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const result = await db.transaction(async (tx) => {
            const shortages: { ingredientId: string; ingredientName: string; required: number; available: number; unit?: string | null }[] = []

            // Create Recipe
            const [newRecipe] = await tx
                .insert(recipes)
                .values({
                    productId,
                    name,
                    description,
                    grs: grs ? grs.toString() : null,
                    yieldQuantity: yieldQuantity?.toString() || "1",
                })
                .returning()

            // Add Ingredients
            if (ingredients.length > 0) {
                await tx.insert(recipeIngredients).values(
                    ingredients.map((ing: any) => ({
                        recipeId: newRecipe.id,
                        ingredientId: ing.ingredientId, // raw material id
                        quantity: ing.quantity.toString()
                    }))
                )
            }

            for (const ing of ingredients) {
                const requiredQty = Number(ing.quantity || 0)
                const [stockRecord] = await tx
                    .select()
                    .from(stock)
                    .where(eq(stock.productId, ing.ingredientId))

                const availableQty = Number(stockRecord?.quantityOnHand || 0)
                if (availableQty < requiredQty) {
                    const [product] = await tx.select().from(products).where(eq(products.id, ing.ingredientId))
                    shortages.push({
                        ingredientId: ing.ingredientId,
                        ingredientName: product?.name || "Ingrédient",
                        required: requiredQty,
                        available: availableQty,
                        unit: product?.unit,
                    })
                }
            }

            if (shortages.length > 0) {
                throw { message: "Stock insuffisant", status: 400, details: shortages }
            }

            for (const ing of ingredients) {
                const requiredQty = Number(ing.quantity || 0)
                const [product] = await tx.select().from(products).where(eq(products.id, ing.ingredientId))

                await tx
                    .update(stock)
                    .set({
                        quantityOnHand: sql`${stock.quantityOnHand} - ${requiredQty}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(stock.productId, ing.ingredientId))

                await tx
                    .update(products)
                    .set({
                        stock: sql`${products.stock} - ${requiredQty}`,
                    })
                    .where(eq(products.id, ing.ingredientId))

                if (userId) {
                    const [ingredientStock] = await tx.select().from(stock).where(eq(stock.productId, ing.ingredientId)).limit(1)
                    await tx.insert(stockMovements).values({
                        productId: ing.ingredientId,
                        productName: product?.name || "Ingrédient",
                        type: "out",
                        quantity: String(requiredQty),
                        userId,
                        locationId: ingredientStock?.locationId || null,
                        referenceId: newRecipe.id,
                        referenceType: "recipe",
                        notes: `Consumed for recipe ${newRecipe.id}`,
                    })
                }
            }

            return newRecipe
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to create recipe:", error)
        if ((error as any)?.status && (error as any)?.details) {
            return NextResponse.json({ error: (error as any).message, details: (error as any).details }, { status: (error as any).status })
        }
        return NextResponse.json({ error: "Failed to create recipe" }, { status: 500 })
    }
}
