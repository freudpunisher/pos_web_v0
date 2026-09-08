import { NextResponse } from "next/server"
import db from "@/lib/db"
import { productSellingUnits, products, measurementUnits } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { verifyToken } from "@/lib/auth"

const ALLOWED_ROLES = ["admin", "manager"]

async function authenticate(request: Request) {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
        return null
    }
    const token = authHeader.substring(7)
    return await verifyToken(token)
}

// PATCH - update the sale price of a selling unit (admin / manager only)
export async function PATCH(request: Request) {
    try {
        const payload = await authenticate(request)
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }
        if (!ALLOWED_ROLES.includes(payload.role)) {
            return NextResponse.json(
                { error: "Forbidden: price management requires admin or manager role" },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { sellingUnitId, price } = body

        if (!sellingUnitId) {
            return NextResponse.json({ error: "Missing sellingUnitId" }, { status: 400 })
        }

        const newPrice = Number(price)
        if (!Number.isFinite(newPrice) || newPrice <= 0) {
            return NextResponse.json({ error: "Invalid price" }, { status: 400 })
        }

        const [unit] = await db
            .select()
            .from(productSellingUnits)
            .where(eq(productSellingUnits.id, sellingUnitId))
            .limit(1)
        if (!unit) {
            return NextResponse.json({ error: "Selling unit not found" }, { status: 404 })
        }

        await db
            .update(productSellingUnits)
            .set({ price: newPrice.toString() })
            .where(eq(productSellingUnits.id, sellingUnitId))

        // Keep legacy products.price in sync when editing the default selling unit
        if (unit.isDefault) {
            await db
                .update(products)
                .set({ price: newPrice.toString() })
                .where(eq(products.id, unit.productId))
        }

        const [updated] = await db
            .select({
                id: productSellingUnits.id,
                productId: productSellingUnits.productId,
                name: productSellingUnits.name,
                unitId: productSellingUnits.unitId,
                unitName: measurementUnits.name,
                price: productSellingUnits.price,
                conversionFactor: productSellingUnits.conversionFactor,
                isDefault: productSellingUnits.isDefault,
                sortOrder: productSellingUnits.sortOrder,
            })
            .from(productSellingUnits)
            .leftJoin(measurementUnits, eq(productSellingUnits.unitId, measurementUnits.id))
            .where(eq(productSellingUnits.id, sellingUnitId))
            .limit(1)

        return NextResponse.json(updated)
    } catch (error: any) {
        console.error("Mobile price update error:", error)
        return NextResponse.json(
            { error: error.message || "Failed to update price" },
            { status: error.message ? 400 : 500 }
        )
    }
}