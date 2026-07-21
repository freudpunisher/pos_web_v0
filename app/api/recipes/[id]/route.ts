import { NextResponse } from "next/server"
import db from "@/lib/db"
import { recipes, recipeIngredients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const { productId, name, description, yieldQuantity, grs, ingredients } = body

    if (!productId || !name || !ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(recipes)
        .set({
          productId,
          name,
          description,
          grs: grs ? grs.toString() : null,
          yieldQuantity: yieldQuantity?.toString() || "1",
        })
        .where(eq(recipes.id, id))
        .returning()

      if (!updated) {
        return null
      }

      await tx.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id))
      if (ingredients.length > 0) {
        await tx.insert(recipeIngredients).values(
          ingredients.map((ing: any) => ({
            recipeId: id,
            ingredientId: ing.ingredientId,
            quantity: ing.quantity.toString(),
          }))
        )
      }

      return updated
    })

    if (!result) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to update recipe:", error)
    return NextResponse.json({ error: "Failed to update recipe" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const [deleted] = await db.delete(recipes).where(eq(recipes.id, id)).returning()
    if (!deleted) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete recipe:", error)
    return NextResponse.json({ error: "Failed to delete recipe" }, { status: 500 })
  }
}
