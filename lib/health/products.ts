// UPD-017 (Section 6) — which health record types carry an inventory-backed
// "which product was used?" field, which `medicine_category` that field lists,
// and what to call it in the UI.
//
// Before this there was exactly one such field — Deworming's, added by the
// UPD-005 amendment — so the rule lived inline in three places as
// `recordType === "deworming"`: the form dialog's conditional field, the
// server action's field parsing, and the server action's "+ Add new" category.
// UPD-017 adds a second (Dip wash) and a bulk entry point that needs the same
// rule again, so the rule moves here and those callers read it. Adding a third
// product-backed type later is one entry in this map, not five edits.
//
// Pure: a constants module with no React and no Supabase client, like
// `lib/health/records.ts`. It names a `medicine_category` from the generated
// types, which is a type-only import.

import type { Database } from "@/types/database.types";
import type { HealthRecordType } from "@/lib/health/records";

type MedicineCategory = Database["public"]["Enums"]["medicine_category"];

export interface ProductFieldConfig {
  /** The inventory category this field lists, and files "+ Add new" items under. */
  category: MedicineCategory;
  /** Field label, e.g. "Dewormer product". */
  label: string;
  /** Word for the thing being picked, used in the combobox placeholder. */
  noun: string;
  /** Helper line under the field. */
  hint: string;
}

/**
 * The record types with a product field. A type that is absent here has none —
 * vaccination, for instance, identifies itself through its preset-backed title
 * rather than an inventory item, and the course types share one general
 * medication field (see `medicinesForRecordType` below).
 */
export const PRODUCT_FIELD_BY_RECORD_TYPE: Partial<
  Record<HealthRecordType, ProductFieldConfig>
> = {
  deworming: {
    category: "dewormer",
    label: "Dewormer product",
    noun: "dewormer",
    hint: "Optional. New products added here are filed under dewormers.",
  },
  dip_wash: {
    category: "dip_wash",
    label: "Dip wash product",
    noun: "dip product",
    hint: "Optional. New products added here are filed under dip washes.",
  },
};

/** The product-field config for a record type, or `null` if it has none. */
export function productFieldFor(recordType: string): ProductFieldConfig | null {
  return (
    PRODUCT_FIELD_BY_RECORD_TYPE[recordType as HealthRecordType] ?? null
  );
}

/** Whether this record type shows a dedicated inventory product field. */
export function hasProductField(recordType: string): boolean {
  return productFieldFor(recordType) !== null;
}

/**
 * The `medicine_category` a "+ Add new" item typed on this record type's
 * product field should be filed under — `null` for the course types, whose
 * general Medication field leaves categorisation to the Inventory screens
 * (UPD-005 amendment).
 */
export function newMedicineCategoryFor(
  recordType: string,
): MedicineCategory | null {
  return productFieldFor(recordType)?.category ?? null;
}

/** Every category that belongs to a dedicated product field. */
const DEDICATED_CATEGORIES: MedicineCategory[] = Object.values(
  PRODUCT_FIELD_BY_RECORD_TYPE,
).map((config) => config.category);

/**
 * Narrow the owner's medicine inventory to what this record type's field should
 * offer:
 *
 *  - a type WITH a product field (deworming, dip wash) → only its own category;
 *  - anything else (the course types' general Medication field) → everything
 *    that is NOT reserved by a product field, including uncategorised items.
 *
 * The second rule is why this is shared rather than a per-call filter: the
 * Treatment step's exclusion used to be the literal `category !== 'dewormer'`,
 * which would have started listing dip-wash products the moment the new
 * category existed. Now every new product category excludes itself from the
 * general list automatically.
 */
export function medicinesForRecordType<
  T extends { category: MedicineCategory | null },
>(items: T[], recordType: string): T[] {
  const config = productFieldFor(recordType);
  if (config) {
    return items.filter((item) => item.category === config.category);
  }
  return items.filter(
    (item) =>
      item.category === null || !DEDICATED_CATEGORIES.includes(item.category),
  );
}
