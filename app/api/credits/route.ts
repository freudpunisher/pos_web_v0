import { NextResponse } from "next/server"
import db from "@/lib/db"
import { creditRecords, creditPayments, clients, transactions, transactionItems, products } from "@/lib/db/schema"
import { and, asc, eq, inArray } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const sector = searchParams.get("sector")

    let query = db
      .select({
        id: creditRecords.id,
        clientId: creditRecords.clientId,
        clientName: clients.name,
        transactionId: creditRecords.transactionId,
        invoiceRef: transactions.invoiceRef,
        reference: transactions.reference,
        amount: creditRecords.amount,
        paidAmount: creditRecords.paidAmount,
        dueDate: creditRecords.dueDate,
        status: creditRecords.status,
      })
      .from(creditRecords)
      .leftJoin(clients, eq(creditRecords.clientId, clients.id))
      .leftJoin(transactions, eq(creditRecords.transactionId, transactions.id))

    if (status && status !== "all") {
      query = query.where(eq(creditRecords.status, status as any)) as any
    }

    const records = await query.orderBy(asc(creditRecords.dueDate))
    const recordIds = records.map((r) => r.id)

    const payments = recordIds.length
      ? await db
          .select({
            id: creditPayments.id,
            creditRecordId: creditPayments.creditRecordId,
            amount: creditPayments.amount,
            date: creditPayments.date,
            method: creditPayments.method,
            paymentRef: creditPayments.paymentRef,
          })
          .from(creditPayments)
          .where(inArray(creditPayments.creditRecordId, recordIds))
      : []

    const paymentsByRecord = new Map<string, any[]>()
    for (const p of payments) {
      const list = paymentsByRecord.get(p.creditRecordId) || []
      list.push(p)
      paymentsByRecord.set(p.creditRecordId, list)
    }

    let result = records.map((r) => ({
      ...r,
      payments: paymentsByRecord.get(r.id) || [],
    }))

    if (sector && result.length > 0) {
      const transactionIds = result.map((r) => r.transactionId)
      const sectorTransactionIds = new Set(
        (await db
          .select({ transactionId: transactionItems.transactionId })
          .from(transactionItems)
          .innerJoin(products, eq(transactionItems.productId, products.id))
          .where(and(inArray(transactionItems.transactionId, transactionIds as string[]), eq(products.sector, sector))))
          .filter((item) => item && (item as any).transactionId)
          .map((item) => item.transactionId)
      )

      result = result.filter((r) => sectorTransactionIds.has(r.transactionId))
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch credits:", error)
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 })
  }
}
