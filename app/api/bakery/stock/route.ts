import { NextResponse } from "next/server"
import db from "@/lib/db"
import { products, stock, stockMovements } from "@/lib/db/schema"
import { and, eq, sql } from "drizzle-orm"
import { resolveWarehouse } from "@/lib/db/location-utils"

export async function GET() {
  try {
    const rows = await db
      .select({
        stockId: stock.id,
        productId: products.id,
        name: products.name,
        sku: products.sku,
        unit: products.unit,
        sector: products.sector,
        type: products.type,
        quantityOnHand: stock.quantityOnHand,
        reorderLevel: stock.reorderLevel,
        reorderQuantity: stock.reorderQuantity,
        updatedAt: stock.updatedAt,
      })
      .from(stock)
      .leftJoin(products, eq(stock.productId, products.id))
      .where(and(eq(products.type, "finished_good"), eq(products.sector, "Boulangerie")))

    return NextResponse.json(rows)
  } catch (error) {
    console.error("Failed to fetch bakery stock:", error)
    return NextResponse.json({ error: "Failed to fetch bakery stock" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, quantity, userId, note } = body

    const numericQty = Number(quantity || 0)
    if (!productId || !numericQty || numericQty <= 0) {
      return NextResponse.json({ error: "productId and positive quantity are required" }, { status: 400 })
    }
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    await db.transaction(async (tx) => {
      const [product] = await tx.select().from(products).where(eq(products.id, productId))
      if (!product) throw new Error("Product not found")

      if (product.type !== "finished_good" || product.sector !== "Boulangerie") {
        throw new Error("Product must be a bakery finished good")
      }

      const warehouse = await resolveWarehouse(tx, 'food')
      const [stockRecord] = await tx.select().from(stock).where(and(eq(stock.productId, productId), eq(stock.locationId, warehouse.id)))

      if (stockRecord) {
        await tx
          .update(stock)
          .set({
            quantityOnHand: sql`${stock.quantityOnHand} + ${numericQty}`,
            updatedAt: new Date(),
          })
          .where(eq(stock.id, stockRecord.id))
      } else {
        await tx.insert(stock).values({
          productId,
          locationId: warehouse.id,
          quantityOnHand: numericQty.toString(),
          quantityReserved: "0",
          reorderLevel: (product.minStock || 0).toString(),
          reorderQuantity: "20",
          updatedAt: new Date(),
        })
      }

      await tx
        .update(products)
        .set({
          stock: sql`${products.stock} + ${numericQty}`,
        })
        .where(eq(products.id, productId))

      const [bakeryStock] = await tx.select().from(stock).where(eq(stock.productId, productId)).limit(1)
      await tx.insert(stockMovements).values({
        productId,
        productName: product.name,
        type: "adjustment",
        quantity: String(numericQty),
        userId,
        locationId: bakeryStock?.locationId || null,
        referenceId: null,
        referenceType: "bakery",
        notes: note || "Production entry",
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Failed to add bakery stock:", error)
    return NextResponse.json({ error: error.message || "Failed to add bakery stock" }, { status: 500 })
  }
}
