// app/api/purchases/route.ts
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import db from "@/lib/db";
import { purchaseOrders, purchaseOrderItems, suppliers, products, stock, stockMovements } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, lt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { resolveWarehouse } from "@/lib/db/location-utils";

function fmt(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

// GET - list orders with optional date range filter
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const conditions = []
    if (dateFrom) {
      const d = new Date(dateFrom)
      d.setHours(0, 0, 0, 0)
      conditions.push(gte(purchaseOrders.date, sql`${fmt(d)}::timestamp`))
    }
    if (dateTo) {
      const d = new Date(dateTo)
      d.setHours(23, 59, 59, 999)
      conditions.push(lte(purchaseOrders.date, sql`${fmt(d)}::timestamp`))
    }

    const orders = await db
      .select({
        id: purchaseOrders.id,
        date: purchaseOrders.date,
        status: purchaseOrders.status,
        total: purchaseOrders.total,
        supplierId: purchaseOrders.supplierId,
        supplierName: suppliers.name,
        sector: purchaseOrders.sector,
        purchaseRef: purchaseOrders.purchaseRef,
      })
      .from(purchaseOrders)
      .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(purchaseOrders.date));

    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await db
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, order.id));
        return { ...order, items };
      })
    );

    return NextResponse.json(ordersWithItems);
  } catch (error) {
    console.error("Failed to fetch purchase orders:", error);
    return NextResponse.json({ error: "Failed to fetch purchase orders" }, { status: 500 });
  }
}

// POST - CREATE (now always pending)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { supplierId, items, total, userId, sector } = body;

    if (!supplierId || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      // 1. Create Purchase Order → pending by default
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const periodStart = new Date(year, now.getMonth(), 1);
      const periodEnd = new Date(year, now.getMonth() + 1, 1);
      const [countRow] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(purchaseOrders)
        .where(and(gte(purchaseOrders.date, periodStart), lt(purchaseOrders.date, periodEnd)));
      const seq = String(Number(countRow?.count || 0) + 1).padStart(3, "0");
      const purchaseRef = `ACH-${year}-${month}-${seq}`;

      const [newOrder] = await tx
        .insert(purchaseOrders)
        .values({
          supplierId,
          total: total.toFixed(2),
          status: "pending",
          sector: sector || "Alimentation",
          purchaseRef,
        })
        .returning();

      // 2. Insert items (no stock change yet)
      for (const item of items) {
        await tx.insert(purchaseOrderItems).values({
          purchaseOrderId: newOrder.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          cost: item.cost.toFixed(2),
        });
      }

      return newOrder;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to create purchase order:", error);
    return NextResponse.json({ error: "Failed to create purchase order" }, { status: 500 });
  }
}

// ────────────────────────────────────────────────
// NEW: PATCH - update order (only if pending)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, supplierId, items, total } = body;

    if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

    const updated = await db.transaction(async (tx) => {
      // Check current status
      const [order] = await tx
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, id));

      if (!order) return null;
      if (order.status !== "pending") {
        throw new Error("Only pending orders can be edited");
      }

      // Update header
      await tx
        .update(purchaseOrders)
        .set({
          supplierId: supplierId ?? order.supplierId,
          total: total?.toFixed(2) ?? order.total,
        })
        .where(eq(purchaseOrders.id, id));

      // Delete old items
      await tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id));

      // Insert new items
      if (items?.length) {
        for (const item of items) {
          await tx.insert(purchaseOrderItems).values({
            purchaseOrderId: id,
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            cost: item.cost.toFixed(2),
          });
        }
      }

      return { id };
    });

    if (!updated) {
      return NextResponse.json({ error: "Order not found or not editable" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update purchase order:", error);
    return NextResponse.json({ error: error.message || "Failed to update" }, { status: 500 });
  }
}

// NEW: POST /receive - mark as received + update stock
export async function receive(request: Request) {
  // Better to use /api/purchases/[id]/receive or separate route
  // But for simplicity, let's assume POST with { id, userId }
  try {
    const { id, userId } = await request.json();

    if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

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

      // Update stock for each item
      for (const item of items) {
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
            stock: sql`${products.stock} + ${item.quantity}`,
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
              quantityOnHand: sql`${stock.quantityOnHand} + ${item.quantity}`,
              updatedAt: new Date(),
            })
            .where(eq(stock.id, stockRecord.id));
        } else {
          await tx.insert(stock).values({
            productId: item.productId,
            locationId: warehouse.id,
            quantityOnHand: String(Math.round(Number(item.quantity) || 0)),
          });
        }

        // Stock movement
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

      // Finally mark as received
      await tx
        .update(purchaseOrders)
        .set({ status: "received" })
        .where(eq(purchaseOrders.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to receive order:", error);
    return NextResponse.json({ error: error.message || "Failed" }, { status: 500 });
  }
}

// NEW: POST /cancel
export async function cancel(request: Request) {
  try {
    const { id } = await request.json();

    await db.transaction(async (tx) => {
      const [order] = await tx
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, id));

      if (!order) throw new Error("Not found");
      if (order.status !== "pending") throw new Error("Cannot cancel non-pending order");

      await tx
        .update(purchaseOrders)
        .set({ status: "cancelled" })
        .where(eq(purchaseOrders.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
