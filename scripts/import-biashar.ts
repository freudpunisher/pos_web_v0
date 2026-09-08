/**
 * Import catalogue "Ets chez maman docteur" (export BiasharApp PDF) into SmartPOS.
 *
 * Decisions (validated with user):
 *  - Currency: everything converted to FC at 1 USD = 2400 FC (app is FC-only).
 *  - Taxonomy: create 4 product_types + 9 measurement_units; one unit per product.
 *  - Sucre gros corrected from 38/40 FC (anomaly) to 38,000/40,000 FC.
 *  - Stock assigned to the "Principal" location.
 *  - Step 1 cleans all current products/taxonomy + the single demo transaction.
 *
 * Usage: npx tsx scripts/import-biashar.ts
 */

import db, { pool } from "../lib/db"
import {
    products,
    productSellingUnits,
    measurementUnits,
    productTypes,
    stock,
    locations,
    categories,
    subcategories,
    categoryGroups,
    transactions,
    transactionItems,
    stockMovements,
    stockAdjustments,
    stockTransfers,
    stockTransferItems,
    purchaseOrders,
    purchaseOrderItems,
    inventory,
    inventoryItems,
    recipes,
    recipeIngredients,
    productionRuns,
} from "../lib/db/schema"
import { eq } from "drizzle-orm"

const USD_RATE = 2400

const UNITS: { code: string; name: string; symbol: string }[] = [
    { code: "PIECE", name: "Pièce", symbol: "pce" },
    { code: "SACHET", name: "Sachet", symbol: "sach" },
    { code: "SAC", name: "Sac", symbol: "sac" },
    { code: "CARTON", name: "Carton", symbol: "ctn" },
    { code: "BOITE", name: "Boîte", symbol: "bt" },
    { code: "BIDON", name: "Bidon", symbol: "bdn" },
    { code: "PAQUET", name: "Paquet", symbol: "pq" },
    { code: "KG", name: "Kg", symbol: "kg" },
    { code: "DOUZAINE", name: "Douzaine", symbol: "dz" },
]

const TYPES: { name: string; slug: string; icon: string; color: string; sortOrder: number }[] = [
    { name: "Boissons", slug: "drink", icon: "GlassWater", color: "bg-blue-500/20 text-blue-700", sortOrder: 1 },
    { name: "Épicerie & Alimentation", slug: "food", icon: "ShoppingBag", color: "bg-amber-500/20 text-amber-700", sortOrder: 2 },
    { name: "Bonbons & Snacks", slug: "snacks", icon: "Candy", color: "bg-pink-500/20 text-pink-700", sortOrder: 3 },
    { name: "Hygiène & Ménage", slug: "household", icon: "Sparkles", color: "bg-emerald-500/20 text-emerald-700", sortOrder: 4 },
]

interface Row {
    name: string
    typeSlug: string
    unitCode: string
    buy: string
    sell: string
    stock: number
    history: string
}

function fc(value: string): number {
    const n = Number(value.replace(/ /g, "").replace(/,/g, "").replace("$", "").replace("FC", ""))
    return value.includes("$") ? Math.round(n * USD_RATE) : Math.round(n)
}

// Source data from the PDF (unit simplified to the primary unit; prices USD or FC as in file).
const ROWS: Row[] = [
    { name: "Anga", typeSlug: "snacks", unitCode: "PIECE", buy: "4.00 $", sell: "5.00 $", stock: 34, history: "vendu" },
    { name: "Avital 1.5l", typeSlug: "drink", unitCode: "SACHET", buy: "4,680 FC", sell: "5,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Avital 500ml", typeSlug: "drink", unitCode: "SACHET", buy: "4,680 FC", sell: "5,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Bavaria", typeSlug: "drink", unitCode: "PIECE", buy: "23.50 $", sell: "25.00 $", stock: 1, history: "jamais vendu" },
    { name: "Big jus", typeSlug: "drink", unitCode: "PIECE", buy: "9.50 $", sell: "10.00 $", stock: 64, history: "vendu" },
    { name: "Bonbon ivoire 100fc", typeSlug: "snacks", unitCode: "PIECE", buy: "2,625 FC", sell: "3,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Bonbon rouge 100fc", typeSlug: "snacks", unitCode: "SACHET", buy: "2,625 FC", sell: "3,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Bonbon tamu", typeSlug: "snacks", unitCode: "BOITE", buy: "5,700 FC", sell: "7,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Cotex", typeSlug: "household", unitCode: "SACHET", buy: "8,160 FC", sell: "10,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Cowbell détail", typeSlug: "food", unitCode: "KG", buy: "12,878 FC", sell: "17,000 FC", stock: 17.5, history: "vendu" },
    { name: "Cowbell sac", typeSlug: "food", unitCode: "SAC", buy: "137.00 $", sell: "139.00 $", stock: 1, history: "jamais vendu" },
    { name: "Drosdy 5l", typeSlug: "drink", unitCode: "PIECE", buy: "16.75 $", sell: "18.00 $", stock: 1, history: "jamais vendu" },
    { name: "Eau ma vie", typeSlug: "drink", unitCode: "PIECE", buy: "767 FC", sell: "1,000 FC", stock: 39, history: "vendu" },
    { name: "Essuie tout", typeSlug: "household", unitCode: "PIECE", buy: "0.95 $", sell: "1.10 $", stock: 20, history: "jamais vendu" },
    { name: "Fontera", typeSlug: "food", unitCode: "SAC", buy: "157.00 $", sell: "162.00 $", stock: 1, history: "jamais vendu" },
    { name: "Huile A1", typeSlug: "food", unitCode: "PIECE", buy: "31.00 $", sell: "32.00 $", stock: 7, history: "jamais vendu" },
    { name: "Huile christal", typeSlug: "food", unitCode: "PIECE", buy: "11.75 $", sell: "12.50 $", stock: 12, history: "jamais vendu" },
    { name: "Huile zahabu", typeSlug: "food", unitCode: "BIDON", buy: "31.50 $", sell: "33.00 $", stock: 2, history: "vendu" },
    { name: "Jojo fresh", typeSlug: "snacks", unitCode: "PAQUET", buy: "6,300 FC", sell: "8,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Jus Inyange", typeSlug: "drink", unitCode: "CARTON", buy: "16.50 $", sell: "18.00 $", stock: 18, history: "vendu" },
    { name: "Jus sana bouteille", typeSlug: "drink", unitCode: "PIECE", buy: "3.50 $", sell: "3.80 $", stock: 50, history: "jamais vendu" },
    { name: "Jus sana carton", typeSlug: "drink", unitCode: "CARTON", buy: "2.90 $", sell: "3.10 $", stock: 50, history: "jamais vendu" },
    { name: "Lait inyange 500ml", typeSlug: "food", unitCode: "PIECE", buy: "6.50 $", sell: "8.00 $", stock: 9, history: "jamais vendu" },
    { name: "Magaju", typeSlug: "food", unitCode: "SAC", buy: "14.50 $", sell: "15.50 $", stock: 19.5, history: "vendu" },
    { name: "Mayonnaise culino", typeSlug: "food", unitCode: "CARTON", buy: "34.00 $", sell: "40.00 $", stock: 48.42, history: "vendu" },
    { name: "Mayonnaise jambo", typeSlug: "food", unitCode: "PIECE", buy: "29.50 $", sell: "35.00 $", stock: 10, history: "jamais vendu" },
    { name: "Mirinda moyenne", typeSlug: "drink", unitCode: "SACHET", buy: "5.20 $", sell: "5.50 $", stock: 25, history: "vendu" },
    { name: "Nido 400gr", typeSlug: "food", unitCode: "PIECE", buy: "13,121 FC", sell: "15,275 FC", stock: 20, history: "vendu" },
    { name: "Omo", typeSlug: "household", unitCode: "SAC", buy: "8.00 $", sell: "8.50 $", stock: 2, history: "vendu" },
    { name: "Omo halisi", typeSlug: "household", unitCode: "SAC", buy: "16.00 $", sell: "18.00 $", stock: 3, history: "jamais vendu" },
    { name: "Pampers best", typeSlug: "household", unitCode: "SACHET", buy: "7.25 $", sell: "8.00 $", stock: 1, history: "jamais vendu" },
    { name: "Pampers mamy lov", typeSlug: "household", unitCode: "SACHET", buy: "8.88 $", sell: "9.25 $", stock: 1, history: "jamais vendu" },
    { name: "Papier mouchoirs", typeSlug: "household", unitCode: "CARTON", buy: "29.50 $", sell: "30.50 $", stock: 0, history: "vendu" },
    { name: "Papier serviette", typeSlug: "household", unitCode: "PIECE", buy: "5.70 $", sell: "7.00 $", stock: 11, history: "vendu" },
    { name: "PH", typeSlug: "household", unitCode: "SACHET", buy: "10.00 $", sell: "11.00 $", stock: 9.8, history: "vendu" },
    { name: "Rina 5l", typeSlug: "household", unitCode: "PIECE", buy: "42.50 $", sell: "43.50 $", stock: 0, history: "vendu" },
    { name: "Riz pakistant", typeSlug: "food", unitCode: "PIECE", buy: "17.00 $", sell: "18.00 $", stock: 7, history: "vendu" },
    { name: "Sardine Anny", typeSlug: "food", unitCode: "PIECE", buy: "1,368 FC", sell: "2,500 FC", stock: 113, history: "jamais vendu" },
    { name: "Savon sicovir (Carton)", typeSlug: "household", unitCode: "CARTON", buy: "24.00 $", sell: "25.00 $", stock: 1, history: "jamais vendu" },
    { name: "Savon sicovir (Pièce)", typeSlug: "household", unitCode: "PIECE", buy: "24.00 $", sell: "25.00 $", stock: 31, history: "vendu" },
    { name: "Savons bora", typeSlug: "household", unitCode: "CARTON", buy: "6.60 $", sell: "7.50 $", stock: 1, history: "jamais vendu" },
    { name: "Savons prince 800gr", typeSlug: "household", unitCode: "PIECE", buy: "19.80 $", sell: "20.50 $", stock: 1, history: "jamais vendu" },
    { name: "Sel 25 kg", typeSlug: "food", unitCode: "SAC", buy: "8.50 $", sell: "9.50 $", stock: 2, history: "vendu" },
    { name: "Sucre gros", typeSlug: "food", unitCode: "SAC", buy: "38,000 FC", sell: "40,000 FC", stock: 1.76, history: "vendu" },
    { name: "Sunseed 5l", typeSlug: "drink", unitCode: "CARTON", buy: "47.50 $", sell: "50.00 $", stock: 9, history: "vendu" },
    { name: "Super glue", typeSlug: "household", unitCode: "DOUZAINE", buy: "5,760 FC", sell: "7,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Tonic", typeSlug: "drink", unitCode: "SACHET", buy: "5.20 $", sell: "5.50 $", stock: 50, history: "jamais vendu" },
    { name: "Vinaigre", typeSlug: "food", unitCode: "PIECE", buy: "1,200 FC", sell: "2,000 FC", stock: 1, history: "jamais vendu" },
    { name: "Énergie tangawizi", typeSlug: "drink", unitCode: "PIECE", buy: "10.50 $", sell: "11.00 $", stock: 6, history: "vendu" },
]

const TYPE_PREFIX: Record<string, string> = { drink: "BVS", food: "EPI", snacks: "BON", household: "HYG" }

async function main() {
    const principal = await db.select().from(locations).where(eq(locations.name, "Principal")).limit(1)
    if (!principal.length) throw new Error("Location 'Principal' not found — create it first.")
    const locationId = principal[0].id

    const before = {
        products: await db.select().from(products),
        txns: await db.select().from(transactions),
        types: await db.select().from(productTypes),
        units: await db.select().from(measurementUnits),
        cats: await db.select().from(categories),
    }

    console.log("── Plan ───────────────────────────────────────────────")
    console.log(`Fichier: 49 produits (${ROWS.length} parsés)`)
    console.log(`Nettoyage: ${before.products.length} produits, ${before.txns.length} transaction(s), ${before.cats.length} catégories actuelles`)
    console.log(`Devise: 1 $ = ${USD_RATE} FC → tous les prix en FC`)
    console.log(`Types: ${TYPES.map((t) => t.name).join(", ")}`)
    console.log(`Unités: ${UNITS.map((u) => u.name).join(", ")}`)
    console.log(`Localisation stock: Principal (${locationId})`)
    const sample = ROWS.slice(0, 3).map((r) => `${r.name}: ${fc(r.buy)} FC → ${fc(r.sell)} FC`)
    console.log(`Exemples: ${sample.join(" | ")}`)

    const result = await db.transaction(async (tx) => {
        // 1) Cleanup (FK-safe order)
        for (const table of [transactionItems, transactions, stockMovements, stockAdjustments, stockTransferItems, stockTransfers, purchaseOrderItems, purchaseOrders, inventoryItems, inventory, recipeIngredients, recipes, productionRuns, productSellingUnits, stock, products]) {
            await tx.delete(table as any)
        }
        await tx.delete(subcategories).catch(() => undefined)
        await tx.delete(categories as any)
        await tx.delete(productTypes as any)
        await tx.delete(measurementUnits as any)
        await tx.delete(categoryGroups as any).catch(() => undefined)

        // 2) Taxonomy
        const insertedUnits = await tx.insert(measurementUnits).values(UNITS.map((u) => ({ ...u, isActive: true }))).returning()
        const unitByCode = Object.fromEntries(insertedUnits.map((u) => [u.code, u.id]))
        const unitNameByCode = Object.fromEntries(insertedUnits.map((u) => [u.code, u.name]))
        const insertedTypes = await tx.insert(productTypes).values(TYPES).returning()
        const typeBySlug = Object.fromEntries(insertedTypes.map((t) => [t.slug, t.id]))

        // 3) Products
        const counters: Record<string, number> = {}
        const newProducts: typeof products.$inferInsert[] = []
        const stockRows: typeof stock.$inferInsert[] = []
        const unitRows: typeof productSellingUnits.$inferInsert[] = []

        for (const row of ROWS) {
            const typeId = typeBySlug[row.typeSlug]
            const prefix = TYPE_PREFIX[row.typeSlug]
            counters[prefix] = (counters[prefix] || 0) + 1
            const sku = `${prefix}-${String(counters[prefix]).padStart(3, "0")}`
            const buy = fc(row.buy)
            const sell = fc(row.sell)
            if (buy > sell) console.warn(`  ⚠ ${row.name}: achat (${buy}) > vente (${sell})`)
            newProducts.push({
                sku,
                name: row.name,
                productTypeId: typeId,
                price: sell.toString(),
                cost: buy.toString(),
                stock: row.stock.toString(),
                minStock: 0,
            })
            stockRows.push({
                productId: "",
                locationId,
                quantityOnHand: row.stock.toString(),
                quantityReserved: "0",
                reorderLevel: 5,
                reorderQuantity: 0,
            })
            unitRows.push({
                productId: "",
                name: unitNameByCode[row.unitCode],
                unitId: unitByCode[row.unitCode],
                price: sell.toString(),
                conversionFactor: "1",
                isDefault: true,
                sortOrder: 0,
            })
        }

        const insertedProducts = await tx.insert(products).values(newProducts).returning()
        for (let i = 0; i < insertedProducts.length; i++) {
            stockRows[i].productId = insertedProducts[i].id
            unitRows[i].productId = insertedProducts[i].id
        }
        await tx.insert(stock).values(stockRows)
        await tx.insert(productSellingUnits).values(unitRows)

        return insertedProducts.length
    })

    console.log("\n✓ Import terminé:")
    console.log(`  Produits: ${result}`)

    const end = {
        products: await db.select().from(products),
        types: await db.select().from(productTypes),
        units: await db.select().from(measurementUnits),
        cats: await db.select().from(categories),
    }
    console.log(`  Vérif: ${end.products.length} produits | ${end.types.length} types | ${end.units.length} unités | ${end.cats.length} catégories restantes`)
    await pool.end()
}

main().catch(async (e) => {
    console.error("Erreur:", e)
    await pool.end().catch(() => undefined)
    process.exit(1)
})