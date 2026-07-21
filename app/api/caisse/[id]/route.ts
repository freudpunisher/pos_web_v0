import { NextResponse } from "next/server"
import db from "@/lib/db"
import { caisseSessions, caisseMovements, transactions, transactionItems, expenses, creditRecords, creditPayments, clients } from "@/lib/db/schema"
import { eq, and, gte, lte, gt, ne, sql } from "drizzle-orm"
import { requireAuth } from "@/lib/auth-guard"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const session = await db.query.caisseSessions.findFirst({
            where: eq(caisseSessions.id, id),
            with: {
                user: { columns: { id: true, name: true } },
                location: { columns: { id: true, name: true } },
                movements: true,
            },
        })

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 })
        }

        // Compute expected balance
        const openedAt = new Date(session.openedAt)
        const isClosed = session.status === "closed"
        const closedAt = session.closedAt ? new Date(session.closedAt) : null

        // Helper to build date conditions
        const getDateConditions = (dateColumn: any) => {
            const conds = [gte(dateColumn, openedAt)]
            if (isClosed && closedAt) {
                conds.push(lte(dateColumn, closedAt))
            }
            return conds
        }

        // Get cash sales made during this session
        const cashSalesResult = await db
            .select({ total: transactions.total })
            .from(transactions)
            .where(
                and(
                    eq(transactions.paymentMethod, "cash"),
                    eq(transactions.type, "sale"),
                    ne(transactions.status, "cancelled"),
                    ...getDateConditions(transactions.date)
                )
            )

        const cashSales = cashSalesResult.reduce(
            (sum, t) => sum + Number.parseFloat(t.total || "0"), 0
        )

        // Get card sales
        const cardSalesResult = await db
            .select({ total: transactions.total })
            .from(transactions)
            .where(
                and(
                    eq(transactions.paymentMethod, "card"),
                    eq(transactions.type, "sale"),
                    ne(transactions.status, "cancelled"),
                    ...getDateConditions(transactions.date)
                )
            )

        const cardSales = cardSalesResult.reduce(
            (sum, t) => sum + Number.parseFloat(t.total || "0"), 0
        )

        // Get credit payments (invoice payments) in cash/card during the session
        const creditCashResult = await db
            .select({ amount: creditPayments.amount })
            .from(creditPayments)
            .where(
                and(
                    eq(creditPayments.method, "cash"),
                    ...getDateConditions(creditPayments.date)
                )
            )
        const creditCashPayments = creditCashResult.reduce(
            (sum, p) => sum + Number.parseFloat(p.amount || "0"), 0
        )

        const creditCardResult = await db
            .select({ amount: creditPayments.amount })
            .from(creditPayments)
            .where(
                and(
                    eq(creditPayments.method, "card"),
                    ...getDateConditions(creditPayments.date)
                )
            )
        const creditCardPayments = creditCardResult.reduce(
            (sum, p) => sum + Number.parseFloat(p.amount || "0"), 0
        )

        // Get unpaid debts (credit records with remaining balance)
        const unpaidDebtsResult = await db
            .select({
                total: sql<number>`coalesce(sum(${creditRecords.amount}::numeric - ${creditRecords.paidAmount}::numeric), 0)`,
            })
            .from(creditRecords)
            .where(gt(creditRecords.amount, creditRecords.paidAmount))
        const unpaidDebts = Number(unpaidDebtsResult[0]?.total || 0)

        // Get expenses recorded during the session - use createdAt for accurate session matching
        const expensesResult = await db
            .select({ amount: expenses.amount })
            .from(expenses)
            .where(
                and(
                    ...getDateConditions(expenses.createdAt)
                )
            )

        const totalExpenses = expensesResult.reduce(
            (sum, e) => sum + Number.parseFloat(e.amount || "0"), 0
        )

        // Get manual movements (excluding automatic expense and credit payment movements to avoid double counting)
        const movements = (session.movements || []).filter(m => !m.reason.startsWith("Dépense :") && !m.reason.startsWith("Paiement facture"))
        const manualIn = movements
            .filter((m) => m.type === "in")
            .reduce((sum, m) => sum + Number.parseFloat(m.amount), 0)
        const manualOut = movements
            .filter((m) => m.type === "out")
            .reduce((sum, m) => sum + Number.parseFloat(m.amount), 0)

        // Expected = opening + cash_sales + credit_cash + manual_in - manual_out - expenses
        const openingBal = Number.parseFloat(session.openingBalance)
        const expectedBalance = openingBal + cashSales + creditCashPayments + manualIn - manualOut - totalExpenses

        return NextResponse.json({
            ...session,
            computedCashSales: cashSales,
            computedCardSales: cardSales,
            computedCreditCashPayments: creditCashPayments,
            computedCreditCardPayments: creditCardPayments,
            computedUnpaidDebts: unpaidDebts,
            computedExpenses: totalExpenses,
            computedManualIn: manualIn,
            computedManualOut: manualOut,
            computedExpectedBalance: expectedBalance,
        })
    } catch (error) {
        console.error("Failed to fetch caisse session:", error)
        return NextResponse.json({ error: "Failed to fetch caisse session" }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireAuth()
        if (auth.error) return auth.error

        const { id } = await params
        const body = await request.json()
        const { action, closingBalance, notes } = body

        if (action === "close") {
            const [session] = await db
                .select()
                .from(caisseSessions)
                .where(eq(caisseSessions.id, id))
                .limit(1)

            if (!session) {
                return NextResponse.json({ error: "Session not found" }, { status: 404 })
            }

            if (session.status === "closed") {
                return NextResponse.json({ error: "Session already closed" }, { status: 400 })
            }

            // Only the user who opened the session (or admin/manager) can close it
            const currentUserId = auth.payload?.userId
            const userRole = auth.payload?.role
            if (session.userId !== currentUserId && userRole !== "admin" && userRole !== "manager") {
                return NextResponse.json({
                    error: "Seul l'utilisateur qui a ouvert la caisse peut la fermer"
                }, { status: 403 })
            }

            // Calculate expected balance and difference
            const openedAt = new Date(session.openedAt)

            // Get cash sales - no upper bound needed during closure calculation
            const cashSalesResult = await db
                .select({ total: transactions.total })
                .from(transactions)
                .where(
                    and(
                        eq(transactions.paymentMethod, "cash"),
                        eq(transactions.type, "sale"),
                        ne(transactions.status, "cancelled"),
                        gte(transactions.date, openedAt)
                    )
                )

            const cashSales = cashSalesResult.reduce(
                (sum, t) => sum + Number.parseFloat(t.total || "0"), 0
            )

            // Get credit payments in cash during the session
            const creditCashResult = await db
                .select({ amount: creditPayments.amount })
                .from(creditPayments)
                .where(
                    and(
                        eq(creditPayments.method, "cash"),
                        gte(creditPayments.date, openedAt)
                    )
                )
            const creditCashPayments = creditCashResult.reduce(
                (sum, p) => sum + Number.parseFloat(p.amount || "0"), 0
            )

            // Get expenses - use createdAt for accurate session matching
            const expensesResult = await db
                .select({ amount: expenses.amount })
                .from(expenses)
                .where(
                    and(
                        gte(expenses.createdAt, openedAt)
                    )
                )

            const totalExpenses = expensesResult.reduce(
                (sum, e) => sum + Number.parseFloat(e.amount || "0"), 0
            )

            // Get manual movements (excluding automatic expense and credit payment movements)
            const allMovements = await db
                .select()
                .from(caisseMovements)
                .where(eq(caisseMovements.sessionId, id))

            const movements = allMovements.filter(m => !m.reason.startsWith("Dépense :") && !m.reason.startsWith("Paiement facture"))

            const manualIn = movements
                .filter((m) => m.type === "in")
                .reduce((sum, m) => sum + Number.parseFloat(m.amount), 0)
            const manualOut = movements
                .filter((m) => m.type === "out")
                .reduce((sum, m) => sum + Number.parseFloat(m.amount), 0)

            const openingBal = Number.parseFloat(session.openingBalance)
            const expectedBalance = openingBal + cashSales + creditCashPayments + manualIn - manualOut - totalExpenses
            const physicalBalance = Number.parseFloat(closingBalance || "0")
            const diff = physicalBalance - expectedBalance

            const [updated] = await db
                .update(caisseSessions)
                .set({
                    status: "closed",
                    closedAt: sql`now()`,
                    closingBalance: physicalBalance.toString(),
                    expectedBalance: expectedBalance.toString(),
                    difference: diff.toString(),
                    notes: notes || session.notes,
                })
                .where(eq(caisseSessions.id, id))
                .returning()

            return NextResponse.json(updated)
        }

        if (action === "movement") {
            const { type, amount, reason } = body
            if (!type || !amount || !reason) {
                return NextResponse.json({ error: "type, amount, and reason are required" }, { status: 400 })
            }

            const [movement] = await db
                .insert(caisseMovements)
                .values({
                    sessionId: id,
                    type,
                    amount: amount.toString(),
                    reason,
                })
                .returning()

            return NextResponse.json(movement)
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    } catch (error) {
        console.error("Failed to update caisse session:", error)
        return NextResponse.json({ error: "Failed to update caisse session" }, { status: 500 })
    }
}
