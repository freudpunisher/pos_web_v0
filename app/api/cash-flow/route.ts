import { NextResponse } from "next/server"
import db from "@/lib/db"
import { cashFlow, transactions, creditPayments, expenses } from "@/lib/db/schema"
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const type = searchParams.get("type")
    const category = searchParams.get("category")
    const referenceType = searchParams.get("referenceType")
    const search = searchParams.get("search")

    const conditions: any[] = []
    if (startDate) conditions.push(gte(cashFlow.date, new Date(startDate)))
    if (endDate) conditions.push(lte(cashFlow.date, new Date(endDate)))
    if (type && type !== "all") conditions.push(eq(cashFlow.type, type as any))
    if (category && category !== "all") conditions.push(eq(cashFlow.category, category as any))
    if (referenceType && referenceType !== "all") conditions.push(eq(cashFlow.referenceType, referenceType))

    let query = db
      .select({
        id: cashFlow.id,
        date: cashFlow.date,
        amount: cashFlow.amount,
        type: cashFlow.type,
        category: cashFlow.category,
        description: cashFlow.description,
        referenceId: cashFlow.referenceId,
        referenceType: cashFlow.referenceType,
      })
      .from(cashFlow)

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    let rows = await query.orderBy(desc(cashFlow.date))

    const transactionIds = rows
      .filter((r) => r.referenceType === "transaction" && r.referenceId)
      .map((r) => r.referenceId as string)
    const creditPaymentIds = rows
      .filter((r) => r.referenceType === "credit_payment" && r.referenceId)
      .map((r) => r.referenceId as string)
    const expenseIds = rows
      .filter((r) => r.referenceType === "expense" && r.referenceId)
      .map((r) => r.referenceId as string)

    const transactionRefs = transactionIds.length
      ? await db
          .select({ id: transactions.id, ref: transactions.invoiceRef })
          .from(transactions)
          .where(inArray(transactions.id, transactionIds))
      : []

    const creditPaymentRefs = creditPaymentIds.length
      ? await db
          .select({ id: creditPayments.id, ref: creditPayments.paymentRef })
          .from(creditPayments)
          .where(inArray(creditPayments.id, creditPaymentIds))
      : []

    const expenseRefs = expenseIds.length
      ? await db
          .select({ id: expenses.id, ref: expenses.reference })
          .from(expenses)
          .where(inArray(expenses.id, expenseIds))
      : []

    const transactionRefById = new Map(transactionRefs.map((item) => [item.id, item.ref]))
    const creditPaymentRefById = new Map(creditPaymentRefs.map((item) => [item.id, item.ref]))
    const expenseRefById = new Map(expenseRefs.map((item) => [item.id, item.ref]))

    const decorated = rows.map((row) => {
      let referenceCode: string | null = null
      if (row.referenceType === "transaction" && row.referenceId) {
        referenceCode = transactionRefById.get(row.referenceId as string) || null
      } else if (row.referenceType === "credit_payment" && row.referenceId) {
        referenceCode = creditPaymentRefById.get(row.referenceId as string) || null
      } else if (row.referenceType === "expense" && row.referenceId) {
        referenceCode = expenseRefById.get(row.referenceId as string) || null
      }

      return {
        ...row,
        referenceCode,
      }
    })

    if (search) {
      const lower = search.toLowerCase()
      rows = decorated.filter((item) => {
        const text = `${item.description || ""} ${item.referenceCode || ""} ${item.referenceType || ""}`.toLowerCase()
        return text.includes(lower)
      }) as any
      return NextResponse.json(rows)
    }

    return NextResponse.json(decorated)
  } catch (error) {
    console.error("Failed to fetch cash flow:", error)
    return NextResponse.json({ error: "Failed to fetch cash flow" }, { status: 500 })
  }
}
