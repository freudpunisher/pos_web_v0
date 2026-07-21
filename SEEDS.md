# Database Seeding

This directory contains scripts to seed the SmartPOS database with initial data.

## Available Scripts

### 1. `seed-admin.ts`
Seeds the database with an admin user account.

**Default Credentials:**
- Email: `admin@admin.com`
- Password: `password123`

**Run:**
```bash
npx tsx scripts/seed-admin.ts
```

### 2. `seed-categories.ts`
Seeds the database with 8 product categories:
- Electronics
- Clothing
- Food & Beverages
- Home & Garden
- Sports & Outdoors
- Books & Media
- Beauty & Personal Care
- Toys & Games

**Run:**
```bash
npx tsx scripts/seed-categories.ts
```

### 3. `seed-products.ts`
Seeds the database with 32 products across all categories.

**Products include:**
- 4 Electronics items (Wireless Mouse, USB Cable, Keyboard, Monitor)
- 4 Clothing items (T-Shirt, Jeans, Sneakers, Jacket)
- 4 Food & Beverages items (Coffee, Milk, Bread, Water)
- 4 Home & Garden items (Lamp, Bedding, Knives, Shovel)
- 4 Sports items (Running Shoes, Yoga Mat, Dumbbells, Helmet)
- 4 Books & Media items (Novel, Self-Help, Textbook, Magazine)
- 4 Beauty items (Moisturizer, Shampoo, Lipstick, Toothbrush)
- 4 Toys & Games items (Board Game, Figure, Puzzle, Video Game)

**Run:**
```bash
npx tsx scripts/seed-products.ts
```

### 4. `seed.ts` (Master Script)
Runs all seed scripts in the correct order:
1. Admin user
2. Categories
3. Products

**Run:**
```bash
npx tsx scripts/seed.ts
```

## Usage

### Fresh Database Setup
To seed a fresh database with all data:

```bash
# Option 1: Run master seed (recommended)
npx tsx scripts/seed.ts

# Option 2: Run individual seeds
npx tsx scripts/seed-admin.ts
npx tsx scripts/seed-categories.ts
npx tsx scripts/seed-products.ts
```

### Re-seeding
The scripts will clear existing data before seeding. Be careful as this **deletes all data** in the affected tables.

## Data Structure

### Categories
| Field | Type | Example |
|-------|------|---------|
| id | UUID | auto-generated |
| name | string | "Electronics" |
| description | string | "Electronic devices and accessories" |

### Products
| Field | Type | Example |
|-------|------|---------|
| id | UUID | auto-generated |
| sku | string (unique) | "ELEC-001" |
| name | string | "Wireless Mouse" |
| categoryId | UUID | references categories.id |
| price | decimal(12,2) | 29.99 |
| cost | decimal(12,2) | 15.00 |
| stock | integer | 50 |
| minStock | integer | 10 |
| image | string | "/products/wireless-mouse.jpg" |

### Users (Admin)
| Field | Type | Example |
|-------|------|---------|
| id | UUID | auto-generated |
| name | string | "admin" |
| email | string (unique) | "admin@admin.com" |
| password | string | hashed |
| role | enum | "admin" |
| avatar | string | "/admin-avatar.png" |

## Notes

- All UUIDs are auto-generated
- Timestamps default to current time
- Product images are placeholder paths - update image URLs as needed
- Default stock levels range from 15 to 150 units
- Minimum stock levels range from 3 to 40 units
- Prices range from $3.99 to $399.99
- Cost margins vary by category to simulate realistic pricing

## Customization

To modify the seed data:

1. Edit the `SEED_CATEGORIES` array in `seed-categories.ts`
2. Edit the `SEED_PRODUCTS` array in `seed-products.ts`
3. Adjust the admin credentials in `seed-admin.ts`
4. Re-run the relevant seed script

## Troubleshooting

### Foreign Key Constraint Error
If you get a foreign key constraint error when deleting categories, it's because products still reference them. The master script handles this automatically by deleting products first.

### Connection Errors
Ensure your database is running and the `DATABASE_URL` in `.env` is correct:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_pos
```

### Duplicate SKU Error
Each product must have a unique SKU. If you add custom products, ensure each has a unique identifier.

## Next Steps

After seeding:
1. Start the application: `npm run dev`
2. Login at http://localhost:3000 with admin@admin.com / password123
3. Navigate to Products page to see all seeded products
4. View categories in Settings or Product Management
