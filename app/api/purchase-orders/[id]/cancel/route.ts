import { NextResponse } from "next/server";
import db from "@/lib/db";
import { purchaseOrders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        await db.transaction(async (tx) => {
            const [order] = await tx
                .select()
                .from(purchaseOrders)
                .where(eq(purchaseOrders.id, id));

            if (!order) throw new Error("Order not found");
            if (order.status !== "pending") {
                throw new Error("Cannot cancel non-pending order");
            }

            await tx
                .update(purchaseOrders)
                .set({ status: "cancelled" })
                .where(eq(purchaseOrders.id, id));
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to cancel order:", error);
        return NextResponse.json(
            { error: error.message || "Failed to cancel order" },
            { status: 400 }
        );
    }
}
