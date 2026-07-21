import db from "@/lib/db"
import { transactions, creditRecords } from "@/lib/db/schema"
import { eq, and, sql } from "drizzle-orm"

async function fixMissingCredits() {
  console.log("🔍 Recherche des transactions credit sans creditRecords...")

  const missing = await db
    .select({
      id: transactions.id,
      clientId: transactions.clientId,
      total: transactions.total,
      date: transactions.date,
      invoiceRef: transactions.invoiceRef,
      reference: transactions.reference,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.paymentMethod, "credit"),
        eq(transactions.status, "completed"),
        sql`${transactions.clientId} IS NOT NULL`,
        sql`${transactions.id} NOT IN (SELECT transaction_id FROM credit_records)`,
      ),
    )

  if (missing.length === 0) {
    console.log("✅ Aucune transaction credit sans creditRecords trouvée.")
    return
  }

  console.log(`📋 ${missing.length} transaction(s) trouvée(s) :`)
  missing.forEach((t) => {
    console.log(`   - ${t.id} | ${t.invoiceRef || t.reference || "N/A"} | ${t.total} | ${t.clientId}`)
  })

  for (const t of missing) {
    const dueDate = new Date(t.date)
    dueDate.setDate(dueDate.getDate() + 30)

    await db.insert(creditRecords).values({
      clientId: t.clientId!,
      transactionId: t.id,
      amount: Number(t.total).toFixed(2),
      paidAmount: "0",
      dueDate,
      status: "pending",
    })

    console.log(`   ✅ creditRecord créé pour ${t.id}`)
  }

  console.log(`\n🎉 ${missing.length} creditRecord(s) créé(s) avec succès.`)
}

fixMissingCredits()
  .catch((err) => {
    console.error("❌ Erreur :", err)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })

// npx tsx fix-missing-credits.ts