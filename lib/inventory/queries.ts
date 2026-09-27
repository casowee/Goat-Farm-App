// Spec 17.2 — inventory reads, moved out of `app/(app)/inventory/actions.ts`
// so they can be `cache()`d and are no longer exported as server actions.
//
// Select strings are single literals so the Supabase client can still infer the
// row shape from the generated types (see the note in `lib/health/queries.ts`).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Everything the inventory tables, the stock-levels widget and the edit dialog
 * read. `created_at` and `owner_id` are the columns the old `select('*')`
 * carried for nothing.
 */
const INVENTORY_COLUMNS =
  "id, name, type, category, quantity, unit, low_stock_threshold";

type InventoryQuery = ReturnType<typeof inventoryQuery>;
export type InventoryItem = NonNullable<
  Awaited<InventoryQuery>["data"]
>[number];

function inventoryQuery(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from("inventory_items").select(INVENTORY_COLUMNS);
}

/** Medicine items only — the medication combobox on the health form. */
export const listMedicineItems = cache(async (): Promise<InventoryItem[]> => {
  const supabase = await createClient();
  const { data } = await inventoryQuery(supabase)
    .eq("type", "medicine")
    .order("name");

  return data ?? [];
});

/** Every inventory item — the `/inventory` page and the dashboard stock widget. */
export const listInventoryItems = cache(async (): Promise<InventoryItem[]> => {
  const supabase = await createClient();
  const { data } = await inventoryQuery(supabase).order("type").order("name");

  return data ?? [];
});
