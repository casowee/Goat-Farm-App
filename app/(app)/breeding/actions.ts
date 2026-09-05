"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { gestationDaysFromMonthsWeeks } from "@/lib/breeding/settings";
import { isBreedingEligibleMale } from "@/lib/breeding/eligible-males";

// ---------------------------------------------------------------------------
// Breeding settings (Task 1) — one row per owner, upserted.
// ---------------------------------------------------------------------------

function readSettingsFields(formData: FormData) {
  const bucksPerGroup = Number(formData.get("bucks_per_group"));
  const doesPerGroup = Number(formData.get("does_per_group"));
  const gestationMonths = Number(formData.get("gestation_months"));
  const gestationWeeks = Number(formData.get("gestation_weeks"));

  if (!Number.isInteger(bucksPerGroup) || bucksPerGroup < 1 || bucksPerGroup > 99) {
    return { error: "Bucks per group must be between 1 and 99." } as const;
  }
  if (!Number.isInteger(doesPerGroup) || doesPerGroup < 1 || doesPerGroup > 999) {
    return { error: "Does per group must be between 1 and 999." } as const;
  }
  if (!Number.isInteger(gestationMonths) || gestationMonths < 1 || gestationMonths > 12) {
    return { error: "Gestation months must be between 1 and 12." } as const;
  }
  if (!Number.isInteger(gestationWeeks) || gestationWeeks < 0 || gestationWeeks > 8) {
    return { error: "Gestation weeks must be between 0 and 8." } as const;
  }

  return {
    fields: {
      bucks_per_group: bucksPerGroup,
      does_per_group: doesPerGroup,
      gestation_days: gestationDaysFromMonthsWeeks(gestationMonths, gestationWeeks),
      updated_at: new Date().toISOString(),
    },
  } as const;
}

export async function upsertBreedingSettings(
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
    .from("breeding_settings")
    .select("id")
    .maybeSingle();

  const { error } = existing
    ? await supabase
        .from("breeding_settings")
        .update(parsed.fields)
        .eq("id", existing.id)
    : await supabase.from("breeding_settings").insert(parsed.fields);

  if (error) {
    return "Could not save the breeding settings. Please try again.";
  }

  revalidatePath("/breeding");
  revalidatePath("/breeding/settings");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Breeding season occurrences (Task 2).
// ---------------------------------------------------------------------------

function isIsoDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
  );
}

function parseBuckIds(raw: FormDataEntryValue | null): number[] | { error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { error: "Pick at least one buck for the season." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Bucks are not in the expected format." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { error: "Pick at least one buck for the season." };
  }
  const ids: number[] = [];
  for (const entry of parsed) {
    const id = Number(entry);
    if (!Number.isInteger(id) || id <= 0) {
      return { error: "One of the selected bucks is not valid." };
    }
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function readSeasonFields(formData: FormData) {
  const barnIdRaw = formData.get("barn_id");
  const templateIdRaw = formData.get("season_template_id");
  const startDate = formData.get("start_date");
  const endDate = formData.get("end_date");
  const note = formData.get("note");

  const buckIds = parseBuckIds(formData.get("buck_ids"));
  if (!Array.isArray(buckIds)) {
    return { error: buckIds.error } as const;
  }

  let barnId: number | null = null;
  if (typeof barnIdRaw === "string" && barnIdRaw.trim()) {
    const parsed = Number(barnIdRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: "Select a valid barn/group." } as const;
    }
    barnId = parsed;
  }

  let templateId: number | null = null;
  if (typeof templateIdRaw === "string" && templateIdRaw.trim()) {
    const parsed = Number(templateIdRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return { error: "Select a valid season template." } as const;
    }
    templateId = parsed;
  }

  if (typeof startDate !== "string" || !isIsoDate(startDate)) {
    return { error: "Enter a valid season start date." } as const;
  }

  let resolvedEnd: string | null = null;
  if (typeof endDate === "string" && endDate.trim()) {
    if (!isIsoDate(endDate)) {
      return { error: "Enter a valid season end date." } as const;
    }
    if (endDate < startDate) {
      return { error: "The season can't end before it starts." } as const;
    }
    resolvedEnd = endDate;
  }

  return {
    buckIds,
    fields: {
      barn_id: barnId,
      season_template_id: templateId,
      start_date: startDate,
      end_date: resolvedEnd,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    },
  } as const;
}

async function verifyTemplate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  templateId: number | null,
): Promise<string | undefined> {
  if (templateId === null) return;
  const { data: template } = await supabase
    .from("breeding_season_templates")
    .select("id")
    .eq("id", templateId)
    .maybeSingle();
  if (!template) return "Select a valid season template.";
}

/**
 * Every submitted buck must be an intact, breeding-eligible male the owner owns
 * (i.e. not a Kid-stage male — `isBreedingEligibleMale`). A buck being added to
 * the season for the FIRST time must also be `active`; a buck already linked to
 * the season stays valid even if it was later sold, so an end date can still be
 * added.
 */
async function verifyBucks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  buckIds: number[],
  alreadyLinked: Set<number>,
): Promise<string | undefined> {
  const { data: rows } = await supabase
    .from("goats")
    .select("id, sex, reproductive_state, date_of_birth, status")
    .in("id", buckIds);

  const byId = new Map((rows ?? []).map((row) => [row.id, row]));

  for (const id of buckIds) {
    const buck = byId.get(id);
    if (!buck || !isBreedingEligibleMale(buck)) {
      return "Every buck must be an active, intact male — not a kid.";
    }
    if (!alreadyLinked.has(id) && buck.status !== "active") {
      return "Every newly added buck must be active.";
    }
  }
}

async function verifyBarn(
  supabase: Awaited<ReturnType<typeof createClient>>,
  barnId: number | null,
): Promise<string | undefined> {
  if (barnId === null) return;
  const { data: barn } = await supabase
    .from("barns")
    .select("id")
    .eq("id", barnId)
    .maybeSingle();
  if (!barn) return "Select a valid barn/group.";
}

/** Replace a season's buck links with `buckIds` (delete-all + re-insert). */
async function writeSeasonBucks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  seasonId: number,
  buckIds: number[],
): Promise<string | undefined> {
  const { error: deleteError } = await supabase
    .from("breeding_season_bucks")
    .delete()
    .eq("season_id", seasonId);
  if (deleteError) {
    return "Could not save the season's bucks. Please try again.";
  }

  const { error: insertError } = await supabase
    .from("breeding_season_bucks")
    .insert(buckIds.map((buck_id) => ({ season_id: seasonId, buck_id })));
  if (insertError) {
    return "Could not save the season's bucks. Please try again.";
  }
}

export async function createBreedingSeason(
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readSeasonFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();

  const buckError = await verifyBucks(supabase, parsed.buckIds, new Set());
  if (buckError) return buckError;
  const barnError = await verifyBarn(supabase, parsed.fields.barn_id);
  if (barnError) return barnError;
  const templateError = await verifyTemplate(
    supabase,
    parsed.fields.season_template_id,
  );
  if (templateError) return templateError;

  // owner_id is stamped by the column default (auth.uid()).
  const { data: created, error } = await supabase
    .from("breeding_season_occurrences")
    .insert(parsed.fields)
    .select("id")
    .single();

  if (error || !created) {
    return "Could not log the breeding season. Please try again.";
  }

  const bucksError = await writeSeasonBucks(
    supabase,
    created.id,
    parsed.buckIds,
  );
  if (bucksError) return bucksError;

  revalidatePath("/breeding");
  revalidatePath("/");
}

export async function updateBreedingSeason(
  id: number,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readSeasonFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("breeding_season_occurrences")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return "Could not find that breeding season.";
  }

  const { data: linkedRows } = await supabase
    .from("breeding_season_bucks")
    .select("buck_id")
    .eq("season_id", id);
  const alreadyLinked = new Set((linkedRows ?? []).map((row) => row.buck_id));

  const buckError = await verifyBucks(supabase, parsed.buckIds, alreadyLinked);
  if (buckError) return buckError;
  const barnError = await verifyBarn(supabase, parsed.fields.barn_id);
  if (barnError) return barnError;
  const templateError = await verifyTemplate(
    supabase,
    parsed.fields.season_template_id,
  );
  if (templateError) return templateError;

  const { error } = await supabase
    .from("breeding_season_occurrences")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    return "Could not update the breeding season. Please try again.";
  }

  const bucksError = await writeSeasonBucks(supabase, id, parsed.buckIds);
  if (bucksError) return bucksError;

  revalidatePath("/breeding");
  revalidatePath("/");
}

export async function deleteBreedingSeason(
  id: number,
): Promise<string | undefined> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("breeding_season_occurrences")
    .delete()
    .eq("id", id);

  if (error) {
    return "Could not delete the breeding season. Please try again.";
  }

  revalidatePath("/breeding");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Season templates (2026-09-05 amendment) — per-row CRUD so a template's id
// stays stable and any breeding_season_occurrences.season_template_id links to
// it survive an edit.
// ---------------------------------------------------------------------------

function readTemplateFields(formData: FormData) {
  const label = formData.get("label");
  const startMonth = Number(formData.get("start_month"));
  const lengthMonths = Number(formData.get("length_months"));

  if (typeof label !== "string" || !label.trim()) {
    return { error: "Give the season a name." } as const;
  }
  if (!Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    return { error: "Pick a real start month." } as const;
  }
  if (!Number.isInteger(lengthMonths) || lengthMonths < 1 || lengthMonths > 12) {
    return { error: "A season length must be between 1 and 12 months." } as const;
  }

  return {
    fields: {
      label: label.trim(),
      start_month: startMonth,
      length_months: lengthMonths,
    },
  } as const;
}

function revalidateBreeding() {
  revalidatePath("/breeding");
  revalidatePath("/breeding/settings");
  revalidatePath("/");
}

export async function createSeasonTemplate(
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readTemplateFields(formData);
  if ("error" in parsed) return parsed.error;

  const supabase = await createClient();
  // owner_id is stamped by the column default (auth.uid()).
  const { error } = await supabase
    .from("breeding_season_templates")
    .insert(parsed.fields);

  if (error) {
    return "Could not add the season. Please try again.";
  }
  revalidateBreeding();
}

export async function updateSeasonTemplate(
  id: number,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readTemplateFields(formData);
  if ("error" in parsed) return parsed.error;

  const supabase = await createClient();
  const { error } = await supabase
    .from("breeding_season_templates")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    return "Could not update the season. Please try again.";
  }
  revalidateBreeding();
}

export async function deleteSeasonTemplate(
  id: number,
): Promise<string | undefined> {
  const supabase = await createClient();
  // Linked occurrences keep their row; season_template_id is set null by the FK.
  const { error } = await supabase
    .from("breeding_season_templates")
    .delete()
    .eq("id", id);

  if (error) {
    return "Could not remove the season. Please try again.";
  }
  revalidateBreeding();
}
