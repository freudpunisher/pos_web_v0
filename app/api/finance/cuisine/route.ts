import { NextResponse } from "next/server"
import db from "@/lib/db"
import { products, transactions, transactionItems, categories } from "@/lib/db/schema"
import { sql, eq, and, gte, lte } from "drizzle-orm"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        const endDate = searchParams.get("endDate") || new Date().toISOString()
        const start = new Date(startDate)
        const end = new Date(endDate)

        // 1. Global food sales summary
        const foodSales = await db
            .select({
                revenue: sql<number>`sum(${transactionItems.quantity}::numeric * ${transactionItems.price}::numeric)`,
                cogs: sql<number>`sum(${transactionItems.quantity}::numeric * ${products.cost}::numeric)`,
                totalQuantity: sql<number>`sum(${transactionItems.quantity}::numeric)`,
                transactionCount: sql<number>`count(distinct ${transactions.id})`,
                itemCount: sql<number>`sum(${transactionItems.quantity}::numeric)`,
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.type, "sale"),
                eq(transactions.status, "completed"),
                eq(products.productType, "food"),
            ))

        const revenue = Number(foodSales[0]?.revenue || 0)
        const cogs = Number(foodSales[0]?.cogs || 0)
        const grossProfit = revenue - cogs
        const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0
        const totalQuantity = Number(foodSales[0]?.totalQuantity || 0)
        const transactionCount = Number(foodSales[0]?.transactionCount || 0)

        // 2. Sales by category
        const salesByCategory = await db
            .select({
                categoryId: products.categoryId,
                categoryName: categories.name,
                revenue: sql<number>`sum(${transactionItems.quantity}::numeric * ${transactionItems.price}::numeric)`,
                cogs: sql<number>`sum(${transactionItems.quantity}::numeric * ${products.cost}::numeric)`,
                quantity: sql<number>`sum(${transactionItems.quantity}::numeric)`,
                count: sql<number>`count(distinct ${transactions.id})`,
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.type, "sale"),
                eq(transactions.status, "completed"),
                eq(products.productType, "food"),
            ))
            .groupBy(products.categoryId, categories.name)
            .orderBy(sql`sum(${transactionItems.quantity}::numeric * ${transactionItems.price}::numeric) DESC`)

        const categoriesBreakdown = salesByCategory.map((row) => {
            const catRevenue = Number(row.revenue || 0)
            const catCogs = Number(row.cogs || 0)
            return {
                categoryId: row.categoryId,
                categoryName: row.categoryName || "Sans catégorie",
                revenue: catRevenue,
                cogs: catCogs,
                profit: catRevenue - catCogs,
                margin: catRevenue > 0 ? ((catRevenue - catCogs) / catRevenue) * 100 : 0,
                quantity: Number(row.quantity || 0),
                transactionCount: Number(row.count || 0),
            }
        })

        // 3. Top selling food products
        const topProducts = await db
            .select({
                productId: products.id,
                productName: products.name,
                sku: products.sku,
                revenue: sql<number>`sum(${transactionItems.quantity}::numeric * ${transactionItems.price}::numeric)`,
                cogs: sql<number>`sum(${transactionItems.quantity}::numeric * ${products.cost}::numeric)`,
                quantity: sql<number>`sum(${transactionItems.quantity}::numeric)`,
                unitPrice: products.price,
                costPrice: products.cost,
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.type, "sale"),
                eq(transactions.status, "completed"),
                eq(products.productType, "food"),
            ))
            .groupBy(products.id, products.name, products.sku, products.price, products.cost)
            .orderBy(sql`sum(${transactionItems.quantity}::numeric * ${transactionItems.price}::numeric) DESC`)
            .limit(20)

        const topSelling = topProducts.map((row) => {
            const prodRevenue = Number(row.revenue || 0)
            const prodCogs = Number(row.cogs || 0)
            return {
                productId: row.productId,
                productName: row.productName,
                sku: row.sku,
                revenue: prodRevenue,
                cogs: prodCogs,
                profit: prodRevenue - prodCogs,
                margin: prodRevenue > 0 ? ((prodRevenue - prodCogs) / prodRevenue) * 100 : 0,
                quantitySold: Number(row.quantity || 0),
                unitPrice: Number(row.unitPrice || 0),
                costPrice: Number(row.costPrice || 0),
            }
        })

        // 4. Daily sales trend for food products
        const dailyTrend = await db
            .select({
                date: sql<string>`${transactions.date}::date`,
                revenue: sql<number>`sum(${transactionItems.quantity}::numeric * ${transactionItems.price}::numeric)`,
                cogs: sql<number>`sum(${transactionItems.quantity}::numeric * ${products.cost}::numeric)`,
                transactions: sql<number>`count(distinct ${transactions.id})`,
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.type, "sale"),
                eq(transactions.status, "completed"),
                eq(products.productType, "food"),
            ))
            .groupBy(sql`${transactions.date}::date`)
            .orderBy(sql`${transactions.date}::date ASC`)

        const trend = dailyTrend.map((row) => ({
            date: row.date,
            revenue: Number(row.revenue || 0),
            cogs: Number(row.cogs || 0),
            profit: Number(row.revenue || 0) - Number(row.cogs || 0),
            transactions: Number(row.transactions || 0),
        }))

        // 5. Payment method breakdown for food transactions
        const paymentMethodBreakdown = await db
            .select({
                method: transactions.paymentMethod,
                total: sql<number>`sum(${transactions.total}::numeric)`,
                count: sql<number>`count(distinct ${transactions.id})`,
            })
            .from(transactions)
            .innerJoin(transactionItems, eq(transactions.id, transactionItems.transactionId))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .where(and(
                gte(transactions.date, start),
                lte(transactions.date, end),
                eq(transactions.type, "sale"),
                eq(transactions.status, "completed"),
                eq(products.productType, "food"),
            ))
            .groupBy(transactions.paymentMethod)

        const paymentMethods = paymentMethodBreakdown.map((row) => ({
            method: row.method,
            total: Number(row.total || 0),
            count: Number(row.count || 0),
        }))

        return NextResponse.json({
            period: { start, end },
            summary: {
                revenue,
                cogs,
                grossProfit,
                margin: Math.round(margin * 100) / 100,
                totalQuantity,
                transactionCount,
                averageOrderValue: transactionCount > 0 ? revenue / transactionCount : 0,
            },
            categories: categoriesBreakdown,
            topSelling,
            trend,
            paymentMethods,
        })
    } catch (error) {
        console.error("Failed to fetch cuisine finance data:", error)
        return NextResponse.json({ error: "Failed to fetch cuisine finance data" }, { status: 500 })
    }
}
