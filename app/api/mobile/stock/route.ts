import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import db from "@/lib/db"
import { stock, products, locations, productSellingUnits, measurementUnits } from "@/lib/db/schema"
import { eq, desc, inArray, and } from "drizzle-orm"

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("authorization")
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const token = authHeader.substring(7)
        const payload = await verifyToken(token)
        if (!payload) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get("locationId")

        const conditions = []
        if (locationId) {
            conditions.push(eq(stock.locationId, locationId))
        }

        const allStock = await db.query.stock.findMany({
            with: {
                product: true,
                location: true,
            },
            where: conditions.length ? and(...conditions) : undefined,
            orderBy: [desc(stock.updatedAt)],
        })

        const productIds: string[] = allStock.map((s: any) => s.productId).filter(Boolean)
        let allSellingUnits: any[] = []
        if (productIds.length > 0) {
            allSellingUnits = await db
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
                .where(inArray(productSellingUnits.productId, productIds))
                .orderBy(productSellingUnits.sortOrder)
        }

        const unitsByProduct: Record<string, any[]> = {}
        for (const su of allSellingUnits) {
            if (!unitsByProduct[su.productId]) unitsByProduct[su.productId] = []
            unitsByProduct[su.productId].push(su)
        }

        const result = allStock.map((item: any) => ({
            id: item.id,
            productId: item.productId,
            locationId: item.locationId,
            quantityOnHand: Number(item.quantityOnHand),
            quantityReserved: Number(item.quantityReserved),
            reorderLevel: item.reorderLevel,
            updatedAt: item.updatedAt,
            product: {
                id: item.product.id,
                sku: item.product.sku,
                name: item.product.name,
                price: Number(item.product.price),
                cost: item.product.cost ? Number(item.product.cost) : null,
                minStock: item.product.minStock,
                sellingUnits: unitsByProduct[item.productId] || [],
            },
            location: {
                id: item.location.id,
                name: item.location.name,
                type: item.location.type,
            },
        }))

        return NextResponse.json(result)
    } catch (error) {
        console.error("Mobile stock fetch error:", error)
        return NextResponse.json({ error: "Failed to fetch stock" }, { status: 500 })
    }
}
