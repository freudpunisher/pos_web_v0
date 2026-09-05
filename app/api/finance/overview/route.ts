import { NextResponse } from "next/server"
import db from "@/lib/db"
import { stock, products, locations, purchaseOrders, transactions, transactionItems, productTypes, expenses } from "@/lib/db/schema"
import { sql, eq, and, gte, lte } from "drizzle-orm"
import { requireManagerOrAdmin } from "@/lib/auth-guard"

export async function GET(request: Request) {
    const authError = await requireManagerOrAdmin()
    if (authError) return authError

    try {
        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const endDate = searchParams.get("endDate") || new Date().toISOString()
        const locationId = searchParams.get("locationId") || undefined
        const start = new Date(startDate)
        const end = new Date(endDate)

        const txFilter = [
            gte(transactions.date, start),
            lte(transactions.date, end),
            eq(transactions.type, "sale"),
            eq(transactions.status, "completed"),
            ...(locationId ? [eq(transactions.locationId, locationId)] : []),
        ]

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
            .where(and(...txFilter))

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
            .where(and(...txFilter))

        const cogs = Number(cogsResult[0]?.total || 0)

        // 5. Sales by product type (for retail reporting)
        const salesByProductType = await db
            .select({
                productType: productTypes.name,
                revenue: sql<number>`sum(${transactionItems.quantity}::numeric * ${transactionItems.price}::numeric)`,
                cogs: sql<number>`sum(${transactionItems.quantity}::numeric * ${products.cost}::numeric)`,
                count: sql<number>`count(distinct ${transactions.id})`,
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .innerJoin(productTypes, eq(products.productTypeId, productTypes.id))
            .where(and(...txFilter))
            .groupBy(productTypes.name)

        const byType: Record<string, { revenue: number; cogs: number; count: number }> = {}
        for (const row of salesByProductType) {
            byType[row.productType] = {
                revenue: Number(row.revenue || 0),
                cogs: Number(row.cogs || 0),
                count: Number(row.count || 0),
            }
        }

        // 6. Expenses (operational outflows) on the period
        const expensesResult = await db
            .select({
                total: sql<number>`sum(${expenses.amount}::numeric)`,
                count: sql<number>`count(*)`,
            })
            .from(expenses)
            .where(and(
                gte(expenses.date, start),
                lte(expenses.date, end),
            ))

        const expenseStats = {
            total: Number(expensesResult[0]?.total || 0),
            count: Number(expensesResult[0]?.count || 0),
        }

        const grossProfit = sales.total - cogs
        const cashFlowNet = sales.total - procurement.total - expenseStats.total

        return NextResponse.json({
            period: { start, end },
            stockValue: {
                total: totalStockValue,
                byLocation: stockByLocation,
            },
            procurement,
            expenses: expenseStats,
            sales: {
                total: sales.total,
                count: sales.count,
            },
            profit: {
                revenue: sales.total,
                cogs,
                grossProfit,
                margin: sales.total > 0 ? (grossProfit / sales.total) * 100 : 0,
            },
            cashFlow: {
                revenue: sales.total,
                purchases: procurement.total,
                expenses: expenseStats.total,
                net: cashFlowNet,
            },
            byProductType: byType,
        })
    } catch (error) {
        console.error("Failed to fetch finance overview:", error)
        return NextResponse.json({ error: "Failed to fetch finance overview" }, { status: 500 })
    }
}
