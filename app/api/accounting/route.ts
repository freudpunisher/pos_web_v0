import { NextResponse } from "next/server"
import db from "@/lib/db"
import { transactions, purchaseOrders, expenses } from "@/lib/db/schema"
import { sql, and, gte, lte, eq } from "drizzle-orm"

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() // Default to start of month
    const endDate = searchParams.get("endDate") || new Date().toISOString()

    const start = new Date(startDate)
    const end = new Date(endDate)

    try {
        // 1. Fetch Sales (Inflow)
        const salesResult = await db
            .select({
                totalSales: sql<number>`sum(${transactions.total})`,
                count: sql<number>`count(*)`
            })
            .from(transactions)
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.status, 'completed')
            ))

        // 2. Fetch Purchases (Outflow)
        const purchasesResult = await db
            .select({
                totalPurchases: sql<number>`sum(${purchaseOrders.total})`,
                count: sql<number>`count(*)`
            })
            .from(purchaseOrders)
            .where(and(
                gte(purchaseOrders.date, start),
                lte(purchaseOrders.date, end),
                eq(purchaseOrders.status, 'received')
            ))

        // 3. Fetch Expenses (Outflow)
        const expensesResult = await db
            .select({
                totalExpenses: sql<number>`sum(${expenses.amount})`,
                count: sql<number>`count(*)`
            })
            .from(expenses)
            .where(and(
                gte(expenses.date, start),
                lte(expenses.date, end)
            ))

        const totalSales = Number(salesResult[0]?.totalSales || 0)
        const totalPurchases = Number(purchasesResult[0]?.totalPurchases || 0)
        const totalExpenses = Number(expensesResult[0]?.totalExpenses || 0)

        const netProfit = totalSales - totalPurchases - totalExpenses

        return NextResponse.json({
            period: { start, end },
            summary: {
                income: totalSales,
                expenses: totalExpenses + totalPurchases,
                netProfit
            },
            details: {
                sales: totalSales,
                purchases: totalPurchases,
                operationalExpenses: totalExpenses
            }
        })

    } catch (error) {
        console.error("Failed to fetch accounting report:", error)
        return NextResponse.json({ error: "Failed to fetch accounting report" }, { status: 500 })
    }
}
