"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  listWeightsPageByGoat,
  type WeightWithDelta,
} from "@/lib/weight/queries";
import type { Database } from "@/types/database.types";

// Spec 17.2 (§5F) — the reads moved to `lib/weight/queries.ts` so they can be
// wrapped in React `cache()` and are no longer exported as server actions.
// The row type is re-exported here so existing importers keep working.
export type { Weight } from "@/lib/weight/queries";

type WeightInsert = Database["public"]["Tables"]["weights"]["Insert"];

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidDate(value: string): boolean {
  return value !== "" && !Number.isNaN(new Date(value).getTime());
}

function readWeightFields(
  formData: FormData,
): { goatId: number; fields: Omit<WeightInsert, "goat_id"> } | { error: string } {
  const goatId = Number(str(formData.get("goat_id")));
  if (!Number.isInteger(goatId) || goatId <= 0) {
    return { error: "Missing or invalid goat." };
  }

  const weighedOn = str(formData.get("weighed_on"));
  if (!weighedOn || !isValidDate(weighedOn)) {
    return { error: "Enter a valid date for the weigh-in." };
  }
  // Compare date-only, so "today" is never rejected for a timezone offset.
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (new Date(weighedOn) > today) {
    return { error: "The weigh-in date can't be in the future." };
  }

  const weightRaw = str(formData.get("weight_kg"));
  const weight = Number(weightRaw);
  if (!weightRaw || Number.isNaN(weight) || weight <= 0) {
    return { error: "Enter a weight greater than zero." };
  }
  if (weight > 9999.99) {
    return { error: "That weight looks too large — check the number." };
  }

  return {
    goatId,
    fields: {
      weighed_on: weighedOn,
      weight_kg: Math.round(weight * 100) / 100,
      notes: str(formData.get("notes")) || null,
    },
  };
}

function revalidateForGoat(goatId: number) {
  revalidatePath(`/goats/${goatId}`);
  revalidatePath("/weight");
}

export async function createWeight(
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readWeightFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();

  // RLS already scopes this to the owner; the check turns a would-be FK error
  // into a clean message and blocks attaching a weight to someone else's goat.
  const { data: goat } = await supabase
    .from("goats")
    .select("id")
    .eq("id", parsed.goatId)
    .maybeSingle();
  if (!goat) {
    return "Could not find that goat.";
  }

  // owner_id is stamped by the column default (auth.uid()).
  const { error } = await supabase
    .from("weights")
    .insert({ ...parsed.fields, goat_id: parsed.goatId });

  if (error) {
    return "Could not save the weight. Please try again.";
  }

  revalidateForGoat(parsed.goatId);
}

export async function updateWeight(
  id: number,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readWeightFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("weights")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    return "Could not update the weight. Please try again.";
  }

  revalidateForGoat(parsed.goatId);
}

export async function deleteWeight(
  id: number,
  goatId: number,
): Promise<string | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.from("weights").delete().eq("id", id);

  if (error) {
    return "Could not delete the weight. Please try again.";
  }

  revalidateForGoat(goatId);
}

/**
 * Spec 17.2 (§5E) — the "Show more" server action for the Weight tab: the next
 * page of this goat's weigh-ins, newest first. RLS scopes it to the signed-in
 * owner, exactly like the first page rendered on the server.
 */
export async function loadMoreWeights(
  goatId: number,
  offset: number,
): Promise<WeightWithDelta[]> {
  return listWeightsPageByGoat(goatId, offset);
}
