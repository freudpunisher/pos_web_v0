import { locations } from "./schema"
import { eq } from "drizzle-orm"

export async function resolveWarehouse(tx: any) {
  let [location] = await tx
    .select()
    .from(locations)
    .where(eq(locations.type, "primary"))
    .limit(1)

  if (!location) {
    [location] = await tx
      .insert(locations)
      .values({ name: "Principal", type: "primary", isActive: true })
      .returning()
  }

  return location
}
