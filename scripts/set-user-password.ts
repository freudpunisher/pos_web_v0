/**
 * Script to set a password for an existing user
 * Usage: npx tsx scripts/set-user-password.ts <email> <password>
 */

import db from "../lib/db"
import { users } from "../lib/db/schema"
import { eq } from "drizzle-orm"
import { hashPassword } from "../lib/password"

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
    console.error("Usage: npx tsx scripts/set-user-password.ts <email> <password>")
    process.exit(1)
}

async function setPassword() {
    try {
        const hashedPassword = await hashPassword(password)

        const result = await db
            .update(users)
            .set({ password: hashedPassword })
            .where(eq(users.email, email))
            .returning({ email: users.email, name: users.name })

        if (result.length === 0) {
            console.error(`User with email "${email}" not found`)
            process.exit(1)
        }

        console.log(`✓ Password set successfully for ${result[0].name} (${result[0].email})`)
        process.exit(0)
    } catch (error) {
        console.error("Error setting password:", error)
        process.exit(1)
    }
}

setPassword()
