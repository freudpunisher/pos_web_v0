/**
 * Script to seed categories
 * Usage: npx tsx scripts/seed-categories.ts
 */

import db from "../lib/db"
import { categories, products } from "../lib/db/schema"

const SEED_CATEGORIES = [
  {
    name: "Electronics",
    description: "Electronic devices and accessories"
  },
  {
    name: "Clothing",
    description: "Apparel and fashion items"
  },
  {
    name: "Food & Beverages",
    description: "Food products and drinks"
  },
  {
    name: "Home & Garden",
    description: "Home and garden supplies"
  },
  {
    name: "Sports & Outdoors",
    description: "Sports equipment and outdoor gear"
  },
  {
    name: "Books & Media",
    description: "Books, magazines, and media"
  },
  {
    name: "Beauty & Personal Care",
    description: "Beauty and personal care products"
  },
  {
    name: "Toys & Games",
    description: "Toys, games, and entertainment"
  }
]

async function seedCategories() {
  try {
    console.log("Seeding categories...")

    // Clear existing products first (due to foreign key constraint)
    await db.delete(products)
    // Then clear categories
    await db.delete(categories)

    // Insert categories
    const result = await db.insert(categories).values(SEED_CATEGORIES).returning()

    console.log(`✓ Successfully seeded ${result.length} categories:`)
    result.forEach((cat) => {
      console.log(`  - ${cat.name}`)
    })

    process.exit(0)
  } catch (error) {
    console.error("Error seeding categories:", error)
    process.exit(1)
  }
}

seedCategories()
