import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import db from "@/lib/db"
import { transactions, products, clients, transactionItems, users, purchaseOrders, inventory, stockAdjustments, categories, measurementUnits, stockMovements } from "@/lib/db/schema"
import { desc, eq, ne, sql, and, gte, lte } from "drizzle-orm"

function fmt(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

function getPeriodDateRange(period: string = "today") {
  const now = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)

  let startDate: string

  switch (period) {
    case "week":
      startDate = fmt(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
      break
    case "month":
      startDate = fmt(new Date(today.getFullYear(), today.getMonth(), 1))
      break
    case "today":
    default:
      startDate = fmt(today)
      break
  }

  return { startDate, endDate: fmt(now) }
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const period = searchParams.get("period") || "today"
        const sector = searchParams.get("sector")

        const { startDate, endDate } = getPeriodDateRange(period)

        // 1. Sales for period
        const salesPromise = sector
            ? db
                  .select({
                      total: sql<number>`sum((${transactionItems.price} * ${transactionItems.quantity}) - ${transactionItems.discount})`,
                      count: sql<number>`count(distinct ${transactions.id})`,
                      creditCount: sql<number>`count(distinct case when ${transactions.paymentMethod} = 'credit' then ${transactions.id} end)`,
                  })
                  .from(transactionItems)
                  .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
                  .innerJoin(products, eq(transactionItems.productId, products.id))
                    .where(
                        and(
                            gte(transactions.date, sql`${startDate}::timestamp`),
                            lte(transactions.date, sql`${endDate}::timestamp`),
                            ne(transactions.status, "cancelled"),
                            eq(products.sector, sector)
                        )
                    )
            : db
                  .select({
                      total: sql<number>`sum(${transactions.total})`,
                      count: sql<number>`count(*)`,
                      creditCount: sql<number>`count(case when ${transactions.paymentMethod} = 'credit' then 1 end)`
                  })
                  .from(transactions)
                  .where(
                      and(
                          gte(transactions.date, sql`${startDate}::timestamp`),
                          lte(transactions.date, sql`${endDate}::timestamp`),
                          ne(transactions.status, "cancelled")
                      )
                  )

        // 2. Revenue (for month, use monthly; for others just use sales)
        const revenuePromise = sector
            ? db
                  .select({
                      total: sql<number>`sum((${transactionItems.price} * ${transactionItems.quantity}) - ${transactionItems.discount})`
                  })
                  .from(transactionItems)
                  .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
                  .innerJoin(products, eq(transactionItems.productId, products.id))
                  .where(
                      and(
                          gte(transactions.date, sql`${startDate}::timestamp`),
                          ne(transactions.status, "cancelled"),
                          eq(products.sector, sector)
                      )
                  )
            : db
                  .select({
                      total: sql<number>`sum(${transactions.total})`
                  })
                  .from(transactions)
                  .where(
                      and(
                          gte(transactions.date, sql`${startDate}::timestamp`),
                          ne(transactions.status, "cancelled")
                      )
                  )

        // 3. Low Stock Items (exclude food products — made-to-order / recipe-based)
        const lowStockPromise = sector
            ? db
                  .select({ count: sql<number>`count(*)` })
                  .from(products)
                  .where(and(eq(products.sector, sector), ne(products.productType, "food"), sql`${products.stock} <= ${products.minStock}`))
            : db
                  .select({ count: sql<number>`count(*)` })
                  .from(products)
                  .where(and(ne(products.productType, "food"), sql`${products.stock} <= ${products.minStock}`))

        // 4. Total Credit Balance
        const totalCreditPromise = db
            .select({ total: sql<number>`sum(${clients.creditBalance})` })
            .from(clients)

        // 5. Products sold in period
        const productsSoldPromise = db
            .select({
                quantity: sql<number>`sum(${transactionItems.quantity})`
            })
            .from(transactionItems)
            .innerJoin(transactions, eq(transactionItems.transactionId, transactions.id))
            .innerJoin(products, eq(transactionItems.productId, products.id))
            .where(
                and(
                    gte(transactions.date, sql`${startDate}::timestamp`),
                    lte(transactions.date, sql`${endDate}::timestamp`),
                    ne(transactions.status, "cancelled"),
                    sector ? eq(products.sector, sector) : sql`true`
                )
            )

        // 6. Recent Transactions
        const recentTransactionsPromise = db.query.transactions.findMany({
            where: ne(transactions.status, "cancelled"),
            orderBy: [desc(transactions.date)],
            limit: sector ? 40 : 5,
            with: {
                items: true,
                user: true,
                client: true
            }
        })

        // 7. System admin activity
        const totalUsersPromise = db
            .select({ count: sql<number>`count(*)` })
            .from(users)

        const adminUsersPromise = db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.role, "admin"))

        const pendingPurchaseOrdersPromise = db
            .select({ count: sql<number>`count(*)` })
            .from(purchaseOrders)
            .where(eq(purchaseOrders.status, "pending"))

        const inProgressInventoriesPromise = db
            .select({ count: sql<number>`count(*)` })
            .from(inventory)
            .where(eq(inventory.status, "in_progress"))

        const stockAdjustmentsInPeriodPromise = db
            .select({ count: sql<number>`count(*)` })
            .from(stockAdjustments)
            .where(
                and(
                    gte(stockAdjustments.createdDate, sql`${startDate}::timestamp`),
                    lte(stockAdjustments.createdDate, sql`${endDate}::timestamp`)
                )
            )

        const totalProductsPromise = db
            .select({ count: sql<number>`count(*)` })
            .from(products)

        const totalCategoriesPromise = db
            .select({ count: sql<number>`count(*)` })
            .from(categories)

        const totalMeasurementUnitsPromise = db
            .select({ count: sql<number>`count(*)` })
            .from(measurementUnits)

        const activeSince = new Date(Date.now() - 24 * 60 * 60 * 1000)

        const transactionActivityPromise = db
            .select({
                userId: users.id,
                userName: users.name,
                userRole: users.role,
                activityAt: transactions.date,
                source: sql<string>`'transaction'`,
            })
            .from(transactions)
            .innerJoin(users, eq(transactions.userId, users.id))
            .where(gte(transactions.date, activeSince))
            .orderBy(desc(transactions.date))
            .limit(50)

        const stockMovementActivityPromise = db
            .select({
                userId: users.id,
                userName: users.name,
                userRole: users.role,
                activityAt: stockMovements.date,
                source: sql<string>`'stock_movement'`,
            })
            .from(stockMovements)
            .innerJoin(users, eq(stockMovements.userId, users.id))
            .where(gte(stockMovements.date, activeSince))
            .orderBy(desc(stockMovements.date))
            .limit(50)

        const stockAdjustmentActivityPromise = db
            .select({
                userId: users.id,
                userName: users.name,
                userRole: users.role,
                activityAt: stockAdjustments.createdDate,
                source: sql<string>`'stock_adjustment'`,
            })
            .from(stockAdjustments)
            .innerJoin(users, eq(stockAdjustments.createdBy, users.id))
            .where(gte(stockAdjustments.createdDate, activeSince))
            .orderBy(desc(stockAdjustments.createdDate))
            .limit(50)

        const inventoryActivityPromise = db
            .select({
                userId: users.id,
                userName: users.name,
                userRole: users.role,
                activityAt: inventory.updatedAt,
                source: sql<string>`'inventory'`,
            })
            .from(inventory)
            .innerJoin(users, eq(inventory.countedBy, users.id))
            .where(gte(inventory.updatedAt, activeSince))
            .orderBy(desc(inventory.updatedAt))
            .limit(50)

        const stockAdjustmentHistoryPromise = db
            .select({
                id: stockAdjustments.id,
                date: stockAdjustments.createdDate,
                userName: users.name,
                userRole: users.role,
                actionType: sql<string>`'modification'`,
                entity: sql<string>`'stock'`,
                description: stockAdjustments.reason,
            })
            .from(stockAdjustments)
            .innerJoin(users, eq(stockAdjustments.createdBy, users.id))
            .orderBy(desc(stockAdjustments.createdDate))
            .limit(8)

        const inventoryHistoryPromise = db
            .select({
                id: inventory.id,
                createdAt: inventory.createdAt,
                updatedAt: inventory.updatedAt,
                userName: users.name,
                userRole: users.role,
            })
            .from(inventory)
            .innerJoin(users, eq(inventory.countedBy, users.id))
            .orderBy(desc(inventory.updatedAt))
            .limit(8)

        const sectorProductIdsPromise = sector
            ? db
                  .select({ id: products.id })
                  .from(products)
                  .where(eq(products.sector, sector))
            : Promise.resolve([])

        async function safeQuery<T>(query: Promise<T>, fallback: T): Promise<T> {
            try { return await query } catch (e) { console.error("Dashboard query failed:", e); return fallback }
        }

        const [
            salesResult,
            revenueResult,
            lowStockResult,
            totalCreditResult,
            productsSoldResult,
            recentTransactions,
            totalUsersResult,
            adminUsersResult,
            pendingPurchaseOrdersResult,
            inProgressInventoriesResult,
            stockAdjustmentsInPeriodResult,
            totalProductsResult,
            totalCategoriesResult,
            totalMeasurementUnitsResult,
            transactionActivityResult,
            stockMovementActivityResult,
            stockAdjustmentActivityResult,
            inventoryActivityResult,
            stockAdjustmentHistoryResult,
            inventoryHistoryResult,
            sectorProductIdsResult
        ] = await Promise.all([
            safeQuery(salesPromise, [{ total: 0, count: 0, creditCount: 0 }]),
            safeQuery(revenuePromise, [{ total: 0 }]),
            safeQuery(lowStockPromise, [{ count: 0 }]),
            safeQuery(totalCreditPromise, [{ total: 0 }]),
            safeQuery(productsSoldPromise, [{ quantity: 0 }]),
            safeQuery(recentTransactionsPromise, []),
            safeQuery(totalUsersPromise, [{ count: 0 }]),
            safeQuery(adminUsersPromise, [{ count: 0 }]),
            safeQuery(pendingPurchaseOrdersPromise, [{ count: 0 }]),
            safeQuery(inProgressInventoriesPromise, [{ count: 0 }]),
            safeQuery(stockAdjustmentsInPeriodPromise, [{ count: 0 }]),
            safeQuery(totalProductsPromise, [{ count: 0 }]),
            safeQuery(totalCategoriesPromise, [{ count: 0 }]),
            safeQuery(totalMeasurementUnitsPromise, [{ count: 0 }]),
            safeQuery(transactionActivityPromise, []),
            safeQuery(stockMovementActivityPromise, []),
            safeQuery(stockAdjustmentActivityPromise, []),
            safeQuery(inventoryActivityPromise, []),
            safeQuery(stockAdjustmentHistoryPromise, []),
            safeQuery(inventoryHistoryPromise, []),
            safeQuery(sectorProductIdsPromise, [])
        ])

        const combinedActivity = [
            ...transactionActivityResult,
            ...stockMovementActivityResult,
            ...stockAdjustmentActivityResult,
            ...inventoryActivityResult,
        ]
            .filter((item) => !!item.userId && !!item.activityAt)
            .sort((a, b) => new Date(b.activityAt as any).getTime() - new Date(a.activityAt as any).getTime())

        const uniqueConnectedUsers = new Map<string, {
            id: string
            name: string
            role: string
            lastActivity: Date
            source: string
        }>()

        for (const item of combinedActivity) {
            if (!uniqueConnectedUsers.has(item.userId)) {
                uniqueConnectedUsers.set(item.userId, {
                    id: item.userId,
                    name: item.userName,
                    role: item.userRole,
                    lastActivity: item.activityAt,
                    source: item.source,
                })
            }
        }

        const connectedUsers = Array.from(uniqueConnectedUsers.values()).slice(0, 10)

        const inventoryHistory = inventoryHistoryResult.flatMap((item) => {
            const events = [{
                id: `inventory-create-${item.id}`,
                date: item.createdAt,
                userName: item.userName,
                userRole: item.userRole,
                actionType: "creation",
                entity: "inventory_session",
                description: "Session d'inventaire créée",
            }]

            if (new Date(item.updatedAt).getTime() !== new Date(item.createdAt).getTime()) {
                events.push({
                    id: `inventory-update-${item.id}`,
                    date: item.updatedAt,
                    userName: item.userName,
                    userRole: item.userRole,
                    actionType: "modification",
                    entity: "inventory_session",
                    description: "Session d'inventaire modifiée",
                })
            }

            return events
        })

        const adminChangeHistory = [
            ...stockAdjustmentHistoryResult.map((item) => ({
                id: `stock-adjustment-${item.id}`,
                date: item.date,
                userName: item.userName,
                userRole: item.userRole,
                actionType: item.actionType,
                entity: item.entity,
                description: item.description || "Ajustement de stock",
            })),
            ...inventoryHistory,
        ]
            .sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime())
            .slice(0, 12)

        const transactionCount = Number(salesResult[0]?.count || 0)
        const creditTransactionCount = Number(salesResult[0]?.creditCount || 0)
        const creditSalesRatio = transactionCount > 0 ? Math.round((creditTransactionCount / transactionCount) * 100) : 0

        const sectorProductIds = new Set((sectorProductIdsResult || []).map((item: any) => item.id))

        const sectorRecentTransactions = sector
            ? recentTransactions
                  .filter((tx: any) =>
                      (tx.items || []).some((item: any) => {
                          return sectorProductIds.has(item.productId)
                      })
                  )
                  .slice(0, 5)
            : recentTransactions

        const stats = {
            period,
            sector,
            todaySales: Number(salesResult[0]?.total || 0),
            todayTransactionCount: transactionCount,
            monthlyRevenue: Number(revenueResult[0]?.total || 0),
            lowStockItems: Number(lowStockResult[0]?.count || 0),
            totalCreditBalance: Number(totalCreditResult[0]?.total || 0),
            productsCount: Number(productsSoldResult[0]?.quantity || 0),
            creditSalesRatio: creditSalesRatio,
            recentTransactions: sectorRecentTransactions,
            systemAdminActivity: {
                totalUsers: Number(totalUsersResult[0]?.count || 0),
                adminUsers: Number(adminUsersResult[0]?.count || 0),
                totalProducts: Number(totalProductsResult[0]?.count || 0),
                totalCategories: Number(totalCategoriesResult[0]?.count || 0),
                totalMeasurementUnits: Number(totalMeasurementUnitsResult[0]?.count || 0),
                pendingPurchaseOrders: Number(pendingPurchaseOrdersResult[0]?.count || 0),
                inProgressInventories: Number(inProgressInventoriesResult[0]?.count || 0),
                stockAdjustmentsInPeriod: Number(stockAdjustmentsInPeriodResult[0]?.count || 0),
                connectedUsers,
                adminChangeHistory,
            }
        }

        return NextResponse.json(stats)
    } catch (error) {
        console.error("Failed to fetch dashboard stats:", error)
        return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 })
    }
}
