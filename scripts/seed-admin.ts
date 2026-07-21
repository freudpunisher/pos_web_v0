/**
 * Script to seed the admin user
 * Usage: npx tsx scripts/seed-admin.ts
 */

import db from "../lib/db"
import { users } from "../lib/db/schema"
import { hashPassword } from "../lib/password"
import { eq } from "drizzle-orm"

const ADMIN_ID = "2f83e92d-b719-4c15-919f-e2ff7640f1c4"
const ADMIN_EMAIL = "admin@admin.com"
const ADMIN_PASSWORD = "password123" // Default password
const ADMIN_NAME = "admin"

async function seedAdmin() {
    try {
        console.log("Seeding admin user...")

        const hashedPassword = await hashPassword(ADMIN_PASSWORD)

        // Check if user exists (though we expect empty DB based on recent checks)
        const existingUser = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.email, ADMIN_EMAIL)
        })

        if (existingUser) {
            console.log("Admin user already exists. Updating password...")
            await db.update(users)
                .set({
                    password: hashedPassword,
                    id: ADMIN_ID // Ensure ID matches our fallback expectation
                })
                .where(eq(users.email, ADMIN_EMAIL))
        } else {
            console.log("Creating new admin user...")
            await db.insert(users).values({
                id: ADMIN_ID,
                name: ADMIN_NAME,
                email: ADMIN_EMAIL,
                role: "admin",
                password: hashedPassword,
                avatar: "/admin-avatar.png"
            })
        }

        console.log(`✓ Admin user ready:`)
        console.log(`  Email: ${ADMIN_EMAIL}`)
        console.log(`  Password: ${ADMIN_PASSWORD}`)
        console.log(`  ID: ${ADMIN_ID}`)

        process.exit(0)
    } catch (error) {
        console.error("Error seeding admin:", error)
        process.exit(1)
    }
}

seedAdmin()
