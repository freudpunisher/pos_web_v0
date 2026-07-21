import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
    purchaseOrders,
    purchaseOrderItems,
    products,
    stock,
    stockMovements,
} from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { resolveWarehouse } from "@/lib/db/location-utils";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    try {
        await db.transaction(async (tx) => {
            const [order] = await tx
                .select()
                .from(purchaseOrders)
                .where(eq(purchaseOrders.id, id));

            if (!order) throw new Error("Order not found");
            if (order.status !== "pending") throw new Error("Order already processed");

            const items = await tx
                .select()
                .from(purchaseOrderItems)
                .where(eq(purchaseOrderItems.purchaseOrderId, id));

            for (const item of items) {
                const qty = Math.round(Number(item.quantity) || 0)
                const [product] = await tx
                    .select({
                        productType: products.productType,
                        minStock: products.minStock
                    })
                    .from(products)
                    .where(eq(products.id, item.productId))
                    .limit(1)
                const warehouse = await resolveWarehouse(tx, product?.productType || "ingredient")

                // Update legacy products.stock
                await tx
                    .update(products)
                    .set({
                        stock: sql`${products.stock} + ${qty}`,
                    })
                    .where(eq(products.id, item.productId));

                // Update warehouse stock
                const [stockRecord] = await tx
                    .select()
                    .from(stock)
                    .where(
                        sql`${stock.productId} = ${item.productId} AND ${stock.locationId} = ${warehouse.id}`
                    )
                    .limit(1);

                if (stockRecord) {
                    await tx
                        .update(stock)
                        .set({
                            quantityOnHand: sql`${stock.quantityOnHand} + ${qty}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(stock.id, stockRecord.id));
                } else {
                    await tx.insert(stock).values({
                        productId: item.productId,
                        locationId: warehouse.id,
                        quantityOnHand: String(qty),
                    });
                }

                // Record movement
                await tx.insert(stockMovements).values({
                    productId: item.productId,
                    productName: item.productName,
                    type: "in",
                    quantity: item.quantity,
                    userId,
                    locationId: warehouse.id,
                    referenceId: id,
                    referenceType: "purchase_order",
                    notes: `Received from PO ${id} at ${warehouse.name}`,
                });
            }

            // Mark as received
            await tx
                .update(purchaseOrders)
                .set({ status: "received" })
                .where(eq(purchaseOrders.id, id));
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to receive order:", error);
        return NextResponse.json(
            { error: error.message || "Failed to receive order" },
            { status: 500 }
        );
    }
}
