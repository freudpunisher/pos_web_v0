import { NextResponse } from "next/server"
import db from "@/lib/db"
import { notifications, stock, products } from "@/lib/db/schema"
import { eq, and, desc, sql, ne } from "drizzle-orm"

export async function GET() {
    try {
        const all = await db
            .select()
            .from(notifications)
            .orderBy(desc(notifications.createdAt))
            .limit(50)

        return NextResponse.json(all)
    } catch (error) {
        console.error("Failed to fetch notifications:", error)
        return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
    }
}

export async function POST() {
    try {
        // Scan stock for low stock items and create notifications
        const lowStockItems = await db
            .select({
                productId: stock.productId,
                productName: products.name,
                quantityOnHand: stock.quantityOnHand,
                reorderLevel: stock.reorderLevel,
                locationId: stock.locationId,
            })
            .from(stock)
            .innerJoin(products, eq(products.id, stock.productId))
            .where(
                and(
                    sql`${stock.quantityOnHand} <= ${stock.reorderLevel}`,
                    sql`${stock.quantityOnHand} > 0`,
                    ne(products.productType, "food")
                )
            )

        const outOfStockItems = await db
            .select({
                productId: stock.productId,
                productName: products.name,
                locationId: stock.locationId,
            })
            .from(stock)
            .innerJoin(products, eq(products.id, stock.productId))
            .where(
                and(
                    eq(stock.quantityOnHand, "0"),
                    ne(products.productType, "food")
                )
            )

        // Create notifications for low stock
        const created: any[] = []
        for (const item of lowStockItems) {
            const [existing] = await db
                .select()
                .from(notifications)
                .where(
                    and(
                        eq(notifications.type, "low_stock"),
                        eq(notifications.relatedId, item.productId),
                        eq(notifications.read, false),
                    )
                )
                .limit(1)

            if (!existing) {
                const [n] = await db.insert(notifications).values({
                    type: "low_stock",
                    message: `${item.productName} is low on stock (${item.quantityOnHand} left, reorder at ${item.reorderLevel})`,
                    relatedId: item.productId,
                }).returning()
                created.push(n)
            }
        }

        // Create notifications for out of stock
        for (const item of outOfStockItems) {
            const [existing] = await db
                .select()
                .from(notifications)
                .where(
                    and(
                        eq(notifications.type, "out_of_stock"),
                        eq(notifications.relatedId, item.productId),
                        eq(notifications.read, false),
                    )
                )
                .limit(1)

            if (!existing) {
                const [n] = await db.insert(notifications).values({
                    type: "out_of_stock",
                    message: `${item.productName} is out of stock!`,
                    relatedId: item.productId,
                }).returning()
                created.push(n)
            }
        }

        return NextResponse.json({ created: created.length })
    } catch (error) {
        console.error("Failed to scan stock:", error)
        return NextResponse.json({ error: "Failed to scan stock" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const { ids, markAll, read } = await request.json()
        const readStatus = read !== undefined ? read : true

        if (markAll) {
            await db.update(notifications).set({ read: readStatus })
        } else if (Array.isArray(ids)) {
            for (const id of ids) {
                await db.update(notifications).set({ read: readStatus }).where(eq(notifications.id, id))
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("Failed to update notifications:", error)
        return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
    }
}

export async function PATCH(request: Request) {
    try {
        const { id, read, action } = await request.json()

        if (action === "delete" && id) {
            await db.delete(notifications).where(eq(notifications.id, id))
            return NextResponse.json({ success: true })
        }

        if (id && read !== undefined) {
            await db.update(notifications).set({ read }).where(eq(notifications.id, id))
            return NextResponse.json({ success: true })
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    } catch (error) {
        console.error("Failed to patch notification:", error)
        return NextResponse.json({ error: "Failed to patch notification" }, { status: 500 })
    }
}
