import { NextResponse } from "next/server"
import { NextRequest } from "next/server"
import db from "@/lib/db"
import { caisseSessions, transactions, transactionItems, products, stock, stockMovements, clients, locations, cashFlow, creditRecords, productSellingUnits } from "@/lib/db/schema"
import { eq, sql, gte, lte, and, max } from "drizzle-orm"
import { resolveWarehouse } from "@/lib/db/location-utils"

function fmt(date: Date) {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const sector = searchParams.get("sector")
        const dateFrom = searchParams.get("dateFrom")
        const dateTo = searchParams.get("dateTo")

        const conditions = []
        if (dateFrom) {
            const d = new Date(dateFrom)
            d.setHours(0, 0, 0, 0)
            conditions.push(gte(transactions.date, sql`${fmt(d)}::timestamp`))
        }
        if (dateTo) {
            const d = new Date(dateTo)
            d.setHours(23, 59, 59, 999)
            conditions.push(lte(transactions.date, sql`${fmt(d)}::timestamp`))
        }

        const allTransactions = await db.query.transactions.findMany({
            where: conditions.length ? and(...conditions) : undefined,
            with: {
                items: true,
                client: true,
                user: true,
                waiter: true,
                table: true,
            },
            orderBy: (transactions, { desc }) => [desc(transactions.date)],
        })

        if (!sector) {
            return NextResponse.json(allTransactions)
        }

        const sectorProducts = await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.sector, sector))
        const sectorProductIds = new Set(sectorProducts.map((p) => p.id))

        const filteredTransactions = allTransactions.filter((tx: any) =>
            (tx.items || []).some((item: any) => sectorProductIds.has(item.productId))
        )

        return NextResponse.json(filteredTransactions)
    } catch (error) {
        console.error("Failed to fetch transactions:", error)
        return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { type, total, status, paymentMethod, clientId, userId, items, invoiceRef } = body
        const normalizedType = String(type || "").toLowerCase().trim()
        const normalizedPaymentMethod = String(paymentMethod || "").toLowerCase().trim()

        if (!normalizedType || !total || !normalizedPaymentMethod || !userId || !items || items.length === 0) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }
        if (!["sale", "purchase", "credit_payment"].includes(normalizedType)) {
            return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 })
        }
        if (!["cash", "credit", "card"].includes(normalizedPaymentMethod)) {
            return NextResponse.json({ error: "Invalid payment method" }, { status: 400 })
        }

        // Require an open caisse session before any sale
        if (normalizedType === "sale") {
            const [openSession] = await db
                .select()
                .from(caisseSessions)
                .where(eq(caisseSessions.status, "open"))
                .limit(1)
            if (!openSession) {
                return NextResponse.json(
                    { error: "Aucune session caisse ouverte. Veuillez ouvrir la caisse avant d'effectuer une vente." },
                    { status: 400 }
                )
            }
        }

        // Sanitize IDs for migration/stale sessions
        const sanitizeUUID = (id: string) => {
            if (id === "1" || id === "00000000-0000-0000-0000-000000000001") return "2f83e92d-b719-4c15-919f-e2ff7640f1c4"
            return id
        }

        const sanitizedUserId = sanitizeUUID(userId)
        const sanitizedClientId = clientId

        // Use a transaction to ensure atomicity
        const result = await db.transaction(async (tx) => {
            let paymentEntry: { id: string } | null = null
            // 0. Check Credit Limit if applicable
            if (sanitizedClientId && normalizedPaymentMethod === "credit") {
                const [client] = await tx
                    .select()
                    .from(clients)
                    .where(eq(clients.id, sanitizedClientId))

                if (client) {
                    const currentBalance = Number.parseFloat(client.creditBalance)
                    const limit = Number.parseFloat(client.creditLimit)
                    const newBalance = currentBalance + Number.parseFloat(total.toString())

                    if (newBalance > limit) {
                        throw new Error(`Credit limit exceeded. Available: ${(limit - currentBalance).toFixed(2)}`)
                    }
                }
            }

            // 1. Generate sequential reference: FACT-YYYY-MM-XXXXX
            const now = new Date()
            const year = now.getFullYear()
            const month = String(now.getMonth() + 1).padStart(2, "0")
            const prefix = `FACT-${year}-${month}-`
            const [lastRef] = await tx
                .select({ maxRef: max(transactions.reference) })
                .from(transactions)
                .where(sql`${transactions.reference} ~ ${`^FACT-${year}-${month}-[0-9]+$`}`)
            const lastNum = lastRef?.maxRef ? parseInt(lastRef.maxRef.split("-").pop()!, 10) : 0
            const reference = `${prefix}${String(lastNum + 1).padStart(5, "0")}`

            // 2. Insert Transaction
            const [newTransaction] = await tx
                .insert(transactions)
                .values({
                    type: normalizedType as any,
                    total: total.toString(),
                    status: status || "completed",
                    paymentMethod: normalizedPaymentMethod as any,
                    invoiceRef,
                    clientId: sanitizedClientId,
                    userId: sanitizedUserId,
                    reference,
                })
                .returning()

            // 2b. Create payment entry immediately for cash/card invoices
            const isCashLike = ["cash", "card"].includes(normalizedPaymentMethod)
            if (isCashLike) {
                const entryType = normalizedType === "purchase" ? "outflow" : "inflow"
                const category = normalizedType === "purchase" ? "purchases" : "sales"

                const [createdPaymentEntry] = await tx.insert(cashFlow).values({
                    date: new Date(),
                    amount: total.toString(),
                    type: entryType,
                    category: category,
                    description: `Paiement ${normalizedType} ${invoiceRef} (${normalizedPaymentMethod})`,
                    referenceId: newTransaction.id,
                    referenceType: "transaction",
                }).returning({ id: cashFlow.id })
                paymentEntry = createdPaymentEntry
            }

            // 3. Insert Transaction Items and Update Stock
            for (const item of items) {
                const itemQuantity = Number(item.quantity)
                if (!Number.isFinite(itemQuantity) || itemQuantity <= 0) {
                    throw new Error("Invalid item quantity")
                }

                // Look up conversion factor if selling unit is specified
                let conversionFactor = 1
                if (item.sellingUnitId) {
                    const [su] = await tx
                        .select()
                        .from(productSellingUnits)
                        .where(eq(productSellingUnits.id, item.sellingUnitId))
                        .limit(1)
                    if (su) {
                        conversionFactor = Number(su.conversionFactor)
                    }
                }
                const stockQty = itemQuantity * conversionFactor

                const [product] = await tx
                    .select({
                        id: products.id,
                        name: products.name,
                        productType: products.productType,
                        trackStock: products.trackStock,
                        stock: products.stock,
                        minStock: products.minStock,
                        productType: products.productType,
                    })
                    .from(products)
                    .where(eq(products.id, item.productId))

                if (!product) {
                    throw new Error(`Product not found: ${item.productId}`)
                }

                const targetLocation = normalizedType === "sale"
                    ? await tx.select().from(locations).where(eq(locations.type, "bar")).limit(1).then(r => r[0])
                    : await resolveWarehouse(tx, product?.productType || "ingredient")

                let barQty = 0
                if (normalizedType === "sale" && targetLocation) {
                    const [barStockRecord] = await tx
                        .select({ quantityOnHand: stock.quantityOnHand })
                        .from(stock)
                        .where(and(eq(stock.productId, item.productId), eq(stock.locationId, targetLocation.id)))
                        .limit(1)
                    barQty = Number(barStockRecord?.quantityOnHand ?? 0)
                }

                const quantityChange = normalizedType === "sale" ? -stockQty : stockQty
                if (normalizedType === "sale" && product.trackStock && barQty < stockQty) {
                    throw new Error(`Stock insuffisant au bar pour ${product.name}. Disponible: ${barQty}, requis: ${stockQty}`)
                }

                await tx.insert(transactionItems).values({
                    transactionId: newTransaction.id,
                    productId: item.productId,
                    productName: item.productName,
                    quantity: itemQuantity.toString(),
                    price: item.price.toString(),
                    discount: (item.discount || 0).toString(),
                })

                // Keep backward-compatible product stock in sync
                await tx
                    .update(products)
                    .set({
                        stock: sql`${products.stock} + ${quantityChange}`,
                    })
                    .where(sql`${products.id} = ${item.productId}`)

                // Update per-location stock
                if (targetLocation) {
                    const [existingStock] = await tx
                        .select()
                        .from(stock)
                        .where(and(eq(stock.productId, item.productId), eq(stock.locationId, targetLocation.id)))
                        .limit(1)

                    if (existingStock) {
                        await tx
                            .update(stock)
                            .set({
                                quantityOnHand: sql`${stock.quantityOnHand} + ${quantityChange}`,
                                updatedAt: new Date(),
                            })
                            .where(eq(stock.id, existingStock.id))
                    } else {
                        const fallbackQty = Number(product.stock || 0) + quantityChange
                        await tx.insert(stock).values({
                            productId: item.productId,
                            locationId: targetLocation.id,
                            quantityOnHand: Math.max(0, fallbackQty).toString(),
                            quantityReserved: "0",
                            reorderLevel: Number(product.minStock || 10),
                            reorderQuantity: 20,
                            updatedAt: new Date(),
                        })
                    }
                }

                // 4. Create Stock Movement Record
                const movementType = normalizedType === "sale" ? "out" : "in"
                await tx.insert(stockMovements).values({
                    productId: item.productId,
                    productName: item.productName,
                    type: movementType,
                    quantity: quantityChange.toString(),
                    userId: sanitizedUserId,
                    locationId: targetLocation?.id || null,
                    referenceId: newTransaction.id,
                    referenceType: "transaction",
                    notes: `Transaction ${newTransaction.id}`,
                })
            }

            // 6. Update Client Credit Balance if applicable
            if (clientId && normalizedPaymentMethod === "credit") {
                await tx
                    .update(clients)
                    .set({
                        creditBalance: sql`${clients.creditBalance} + ${total}`,
                    })
                    .where(eq(clients.id, sanitizedClientId))

                const dueDate = new Date()
                dueDate.setDate(dueDate.getDate() + 30)

                await tx.insert(creditRecords).values({
                    clientId: sanitizedClientId,
                    transactionId: newTransaction.id,
                    amount: total.toString(),
                    paidAmount: "0",
                    dueDate,
                    status: "pending",
                })
            }

            return {
                ...newTransaction,
                paymentCreated: !!paymentEntry,
                paymentEntryId: paymentEntry?.id || null,
                debug: {
                    normalizedType,
                    normalizedPaymentMethod,
                },
            }
        })

        return NextResponse.json(result)
    } catch (error: any) {
        console.error("Failed to create transaction:", error)
        const errorMessage = error.message || "Failed to create transaction"
        return NextResponse.json({ error: errorMessage }, { status: error.message ? 400 : 500 })
    }
}
