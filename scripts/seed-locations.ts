/**
 * Script to seed locations with new types
 * Usage: npx tsx scripts/seed-locations.ts
 */

import db from "../lib/db"
import { locations, stock, stockTransfers, stockTransferItems, stockMovements, stockAdjustments } from "../lib/db/schema"

const SEED_LOCATIONS = [
    { name: "Drink Warehouse", type: "principal" as const, isActive: true },
    { name: "Ingredient Warehouse", type: "principal" as const, isActive: true },
    { name: "Main Transitional Stock", type: "transitional" as const, isActive: true },
    { name: "Main Bar", type: "bar" as const, isActive: true },
    { name: "Main Kitchen", type: "kitchen" as const, isActive: true },
]

async function seedLocations() {
    try {
        console.log("Seeding locations...")

        // Clear dependent data first
        await db.delete(stockTransferItems)
        await db.delete(stockTransfers)
        await db.delete(stockMovements)
        await db.delete(stockAdjustments)
        await db.delete(stock)
        // Clear existing locations
        await db.delete(locations)

        // Insert locations
        const result = await db.insert(locations).values(SEED_LOCATIONS).returning()

        console.log(`✓ Successfully seeded ${result.length} locations:`)
        result.forEach((loc) => {
            console.log(`  - ${loc.name} (${loc.type})`)
        })

        process.exit(0)
    } catch (error) {
        console.error("Error seeding locations:", error)
        process.exit(1)
    }
}

seedLocations()
