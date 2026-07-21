import { locations } from "./schema"
import { eq } from "drizzle-orm"

const WAREHOUSE_MAP: Record<string, string> = {
  drink: "Drink Warehouse",
  ingredient: "Ingredient Warehouse",
  food: "Food Warehouse",
  others: "Others Warehouse",
}

export async function resolveWarehouse(
  tx: any,
  productType: string
) {
  const name = WAREHOUSE_MAP[productType] || "Drink Warehouse"
  let [location] = await tx
    .select()
    .from(locations)
    .where(eq(locations.name, name))
    .limit(1)

  if (!location) {
    [location] = await tx
      .insert(locations)
      .values({ name, type: "principal", isActive: true })
      .returning()
  }

  return location
}
