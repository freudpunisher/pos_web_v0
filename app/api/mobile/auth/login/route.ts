import { NextResponse } from "next/server"
import db from "@/lib/db"
import { users, userLocations, locations } from "@/lib/db/schema"
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

        const isValidPassword = await comparePassword(password, user.password)
        if (!isValidPassword) {
            return NextResponse.json(
                { error: "Invalid email or password" },
                { status: 401 }
            )
        }

        const token = await generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        })

        // Fetch user's assigned locations
        const userLocs = await db
            .select({
                locationId: userLocations.locationId,
                locationName: locations.name,
                locationType: locations.type,
            })
            .from(userLocations)
            .innerJoin(locations, eq(userLocations.locationId, locations.id))
            .where(eq(userLocations.userId, user.id))

        return NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
            },
            locations: userLocs,
            token,
        })
    } catch (error) {
        console.error("Mobile login error:", error)
        return NextResponse.json(
            { error: "An error occurred during login" },
            { status: 500 }
        )
    }
}
