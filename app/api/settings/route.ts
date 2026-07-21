import { NextResponse } from "next/server"
import db from "@/lib/db"
import { storeSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

const defaultSettings = {
    name: "Smart POS",
    address: "123 Business St",
    phone: "+1 234 567 890",
    email: "contact@smartpos.com",
    taxRate: "0",
    currency: "USD",
    currencySymbol: "$",
    rcNumber: "",
    nifNumber: "",
}

export async function GET() {
    try {
        const [settings] = await db.select().from(storeSettings).limit(1)
        if (settings) {
            return NextResponse.json(settings)
        }
    } catch (error) {
        console.error("Failed to fetch store settings from DB, returning defaults:", error)
    }

    return NextResponse.json(defaultSettings)
}

export async function PUT(request: Request) {
    try {
        const body = await request.json()
        const { name, address, phone, email, taxRate, currency, currencySymbol, rcNumber, nifNumber } = body

        const [existing] = await db.select().from(storeSettings).limit(1)

        if (existing) {
            const [updated] = await db
                .update(storeSettings)
                .set({
                    name,
                    address,
                    phone,
                    email,
                    taxRate: taxRate.toString(),
                    currency,
                    currencySymbol,
                    rcNumber: rcNumber || null,
                    nifNumber: nifNumber || null,
                })
                .where(eq(storeSettings.id, existing.id))
                .returning()
            return NextResponse.json(updated)
        } else {
            const [newSettings] = await db
                .insert(storeSettings)
                .values({
                    name,
                    address,
                    phone,
                    email,
                    taxRate: taxRate.toString(),
                    currency,
                    currencySymbol,
                    rcNumber: rcNumber || null,
                    nifNumber: nifNumber || null,
                })
                .returning()
            return NextResponse.json(newSettings)
        }
    } catch (error) {
        console.error("Failed to update settings:", error)
        return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }
}
