import { NextResponse } from "next/server"
import db from "@/lib/db"
import { stock, products, locations, productSellingUnits, measurementUnits } from "@/lib/db/schema"
import { eq, desc, inArray } from "drizzle-orm"

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const locationId = searchParams.get("locationId")

        let query: any = db.query.stock.findMany({
            with: {
                product: true,
                location: true,
            },
            orderBy: [desc(stock.updatedAt)],
        })

        if (locationId) {
            query = db.query.stock.findMany({
                with: {
                    product: true,
                    location: true,
                },
                where: eq(stock.locationId, locationId),
                orderBy: [desc(stock.updatedAt)],
            })
        }

        const allStock = await query

        // Attach selling units to each product
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
            ...item,
            quantityOnHand: Number(item.quantityOnHand),
            quantityReserved: Number(item.quantityReserved),
            product: {
                ...item.product,
                sellingUnits: unitsByProduct[item.productId] || [],
            },
        }))

        return NextResponse.json(result)
    } catch (error) {
        console.error("Failed to fetch stock status:", error)
        return NextResponse.json({ error: "Failed to fetch stock status" }, { status: 500 })
    }
}
