import { NextResponse } from "next/server"
import db from "@/lib/db"
import { inventory, inventoryItems, products, stock, stockAdjustments, stockMovements, locations } from "@/lib/db/schema"
import { eq, sql } from "drizzle-orm"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { productId, physicalQuantity } = body

    const physicalQty = Number(physicalQuantity)
    if (!productId || !Number.isFinite(physicalQty) || physicalQty < 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const session = await db.query.inventory.findFirst({
      where: eq(inventory.id, id),
    })

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }
    if (session.status === "reconciled") {
      return NextResponse.json({ error: "Session already reconciled" }, { status: 400 })
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId))
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    const [currentStock] = await db.select().from(stock).where(eq(stock.productId, productId))
    const fallbackLogicalQty = Number(currentStock?.quantityOnHand ?? product.stock ?? 0)

    let logicalQty = fallbackLogicalQty
    let variance = 0

    await db.transaction(async (tx) => {
      const [existingItem] = await tx
        .select()
        .from(inventoryItems)
        .where(sql`${inventoryItems.inventoryId} = ${id} AND ${inventoryItems.productId} = ${productId}`)

      let sessionItemId = existingItem?.id
      if (!sessionItemId) {
        const [newItem] = await tx
          .insert(inventoryItems)
          .values({
            inventoryId: id,
            productId,
            quantityInStock: fallbackLogicalQty.toString(),
            physicalQuantity: "0",
            variance: (-fallbackLogicalQty).toString(),
          })
          .returning({ id: inventoryItems.id })
        sessionItemId = newItem.id
      }
      if (!sessionItemId) throw new Error("Failed to initialize inventory item")

      logicalQty = Number(existingItem?.quantityInStock ?? fallbackLogicalQty)
      variance = physicalQty - logicalQty

      await tx
        .update(inventoryItems)
        .set({
          physicalQuantity: physicalQty.toString(),
          variance: variance.toString(),
        })
        .where(eq(inventoryItems.id, sessionItemId))

      const warehouse = await resolveWarehouse(tx, product.productType || "ingredient")
      const [stockRow] = await tx.select().from(stock).where(and(eq(stock.productId, productId), eq(stock.locationId, warehouse.id)))

      if (stockRow) {
        await tx
          .update(stock)
          .set({
            quantityOnHand: physicalQty.toString(),
            lastCountedDate: new Date(),
            updatedAt: new Date(),
          })
          .where(and(eq(stock.productId, productId), eq(stock.locationId, warehouse.id)))
      } else {
        await tx.insert(stock).values({
          productId,
          locationId: session.locationId || (await tx.select({ id: locations.id }).from(locations).limit(1))[0]?.id || "",
          quantityOnHand: physicalQty.toString(),
          quantityReserved: "0",
          reorderLevel: Number(product.minStock || 10),
          reorderQuantity: 20,
          lastCountedDate: new Date(),
          updatedAt: new Date(),
        })
      }

      await tx.update(products).set({ stock: physicalQty.toString() }).where(eq(products.id, productId))

      if (variance !== 0) {
        await tx.insert(stockMovements).values({
          productId,
          productName: product.name || "Unknown",
          type: "inventory",
          quantity: variance.toString(),
          userId: session.countedBy,
          locationId: session.locationId,
          referenceId: id,
          referenceType: "inventory_session",
          notes: `Inventory quick adjust (Session ${id})`,
        })

        await tx.insert(stockAdjustments).values({
          productId,
          quantityChange: variance.toString(),
          adjustmentType: variance < 0 ? "loss" : "correction",
          reason: variance < 0 ? "Physical inventory loss" : "Physical inventory surplus",
          createdBy: session.countedBy,
          notes: `Quick adjust session ${id} | logical=${logicalQty} physical=${physicalQty} variance=${variance}`,
        })
      }

      // Neutralize the session line to avoid double application on final reconcile
      await tx
        .update(inventoryItems)
        .set({
          quantityInStock: physicalQty.toString(),
          physicalQuantity: physicalQty.toString(),
          variance: "0",
        })
        .where(eq(inventoryItems.id, sessionItemId))

      await tx.update(inventory).set({ updatedAt: new Date() }).where(eq(inventory.id, id))
    })

    return NextResponse.json({
      message: "Stock adjusted successfully",
      productId,
      logicalQty,
      physicalQty,
      variance,
      loss: variance < 0 ? Math.abs(variance) : 0,
    })
  } catch (error) {
    console.error("Failed to adjust inventory item:", error)
    return NextResponse.json({ error: "Failed to adjust inventory item" }, { status: 500 })
  }
}
