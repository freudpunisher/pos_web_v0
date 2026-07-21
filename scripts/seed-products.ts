/**
 * Script to seed products
 * Usage: npx tsx scripts/seed-products.ts
 */

import db from "../lib/db"
import { products, categories } from "../lib/db/schema"
import { eq } from "drizzle-orm"

interface SeedProduct {
  sku: string
  name: string
  categoryName: string
  price: number
  stock: number
  minStock: number
  image?: string
}

const SEED_PRODUCTS: SeedProduct[] = [
  // Electronics
  {
    sku: "ELEC-001",
    name: "Wireless Mouse",
    categoryName: "Electronics",
    price: 29.99,
    stock: 50,
    minStock: 10,
    image: "/products/wireless-mouse.jpg"
  },
  {
    sku: "ELEC-002",
    name: "USB-C Cable",
    categoryName: "Electronics",
    price: 12.99,
    stock: 100,
    minStock: 20,
    image: "/products/usb-cable.jpg"
  },
  {
    sku: "ELEC-003",
    name: "Mechanical Keyboard",
    categoryName: "Electronics",
    price: 79.99,
    stock: 30,
    minStock: 5,
    image: "/products/keyboard.jpg"
  },
  {
    sku: "ELEC-004",
    name: "4K Monitor",
    categoryName: "Electronics",
    price: 399.99,
    stock: 15,
    minStock: 3,
    image: "/products/monitor.jpg"
  },

  // Clothing
  {
    sku: "CLTH-001",
    name: "Cotton T-Shirt",
    categoryName: "Clothing",
    price: 19.99,
    stock: 75,
    minStock: 15,
    image: "/products/tshirt.jpg"
  },
  {
    sku: "CLTH-002",
    name: "Denim Jeans",
    categoryName: "Clothing",
    price: 59.99,
    stock: 45,
    minStock: 10,
    image: "/products/jeans.jpg"
  },
  {
    sku: "CLTH-003",
    name: "Casual Sneakers",
    categoryName: "Clothing",
    price: 89.99,
    stock: 40,
    minStock: 8,
    image: "/products/sneakers.jpg"
  },
  {
    sku: "CLTH-004",
    name: "Winter Jacket",
    categoryName: "Clothing",
    price: 149.99,
    stock: 25,
    minStock: 5,
    image: "/products/jacket.jpg"
  },

  // Food & Beverages
  {
    sku: "FOOD-001",
    name: "Premium Coffee Beans",
    categoryName: "Food & Beverages",
    price: 14.99,
    stock: 80,
    minStock: 15,
    image: "/products/coffee.jpg"
  },
  {
    sku: "FOOD-002",
    name: "Organic Whole Milk",
    categoryName: "Food & Beverages",
    price: 4.99,
    stock: 120,
    minStock: 30,
    image: "/products/milk.jpg"
  },
  {
    sku: "FOOD-003",
    name: "Fresh Bread",
    categoryName: "Food & Beverages",
    price: 3.99,
    stock: 60,
    minStock: 20,
    image: "/products/bread.jpg"
  },
  {
    sku: "FOOD-004",
    name: "Bottled Water Case",
    categoryName: "Food & Beverages",
    price: 9.99,
    stock: 150,
    minStock: 40,
    image: "/products/water.jpg"
  },

  // Home & Garden
  {
    sku: "HOME-001",
    name: "LED Desk Lamp",
    categoryName: "Home & Garden",
    price: 34.99,
    stock: 55,
    minStock: 10,
    image: "/products/lamp.jpg"
  },
  {
    sku: "HOME-002",
    name: "Bedding Set",
    categoryName: "Home & Garden",
    price: 79.99,
    stock: 35,
    minStock: 8,
    image: "/products/bedding.jpg"
  },
  {
    sku: "HOME-003",
    name: "Kitchen Knife Set",
    categoryName: "Home & Garden",
    price: 49.99,
    stock: 42,
    minStock: 10,
    image: "/products/knives.jpg"
  },
  {
    sku: "HOME-004",
    name: "Garden Shovel",
    categoryName: "Home & Garden",
    price: 24.99,
    stock: 38,
    minStock: 8,
    image: "/products/shovel.jpg"
  },

  // Sports & Outdoors
  {
    sku: "SPORT-001",
    name: "Running Shoes",
    categoryName: "Sports & Outdoors",
    price: 119.99,
    stock: 35,
    minStock: 7,
    image: "/products/running-shoes.jpg"
  },
  {
    sku: "SPORT-002",
    name: "Yoga Mat",
    categoryName: "Sports & Outdoors",
    price: 29.99,
    stock: 65,
    minStock: 15,
    image: "/products/yoga-mat.jpg"
  },
  {
    sku: "SPORT-003",
    name: "Dumbbell Set",
    categoryName: "Sports & Outdoors",
    price: 99.99,
    stock: 25,
    minStock: 5,
    image: "/products/dumbbells.jpg"
  },
  {
    sku: "SPORT-004",
    name: "Bicycle Helmet",
    categoryName: "Sports & Outdoors",
    price: 59.99,
    stock: 45,
    minStock: 10,
    image: "/products/helmet.jpg"
  },

  // Books & Media
  {
    sku: "BOOK-001",
    name: "Fiction Novel",
    categoryName: "Books & Media",
    price: 16.99,
    stock: 70,
    minStock: 15,
    image: "/products/novel.jpg"
  },
  {
    sku: "BOOK-002",
    name: "Self-Help Guide",
    categoryName: "Books & Media",
    price: 19.99,
    stock: 50,
    minStock: 10,
    image: "/products/selfhelp.jpg"
  },
  {
    sku: "BOOK-003",
    name: "Educational Textbook",
    categoryName: "Books & Media",
    price: 89.99,
    stock: 30,
    minStock: 5,
    image: "/products/textbook.jpg"
  },
  {
    sku: "BOOK-004",
    name: "Magazine Subscription",
    categoryName: "Books & Media",
    price: 9.99,
    stock: 100,
    minStock: 20,
    image: "/products/magazine.jpg"
  },

  // Beauty & Personal Care
  {
    sku: "BEAUTY-001",
    name: "Facial Moisturizer",
    categoryName: "Beauty & Personal Care",
    price: 32.99,
    stock: 55,
    minStock: 12,
    image: "/products/moisturizer.jpg"
  },
  {
    sku: "BEAUTY-002",
    name: "Shampoo Bottle",
    categoryName: "Beauty & Personal Care",
    price: 12.99,
    stock: 85,
    minStock: 20,
    image: "/products/shampoo.jpg"
  },
  {
    sku: "BEAUTY-003",
    name: "Lipstick Set",
    categoryName: "Beauty & Personal Care",
    price: 39.99,
    stock: 45,
    minStock: 10,
    image: "/products/lipstick.jpg"
  },
  {
    sku: "BEAUTY-004",
    name: "Toothbrush Pack",
    categoryName: "Beauty & Personal Care",
    price: 8.99,
    stock: 120,
    minStock: 30,
    image: "/products/toothbrush.jpg"
  },

  // Toys & Games
  {
    sku: "TOY-001",
    name: "Board Game",
    categoryName: "Toys & Games",
    price: 34.99,
    stock: 40,
    minStock: 8,
    image: "/products/boardgame.jpg"
  },
  {
    sku: "TOY-002",
    name: "Action Figure",
    categoryName: "Toys & Games",
    price: 24.99,
    stock: 60,
    minStock: 15,
    image: "/products/figure.jpg"
  },
  {
    sku: "TOY-003",
    name: "Puzzle Set",
    categoryName: "Toys & Games",
    price: 19.99,
    stock: 50,
    minStock: 10,
    image: "/products/puzzle.jpg"
  },
  {
    sku: "TOY-004",
    name: "Video Game",
    categoryName: "Toys & Games",
    price: 59.99,
    stock: 35,
    minStock: 8,
    image: "/products/game.jpg"
  }
]

async function seedProducts() {
  try {
    console.log("Seeding products...")

    // Get all categories
    const allCategories = await db.select().from(categories)
    const categoryMap = new Map(allCategories.map((cat) => [cat.name, cat.id]))

    // Prepare product data with category IDs
    const productsToInsert = SEED_PRODUCTS.map((product) => ({
      sku: product.sku,
      name: product.name,
      categoryId: categoryMap.get(product.categoryName),
      price: product.price.toString(),
      stock: product.stock.toString(),
      minStock: product.minStock,
      image: product.image || null
    }))

    // Clear existing products
    await db.delete(products)

    // Insert products
    const result = await db.insert(products).values(productsToInsert).returning()

    console.log(`✓ Successfully seeded ${result.length} products:`)

    // Group by category for display
    const byCategory = new Map<string, typeof result>()
    result.forEach((prod) => {
      const category = allCategories.find((c) => c.id === prod.categoryId)?.name || "Unknown"
      if (!byCategory.has(category)) {
        byCategory.set(category, [])
      }
      byCategory.get(category)!.push(prod)
    })

    byCategory.forEach((products, category) => {
      console.log(`\n  ${category}:`)
      products.forEach((prod) => {
        console.log(`    - ${prod.sku}: ${prod.name} (Stock: ${prod.stock}, Price: $${prod.price})`)
      })
    })

    process.exit(0)
  } catch (error) {
    console.error("Error seeding products:", error)
    process.exit(1)
  }
}

seedProducts()
