"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import {
  isInventoryItemType,
  isMedicineCategory,
} from "@/lib/inventory/items";
import { isKnownUnit } from "@/lib/inventory/units";

export type InventoryItem =
  Database["public"]["Tables"]["inventory_items"]["Row"];

type InventoryItemInsert =
  Database["public"]["Tables"]["inventory_items"]["Insert"];

/**
 * UPD-005 — the owner's medicine catalogue, powering the health-record
 * Treatment / Deworming medication comboboxes. RLS scopes this to the signed-in
 * owner. `type = 'medicine'` only. Spec 10 adds the feed side and the CRUD
 * below, but this reader's contract is unchanged — the comboboxes depend on it.
 */
export async function listMedicineItems(): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_items")
    .select("*")
    .eq("type", "medicine")
    .order("name");

  return data ?? [];
}

/** Every inventory item the signed-in owner has, medicine and feed. */
export async function listInventoryItems(): Promise<InventoryItem[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("inventory_items")
    .select("*")
    .order("type")
    .order("name");

  return data ?? [];
}

type ParsedFields =
  | { error: string }
  | { fields: Omit<InventoryItemInsert, "owner_id"> };

/**
 * Parse and validate the inventory-item form. Category is medicine-only: it is
 * forced to `null` for feed items regardless of what the form sends (Spec 10,
 * Task 4). Unit is validated against the fixed list for the chosen type.
 */
function readInventoryItemFields(formData: FormData): ParsedFields {
  const typeRaw = formData.get("type");
  if (typeof typeRaw !== "string" || !isInventoryItemType(typeRaw)) {
    return { error: "Choose whether this is a medicine or a feed item." };
  }
  const type = typeRaw;

  const nameRaw = formData.get("name");
  if (typeof nameRaw !== "string" || !nameRaw.trim()) {
    return { error: "Name is required." };
  }
  const name = nameRaw.trim();

  // Quantity — required, non-negative, at most 2 decimal places (numeric(10,2)).
  const quantityRaw = formData.get("quantity");
  const quantity =
    typeof quantityRaw === "string" && quantityRaw.trim()
      ? Number(quantityRaw)
      : 0;
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { error: "Quantity must be zero or a positive number." };
  }

  // Low-stock threshold — optional, non-negative.
  let lowStockThreshold: number | null = null;
  const thresholdRaw = formData.get("low_stock_threshold");
  if (typeof thresholdRaw === "string" && thresholdRaw.trim()) {
    const parsed = Number(thresholdRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return {
        error: "Low-stock threshold must be zero or a positive number, or left blank.",
      };
    }
    lowStockThreshold = Math.round(parsed * 100) / 100;
  }

  // Unit — optional; when set it must be one of the fixed choices for this type.
  let unit: string | null = null;
  const unitRaw = formData.get("unit");
  if (typeof unitRaw === "string" && unitRaw.trim()) {
    if (!isKnownUnit(unitRaw.trim(), type)) {
      return { error: "Choose a unit from the list, or leave it blank." };
    }
    unit = unitRaw.trim();
  }

  // Category — medicine only. Forced to null for feed no matter what was sent.
  let category: Database["public"]["Enums"]["medicine_category"] | null = null;
  if (type === "medicine") {
    const categoryRaw = formData.get("category");
    if (typeof categoryRaw === "string" && categoryRaw.trim()) {
      const trimmed = categoryRaw.trim();
      if (!isMedicineCategory(trimmed)) {
        return { error: "Choose a valid medicine category." };
      }
      category = trimmed;
    }
  }

  return {
    fields: {
      type,
      name,
      quantity: Math.round(quantity * 100) / 100,
      low_stock_threshold: lowStockThreshold,
      unit,
      category,
    },
  };
}

/** Postgres unique-violation → the `unique (owner_id, type, name)` constraint. */
function isDuplicateError(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export async function createInventoryItem(
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readInventoryItemFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();
  // owner_id is stamped by the column default (auth.uid()); RLS scopes every
  // later read / update / delete to that owner.
  const { error } = await supabase
    .from("inventory_items")
    .insert(parsed.fields);

  if (isDuplicateError(error)) {
    return "You already have an item with that name in this category.";
  }
  if (error) {
    return "Could not add the item. Please try again.";
  }

  revalidatePath("/inventory");
}

export async function updateInventoryItem(
  id: number,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readInventoryItemFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update(parsed.fields)
    .eq("id", id);

  if (isDuplicateError(error)) {
    return "You already have an item with that name in this category.";
  }
  if (error) {
    return "Could not update the item. Please try again.";
  }

  revalidatePath("/inventory");
}

export async function deleteInventoryItem(
  id: number,
): Promise<string | undefined> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .delete()
    .eq("id", id);

  if (error) {
    return "Could not delete the item. Please try again.";
  }

  revalidatePath("/inventory");
}
