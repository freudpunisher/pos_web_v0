import { NextResponse } from "next/server"
import db from "@/lib/db"
import { stock, products, locations, purchaseOrders, transactions, transactionItems } from "@/lib/db/schema"
import { sql, eq, and, gte, lte } from "drizzle-orm"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const endDate = searchParams.get("endDate") || new Date().toISOString()
        const start = new Date(startDate)
        const end = new Date(endDate)

        // 1. Stock Value by Location Type
        const stockValueByLocation = await db
            .select({
                locationType: locations.type,
                value: sql<number>`sum(${stock.quantityOnHand} * ${products.cost}::numeric)`,
                totalQty: sql<number>`sum(${stock.quantityOnHand})`,
                productCount: sql<number>`count(distinct ${stock.productId})`,
            })
            .from(stock)
            .innerJoin(products, eq(stock.productId, products.id))
            .innerJoin(locations, eq(stock.locationId, locations.id))
            .groupBy(locations.type)
            .orderBy(locations.type)

        const totalStockValue = stockValueByLocation.reduce((acc, row) => acc + Number(row.value || 0), 0)

        const stockByLocation: Record<string, { value: number; totalQty: number; productCount: number }> = {}
        for (const row of stockValueByLocation) {
            stockByLocation[row.locationType] = {
                value: Number(row.value || 0),
                totalQty: Number(row.totalQty || 0),
                productCount: Number(row.productCount || 0),
            }
        }

        // 2. Procurement (received purchase orders)
        const procurementResult = await db
            .select({
                total: sql<number>`sum(${purchaseOrders.total}::numeric)`,
                count: sql<number>`count(*)`,
            })
            .from(purchaseOrders)
            .where(and(
                gte(purchaseOrders.date, start),
                lte(purchaseOrders.date, end),
                eq(purchaseOrders.status, "received"),
            ))

        const procurement = {
            total: Number(procurementResult[0]?.total || 0),
            count: Number(procurementResult[0]?.count || 0),
        }

        // 3. Sales & COGS from completed transactions
        const salesResult = await db
            .select({
                total: sql<number>`sum(${transactions.total}::numeric)`,
                count: sql<number>`count(*)`,
            })
            .from(transactions)
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.type, "sale"),
                eq(transactions.status, "completed"),
            ))

        const sales = {
            total: Number(salesResult[0]?.total || 0),
            count: Number(salesResult[0]?.count || 0),
        }

        // 4. COGS: sum of (transactionItems.quantity * products.cost) for completed sales
        const cogsResult = await db
            .select({
                total: sql<number>`sum(${transactionItems.quantity}::numeric * ${products.cost}::numeric)`,
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.type, "sale"),
                eq(transactions.status, "completed"),
            ))

        const cogs = Number(cogsResult[0]?.total || 0)

        // 5. Sales & COGS by product type (drink = bar, food/ingredient = cuisine)
        const salesByProductType = await db
            .select({
                productType: products.productType,
                revenue: sql<number>`sum(${transactionItems.quantity}::numeric * ${transactionItems.price}::numeric)`,
                cogs: sql<number>`sum(${transactionItems.quantity}::numeric * ${products.cost}::numeric)`,
                count: sql<number>`count(distinct ${transactions.id})`,
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.type, "sale"),
                eq(transactions.status, "completed"),
            ))
            .groupBy(products.productType)

        const barRevenue = salesByProductType
            .filter((r) => r.productType === "drink")
            .reduce((acc, r) => acc + Number(r.revenue || 0), 0)
        const barCogs = salesByProductType
            .filter((r) => r.productType === "drink")
            .reduce((acc, r) => acc + Number(r.cogs || 0), 0)
        const barCount = salesByProductType
            .filter((r) => r.productType === "drink")
            .reduce((acc, r) => acc + Number(r.count || 0), 0)

        const cuisineRevenue = salesByProductType
            .filter((r) => r.productType !== "drink")
            .reduce((acc, r) => acc + Number(r.revenue || 0), 0)
        const cuisineCogs = salesByProductType
            .filter((r) => r.productType !== "drink")
            .reduce((acc, r) => acc + Number(r.cogs || 0), 0)
        const cuisineCount = salesByProductType
            .filter((r) => r.productType !== "drink")
            .reduce((acc, r) => acc + Number(r.count || 0), 0)

        return NextResponse.json({
            period: { start, end },
            stockValue: {
                total: totalStockValue,
                byLocation: stockByLocation,
            },
            procurement,
            sales: {
                total: sales.total,
                count: sales.count,
            },
            profit: {
                revenue: sales.total,
                cogs,
                grossProfit: sales.total - cogs,
                margin: sales.total > 0 ? ((sales.total - cogs) / sales.total) * 100 : 0,
            },
            bar: {
                stockValue: Number(stockByLocation["bar"]?.value || 0),
                stockQty: Number(stockByLocation["bar"]?.totalQty || 0),
                revenue: barRevenue,
                cogs: barCogs,
                profit: barRevenue - barCogs,
                margin: barRevenue > 0 ? ((barRevenue - barCogs) / barRevenue) * 100 : 0,
                transactionCount: barCount,
            },
            cuisine: {
                stockValue: Number(stockByLocation["kitchen"]?.value || 0),
                stockQty: Number(stockByLocation["kitchen"]?.totalQty || 0),
                revenue: cuisineRevenue,
                cogs: cuisineCogs,
                profit: cuisineRevenue - cuisineCogs,
                margin: cuisineRevenue > 0 ? ((cuisineRevenue - cuisineCogs) / cuisineRevenue) * 100 : 0,
                transactionCount: cuisineCount,
            },
        })
    } catch (error) {
        console.error("Failed to fetch finance overview:", error)
        return NextResponse.json({ error: "Failed to fetch finance overview" }, { status: 500 })
    }
}
