import { NextResponse } from "next/server"
import db from "@/lib/db"
import { productionRuns, recipes, stock, stockMovements, products } from "@/lib/db/schema"
import { eq, sql, and } from "drizzle-orm"
import { resolveWarehouse } from "@/lib/db/location-utils"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const { quantity, userId } = body

    const numericQty = Number(quantity || 0)
    if (!numericQty || numericQty <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    const result = await db.transaction(async (tx) => {
      const [run] = await tx.select().from(productionRuns).where(eq(productionRuns.id, id))
      if (!run) {
        return { error: "Production run not found", status: 404 }
      }
      if (run.status !== "in_progress") {
        return { error: "Production run already completed", status: 400 }
      }

      const recipe = await tx.query.recipes.findFirst({
        where: eq(recipes.id, run.recipeId),
        with: { product: true },
      })
      if (!recipe) {
        return { error: "Recipe not found", status: 404 }
      }

      const warehouse = await resolveWarehouse(tx, 'food') // Or derived from product.productType
      const [finishedStock] = await tx
        .select()
        .from(stock)
        .where(and(eq(stock.productId, recipe.productId), eq(stock.locationId, warehouse.id)))

      if (finishedStock) {
        await tx
          .update(stock)
          .set({
            quantityOnHand: sql`${stock.quantityOnHand} + ${numericQty}`,
            updatedAt: new Date(),
          })
          .where(eq(stock.id, finishedStock.id))
      } else {
        await tx.insert(stock).values({
          productId: recipe.productId,
          locationId: warehouse.id,
          quantityOnHand: numericQty.toString(),
          quantityReserved: "0",
          reorderLevel: (recipe.product?.minStock ?? 0).toString(),
          reorderQuantity: "20",
          updatedAt: new Date(),
        })
      }

      await tx
        .update(products)
        .set({
          stock: sql`${products.stock} + ${numericQty}`,
        })
        .where(eq(products.id, recipe.productId))

      await tx.insert(stockMovements).values({
        productId: recipe.productId,
        productName: recipe.product?.name || "Produit fini",
        type: "in",
        quantity: String(numericQty),
        userId,
        locationId: finishedStock?.locationId || null,
        referenceId: id,
        referenceType: "production_run",
        notes: `Produced in run ${run.batchNumber || run.id}`,
      })

      await tx
        .update(productionRuns)
        .set({
          actualQuantity: numericQty.toString(),
          status: "completed",
          endDate: new Date(),
        })
        .where(eq(productionRuns.id, id))

      return { success: true }
    })

    if ((result as any).error) {
      return NextResponse.json({ error: (result as any).error }, { status: (result as any).status })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Failed to complete production run:", error)
    return NextResponse.json({ error: error.message || "Failed to complete production run" }, { status: 500 })
  }
}
