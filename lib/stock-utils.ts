import type { SellingUnit } from "./types"

export function formatStockFromSellingUnits(
    stock: number,
    sellingUnits: SellingUnit[],
): string {
    if (!sellingUnits || sellingUnits.length === 0) {
        return String(Math.round(stock))
    }

    const smallestCf = Math.min(...sellingUnits.map((su) => su.conversionFactor))
    if (smallestCf <= 0) return String(Math.round(stock))

    const totalBaseUnits = stock / smallestCf

    const sorted = [...sellingUnits].sort((a, b) => b.conversionFactor - a.conversionFactor)

    const parts: string[] = []
    let remaining = totalBaseUnits

    const EPSILON = 1e-9

    for (const su of sorted) {
        const unitsInBase = su.conversionFactor / smallestCf
        const qty = Math.floor(remaining / unitsInBase + EPSILON)
        if (qty > 0) {
            parts.push(`${qty} ${su.name}${qty > 1 ? "s" : ""}`)
            remaining -= qty * unitsInBase
        }
    }

    const remainder = Math.round(remaining)
    if (remainder > 0) {
        const smallestUnit = sorted[sorted.length - 1]
        parts.push(`${remainder} ${smallestUnit.name}${remainder > 1 ? "s" : ""}`)
    }

    return parts.length > 0 ? parts.join(" + ") : `0 ${sorted[sorted.length - 1]?.name || "unit"}s`
}

export function getBaseConversionFactor(sellingUnits: SellingUnit[]): number {
    if (!sellingUnits || sellingUnits.length === 0) return 1
    const smallest = Math.min(...sellingUnits.map((su) => su.conversionFactor))
    return smallest > 0 ? smallest : 1
}
