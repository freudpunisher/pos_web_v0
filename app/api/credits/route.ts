import { NextResponse } from "next/server"
import db from "@/lib/db"
import { creditRecords, creditPayments, clients, transactions } from "@/lib/db/schema"
import { asc, eq } from "drizzle-orm"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

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

    return NextResponse.json(result)
  } catch (error) {
    console.error("Failed to fetch credits:", error)
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 })
  }
}
