import { NextResponse } from "next/server"
import db from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { comparePassword } from "@/lib/password"
import { generateToken } from "@/lib/auth"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            )
        }

        // Find user by email
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1)

        if (!user) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            )
        }

        // Verify password
        const isValidPassword = await comparePassword(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            )
        }

        // Generate JWT token
        const token = await generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        })

        // Set HTTP-only cookie on the response
        const response = NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
        })

        response.cookies.set("auth-token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: "/",
        })

        return response
    } catch (error) {
        console.error("Login error:", error)
        return NextResponse.json(
            { error: "An error occurred during login" },
            { status: 500 }
        )
    }
}
