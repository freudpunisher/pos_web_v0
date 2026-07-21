import { NextResponse } from "next/server"
import db from "@/lib/db"
import { users } from "@/lib/db/schema"
import { asc } from "drizzle-orm"
import { hashPassword } from "@/lib/password"
import { requireAuth, requireAdmin } from "@/lib/auth-guard"

export async function GET() {
    try {
        const { error } = await requireAuth()
        if (error) return error

        const allUsers = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
                role: users.role,
                avatar: users.avatar,
            })
            .from(users)
            .orderBy(asc(users.name))
        return NextResponse.json(allUsers)
    } catch (error) {
        console.error("Failed to fetch users:", error)
        return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const body = await request.json()
        const { name, email, phone, role, avatar, password } = body

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Name, email, and password are required" },
                { status: 400 }
            )
        }

        // Hash password before storing
        const hashedPassword = await hashPassword(password)

        const [newUser] = await db
            .insert(users)
            .values({
                name,
                email,
                phone,
                role: role || "cashier_food",
                password: hashedPassword,
                avatar,
            })
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
                role: users.role,
                avatar: users.avatar,
            })

        return NextResponse.json(newUser)
    } catch (error) {
        console.error("Failed to create user:", error)
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }
}
