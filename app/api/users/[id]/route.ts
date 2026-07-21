import { NextResponse } from "next/server"
import db from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAdmin } from "@/lib/auth-guard"
import { hashPassword } from "@/lib/password"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const body = await request.json()
        const { name, email, phone, role, avatar, password } = body

        const updateData: any = {
            name,
            email,
            phone,
            role,
            avatar,
        }

        if (password && password.trim() !== "") {
            updateData.password = await hashPassword(password)
        }

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, id))
            .returning({
                id: users.id,
                name: users.name,
                email: users.email,
                phone: users.phone,
                role: users.role,
                avatar: users.avatar,
            })

        if (!updatedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json(updatedUser)
    } catch (error) {
        console.error("Failed to update user:", error)
        return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    try {
        const authError = await requireAdmin()
        if (authError) return authError

        const [deletedUser] = await db.delete(users).where(eq(users.id, id)).returning()

        if (!deletedUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "User deleted successfully" })
    } catch (error) {
        console.error("Failed to delete user:", error)
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 })
    }
}
