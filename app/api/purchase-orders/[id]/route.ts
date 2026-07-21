import { NextResponse } from "next/server";
import db from "@/lib/db";
import {
  purchaseOrders,
  purchaseOrderItems,
  suppliers,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const [order] = await db
      .select({
        id: purchaseOrders.id,
        date: purchaseOrders.date,
        status: purchaseOrders.status,
        total: purchaseOrders.total,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(eq(purchaseOrders.id, id))
      .limit(1);

    if (!order) {
      return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, id));

    return NextResponse.json({ ...order, items });
  } catch (err) {
    console.error("Error fetching purchase order:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { supplierId, items, total } = body;

  try {
    await db.transaction(async (tx) => {
      // 1. Update order details
      await tx
        .update(purchaseOrders)
        .set({
          supplierId,
          total,
          // updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, id));

      // 2. Update items - easiest strategy: delete all for this PO and insert new ones
      // Use delete where purchaseOrderId = id
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));

      if (items && items.length > 0) {
        const newItems = items.map((item: any) => ({
          purchaseOrderId: id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          cost: item.cost,
        }));
        await tx.insert(purchaseOrderItems).values(newItems);
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error updating purchase order:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update order" },
      { status: 500 }
    );
  }
}