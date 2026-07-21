import { NextResponse } from "next/server"
import db from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { comparePassword, hashPassword } from "@/lib/password"
import { requireAuth } from "@/lib/auth-guard"

export async function POST(request: Request) {
  try {
    const { error, payload } = await requireAuth()
    if (error || !payload) return error

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required" },
        { status: 400 },
      )
    }

    const [user] = await db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const isValid = await comparePassword(currentPassword, user.password)
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }

    const hashed = await hashPassword(newPassword)
    await db.update(users).set({ password: hashed }).where(eq(users.id, user.id))

    return NextResponse.json({ message: "Password updated" })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
  }
}
