import { NextResponse } from "next/server"
import db from "@/lib/db"
import { creditRecords, creditPayments, clients, transactions, cashFlow, caisseSessions, caisseMovements } from "@/lib/db/schema"
import { and, eq, gte, lt, sql } from "drizzle-orm"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await request.json()
    const { amount, method } = body

    const numericAmount = Number(amount || 0)
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 })
    }
    if (!method) {
      return NextResponse.json({ error: "Payment method is required" }, { status: 400 })
    }

    // Require an open caisse session
    const [openCaisse] = await db
      .select({ id: caisseSessions.id })
      .from(caisseSessions)
      .where(eq(caisseSessions.status, "open"))
      .limit(1)
    if (!openCaisse) {
      return NextResponse.json(
        { error: "Aucune session caisse ouverte. Veuillez ouvrir la caisse avant d'effectuer un paiement." },
        { status: 400 }
      )
    }

    const result = await db.transaction(async (tx) => {
      const [record] = await tx.select().from(creditRecords).where(eq(creditRecords.id, id))
      if (!record) {
        return { error: "Credit record not found", status: 404 }
      }

      const amountNum = Number(record.amount)
      const paidNum = Number(record.paidAmount)
      const remaining = amountNum - paidNum

      if (numericAmount > remaining) {
        return { error: "Payment exceeds remaining balance", status: 400 }
      }

      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, "0")
      const periodStart = new Date(year, now.getMonth(), 1)
      const periodEnd = new Date(year, now.getMonth() + 1, 1)
      const [countRow] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(creditPayments)
        .where(and(gte(creditPayments.date, periodStart), lt(creditPayments.date, periodEnd)))
      const seq = String(Number(countRow?.count || 0) + 1).padStart(4, "0")
      const paymentRef = `PAY-${year}-${month}-${seq}`

      const [payment] = await tx
        .insert(creditPayments)
        .values({
          creditRecordId: id,
          amount: numericAmount.toString(),
          method,
          paymentRef,
        })
        .returning()

      const [linkedTransaction] = await tx
        .select({
          id: transactions.id,
          invoiceRef: transactions.invoiceRef,
        })
        .from(transactions)
        .where(eq(transactions.id, record.transactionId))

      await tx.insert(cashFlow).values({
        amount: numericAmount.toString(),
        type: "inflow",
        category: "sale",
        description: `Paiement crédit ${linkedTransaction?.invoiceRef || record.transactionId} (${method})`,
        referenceId: payment.id,
        referenceType: "credit_payment",
      })

      // Auto-create caisse movement if payment is in cash
      if (method === "cash") {
        await tx.insert(caisseMovements).values({
          sessionId: openCaisse.id,
          type: "in",
          amount: numericAmount.toString(),
          reason: `Paiement facture ${linkedTransaction?.invoiceRef || record.transactionId}`,
        })
      }

      const newPaidAmount = paidNum + numericAmount
      const newStatus = newPaidAmount >= amountNum ? "paid" : "partial"

      await tx
        .update(creditRecords)
        .set({
          paidAmount: newPaidAmount.toString(),
          status: newStatus,
        })
        .where(eq(creditRecords.id, id))

      await tx
        .update(clients)
        .set({
          creditBalance: sql`${clients.creditBalance} - ${numericAmount}`,
        })
        .where(eq(clients.id, record.clientId))

      return { payment, recordId: id }
    })

    if ((result as any).error) {
      return NextResponse.json({ error: (result as any).error }, { status: (result as any).status })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Failed to record payment:", error)
    return NextResponse.json({ error: error.message || "Failed to record payment" }, { status: 500 })
  }
}
