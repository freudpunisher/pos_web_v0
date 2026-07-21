import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import db from "@/lib/db"
import { transactions, transactionItems, products } from "@/lib/db/schema"
import { sql, eq, ne, and, gte, lte } from "drizzle-orm"

function fmt(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get("period") || "week"
    const sector = searchParams.get("sector")

    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    let startDate: string

    switch (period) {
      case "today":
        startDate = fmt(today)
        break
      case "month":
        startDate = fmt(new Date(today.getFullYear(), today.getMonth(), 1))
        break
      case "week":
      default:
        startDate = fmt(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000))
        break
    }

    const endDate = fmt(now)

    const salesData = sector
      ? await db
          .select({
            date: sql<string>`DATE(${transactions.date})`,
            totalSales: sql<number>`sum((${transactionItems.price} * ${transactionItems.quantity}) - ${transactionItems.discount})`,
            transactionCount: sql<number>`count(distinct ${transactions.id})`,
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
          .groupBy(sql`DATE(${transactions.date})`)
          .orderBy(sql`DATE(${transactions.date})`)
      : await db
          .select({
            date: sql<string>`DATE(${transactions.date})`,
            totalSales: sql<number>`sum(${transactions.total})`,
            transactionCount: sql<number>`count(*)`,
          })
          .from(transactions)
          .where(
            and(
              gte(transactions.date, sql`${startDate}::timestamp`),
              lte(transactions.date, sql`${endDate}::timestamp`),
              ne(transactions.status, "cancelled")
            )
          )
          .groupBy(sql`DATE(${transactions.date})`)
          .orderBy(sql`DATE(${transactions.date})`)

    const result = salesData.map((row) => ({
      date: row.date,
      sales: Number(row.totalSales || 0),
      transactions: Number(row.transactionCount || 0),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch sales chart data:", error)
    return NextResponse.json({ error: "Failed to fetch sales chart data" }, { status: 500 })
  }
}
