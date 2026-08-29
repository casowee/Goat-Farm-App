/**
 * Spec 10 — Inventory domain constants and guards. Pure, no React / Supabase.
 *
 * The table itself (`inventory_items`, the `inventory_item_type` and
 * `medicine_category` enums) is forward-provisioned by `UPD-005` — this module
 * only names its values for the UI and validates form input against them.
 */
import type { Database } from "@/types/database.types";

export type InventoryItemType =
  Database["public"]["Enums"]["inventory_item_type"];
export type MedicineCategory = Database["public"]["Enums"]["medicine_category"];

export const INVENTORY_ITEM_TYPES: InventoryItemType[] = ["medicine", "feed"];

export const INVENTORY_TYPE_LABELS: Record<InventoryItemType, string> = {
  medicine: "Medicine",
  feed: "Feed",
};

/**
 * Category applies to medicine only (owner's decision, 2026-08-29: feed items
 * have no category). The values come from the `UPD-005` amendment that added
 * `medicine_category` so the health-record comboboxes could filter dewormers.
 */
export const MEDICINE_CATEGORIES: MedicineCategory[] = [
  "antibiotic",
  "vitamin_support",
  "anti_inflammatory",
  "dewormer",
  "other",
];

export const MEDICINE_CATEGORY_LABELS: Record<MedicineCategory, string> = {
  antibiotic: "Antibiotic",
  vitamin_support: "Vitamin / Support",
  anti_inflammatory: "Anti-inflammatory",
  dewormer: "Dewormer",
  other: "Other",
};

export function isInventoryItemType(value: string): value is InventoryItemType {
  return (INVENTORY_ITEM_TYPES as string[]).includes(value);
}

export function isMedicineCategory(value: string): value is MedicineCategory {
  return (MEDICINE_CATEGORIES as string[]).includes(value);
}

export function medicineCategoryLabel(value: MedicineCategory | null): string {
  return value ? MEDICINE_CATEGORY_LABELS[value] : "—";
}
