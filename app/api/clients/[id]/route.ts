import { NextResponse } from "next/server"
import db from "@/lib/db"
import { clients } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { name, email, phone, address, creditLimit, isActive } = body

        const [updatedClient] = await db
            .update(clients)
            .set({
                name,
                email,
                phone,
                address,
                creditLimit: creditLimit?.toString(),
                isActive,
            })
            .where(eq(clients.id, id))
            .returning()

        if (!updatedClient) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 })
        }

        return NextResponse.json(updatedClient)
    } catch (error) {
        console.error("Failed to update client:", error)
        return NextResponse.json({ error: "Failed to update client" }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const body = await request.json()
        const { isActive } = body

        if (isActive === undefined) {
            return NextResponse.json({ error: "isActive field is required" }, { status: 400 })
        }

        const [updatedClient] = await db
            .update(clients)
            .set({ isActive })
            .where(eq(clients.id, id))
            .returning()

        if (!updatedClient) {
            return NextResponse.json({ error: "Client not found" }, { status: 404 })
        }

        return NextResponse.json(updatedClient)
    } catch (error) {
        console.error("Failed to update client status:", error)
        return NextResponse.json({ error: "Failed to update client status" }, { status: 500 })
    }
}
