import { NextResponse } from "next/server"
import db from "@/lib/db"
import { suppliers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { requireAuth } from "@/lib/auth-guard"

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    if (auth.payload?.role !== "admin" && auth.payload?.role !== "manager") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const { id } = await params
        const body = await request.json()
        const { name, email, phone, address, isActive } = body

        const [updatedSupplier] = await db
            .update(suppliers)
            .set({
                name,
                email,
                phone,
                address,
                isActive,
            })
            .where(eq(suppliers.id, id))
            .returning()

        if (!updatedSupplier) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
        }

        return NextResponse.json(updatedSupplier)
    } catch (error) {
        console.error("Failed to update supplier:", error)
        return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 })
    }
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireAuth()
    if (auth.error) return auth.error
    if (auth.payload?.role !== "admin" && auth.payload?.role !== "manager") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    try {
        const { id } = await params
        const body = await request.json()
        const { isActive } = body

        if (isActive === undefined) {
            return NextResponse.json({ error: "isActive field is required" }, { status: 400 })
        }

        const [updatedSupplier] = await db
            .update(suppliers)
            .set({ isActive })
            .where(eq(suppliers.id, id))
            .returning()

        if (!updatedSupplier) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 })
        }

        return NextResponse.json(updatedSupplier)
    } catch (error) {
        console.error("Failed to update supplier status:", error)
        return NextResponse.json({ error: "Failed to update supplier status" }, { status: 500 })
    }
}
