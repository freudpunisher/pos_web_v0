import { NextResponse } from "next/server"
import db from "@/lib/db"
import { caisseSessions, caisseMovements, transactions, expenses } from "@/lib/db/schema"
import { eq, and, desc, gte, lte, sql } from "drizzle-orm"
import { requireAuth } from "@/lib/auth-guard"

export async function GET() {
    try {
        const sessions = await db.query.caisseSessions.findMany({
            with: {
                user: { columns: { id: true, name: true } },
                location: { columns: { id: true, name: true } },
                movements: true,
            },
            orderBy: [desc(caisseSessions.openedAt)],
        })
        return NextResponse.json(sessions)
    } catch (error) {
        console.error("Failed to fetch caisse sessions:", error)
        return NextResponse.json({ error: "Failed to fetch caisse sessions" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const auth = await requireAuth()
        if (auth.error) return auth.error

        const body = await request.json()
        const { openingBalance, notes } = body

        // Check if there's ANY open session globally (single caisse)
        const [existingOpen] = await db
            .select()
            .from(caisseSessions)
            .where(eq(caisseSessions.status, "open"))
            .limit(1)

        if (existingOpen) {
            return NextResponse.json(
                { error: "Une session est déjà ouverte. Fermez-la avant d'en ouvrir une nouvelle." },
                { status: 400 }
            )
        }

        const [session] = await db
            .insert(caisseSessions)
            .values({
                userId: auth.payload.userId,
                openingBalance: (openingBalance || 0).toString(),
                notes: notes || null,
                status: "open",
            })
            .returning()

        return NextResponse.json(session)
    } catch (error) {
        console.error("Failed to open caisse session:", error)
        return NextResponse.json({ error: "Failed to open caisse session" }, { status: 500 })
    }
}
