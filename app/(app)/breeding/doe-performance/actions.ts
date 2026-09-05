"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDoePerformanceCategory } from "@/lib/breeding/doe-performance";

// ---------------------------------------------------------------------------
// Doe performance settings (UPD-012) — one row per owner, upserted. The two
// thresholds the live flagging reads; the flag itself is never stored.
// ---------------------------------------------------------------------------

function readSettingsFields(formData: FormData) {
  const maxInterval = Number(formData.get("max_expected_interval_months"));
  const eligibleAge = Number(formData.get("breeding_eligible_age_months"));

  if (!Number.isInteger(maxInterval) || maxInterval < 1 || maxInterval > 36) {
    return {
      error: "Max expected kidding interval must be between 1 and 36 months.",
    } as const;
  }
  if (!Number.isInteger(eligibleAge) || eligibleAge < 1 || eligibleAge > 36) {
    return {
      error: "Breeding-eligible age must be between 1 and 36 months.",
    } as const;
  }

  return {
    fields: {
      max_expected_interval_months: maxInterval,
      breeding_eligible_age_months: eligibleAge,
      updated_at: new Date().toISOString(),
    },
  } as const;
}

export async function upsertDoePerformanceSettings(
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readSettingsFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();

  // One row per owner. RLS scopes this select to the signed-in owner, so an
  // existing id means "this owner already has a settings row" — update it;
  // otherwise insert (owner_id is stamped by the column default).
  const { data: existing } = await supabase
    .from("doe_performance_settings")
    .select("id")
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("doe_performance_settings")
        .update(parsed.fields)
        .eq("id", existing.id)
    : await supabase.from("doe_performance_settings").insert(parsed.fields);

  if (error) {
    return "Could not save the doe performance settings. Please try again.";
  }

  revalidatePath("/breeding/doe-performance");
  revalidatePath("/breeding/settings");
}

// ---------------------------------------------------------------------------
// Doe performance notes (UPD-012) — the owner's investigation history for a
// flagged doe. Notes accumulate; nothing is ever overwritten.
// ---------------------------------------------------------------------------

export async function addDoePerformanceNote(
  formData: FormData,
): Promise<string | undefined> {
  const doeId = Number(formData.get("doe_id"));
  if (!Number.isInteger(doeId) || doeId <= 0) {
    return "Missing or invalid doe.";
  }

  const categoryRaw = formData.get("category");
  const category = typeof categoryRaw === "string" ? categoryRaw : "";
  if (!isDoePerformanceCategory(category)) {
    return "Pick a category for this note.";
  }

  const noteRaw = formData.get("note");
  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

  const supabase = await createClient();

  // RLS already scopes this to the owner; the check turns a would-be FK error
  // into a clean message and blocks attaching a note to someone else's goat.
  const { data: doe } = await supabase
    .from("goats")
    .select("id")
    .eq("id", doeId)
    .maybeSingle();
  if (!doe) {
    return "Could not find that doe.";
  }

  // owner_id is stamped by the column default (auth.uid()).
  const { error } = await supabase
    .from("doe_performance_notes")
    .insert({ doe_id: doeId, category, note });

  if (error) {
    return "Could not save the note. Please try again.";
  }

  revalidatePath("/breeding/doe-performance");
  // The doe's own Breeding tab on her detail page shows the same notes.
  revalidatePath(`/goats/${doeId}`);
}
