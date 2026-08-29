"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import {
  type HealthRecordStatus,
  defaultStatusForType,
  isCourseType,
  isFollowUpType,
  isHealthRecordStatus,
  isHealthRecordType,
} from "@/lib/health/records";

type HealthRecordInsert =
  Database["public"]["Tables"]["health_records"]["Insert"];
export type HealthRecord =
  Database["public"]["Tables"]["health_records"]["Row"];

export type HealthConditionPreset =
  Database["public"]["Tables"]["health_condition_presets"]["Row"];

function str(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalStr(value: FormDataEntryValue | null): string | null {
  const s = str(value);
  return s ? s : null;
}

function isValidDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

/**
 * Parse and validate the health-record form fields. Conditional fields are
 * cleared unless the record type allows them (Spec 07, Section 6), so a value
 * left over from a since-changed type is never persisted.
 */
function readHealthRecordFields(
  formData: FormData,
):
  | {
      goatId: number;
      fields: Omit<HealthRecordInsert, "goat_id">;
      titleIsCustom: boolean;
      medicationIsCustom: boolean;
    }
  | { error: string } {
  const goatIdNum = Number(str(formData.get("goat_id")));
  if (!Number.isInteger(goatIdNum) || goatIdNum <= 0) {
    return { error: "Missing or invalid goat." };
  }

  const recordType = str(formData.get("record_type"));
  if (!isHealthRecordType(recordType)) {
    return { error: "Select a record type." };
  }

  const title = str(formData.get("title"));
  if (!title) {
    return { error: "Title is required." };
  }

  const dateOccurred = str(formData.get("date_occurred"));
  if (!dateOccurred || !isValidDate(dateOccurred)) {
    return { error: "Enter a valid date for when this happened." };
  }

  // Cost — optional, non-negative, up to 2 decimal places.
  let cost: number | null = null;
  const costRaw = str(formData.get("cost"));
  if (costRaw) {
    const parsed = Number(costRaw);
    if (Number.isNaN(parsed) || parsed < 0) {
      return { error: "Enter a valid cost, or leave it blank." };
    }
    cost = Math.round(parsed * 100) / 100;
  }

  // Course fields — only for illness / treatment / injury / surgery.
  let medicationName: string | null = null;
  let dosage: string | null = null;
  let treatmentStartDate: string | null = null;
  let treatmentDurationDays: number | null = null;
  let treatmentTimesPerDay: number | null = null;

  // UPD-005 amendment — Deworming also carries a medication/product (stored in
  // `medication_name`), but none of the course-schedule fields.
  if (recordType === "deworming") {
    medicationName = optionalStr(formData.get("medication_name"));
  }

  if (isCourseType(recordType)) {
    medicationName = optionalStr(formData.get("medication_name"));
    dosage = optionalStr(formData.get("dosage"));

    const startRaw = str(formData.get("treatment_start_date"));
    if (startRaw) {
      if (!isValidDate(startRaw)) {
        return { error: "Enter a valid treatment start date, or leave it blank." };
      }
      treatmentStartDate = startRaw;
    }

    const durationRaw = str(formData.get("treatment_duration_days"));
    if (durationRaw) {
      const parsed = Number(durationRaw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { error: "Treatment length must be a whole number of days." };
      }
      treatmentDurationDays = parsed;
    }

    const timesRaw = str(formData.get("treatment_times_per_day"));
    if (timesRaw) {
      const parsed = Number(timesRaw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { error: "Doses per day must be a whole number." };
      }
      treatmentTimesPerDay = parsed;
    }
  }

  // Follow-up field — only for vaccination / deworming / checkup.
  let nextDueDate: string | null = null;
  if (isFollowUpType(recordType)) {
    const dueRaw = str(formData.get("next_due_date"));
    if (dueRaw) {
      if (!isValidDate(dueRaw)) {
        return { error: "Enter a valid next-due date, or leave it blank." };
      }
      nextDueDate = dueRaw;
    }
  }

  // Status — respect an explicit choice, otherwise fall back to the sensible
  // default for the record type.
  let status: HealthRecordStatus = defaultStatusForType(recordType);
  const statusRaw = str(formData.get("status"));
  if (statusRaw) {
    if (!isHealthRecordStatus(statusRaw)) {
      return { error: "Select a valid status." };
    }
    status = statusRaw;
  }

  // UPD-004 — set by the Title combobox when the owner used "+ Add new".
  const titleIsCustom = str(formData.get("title_is_custom")) === "1";

  // UPD-005 — set by the Medication combobox's "+ Add new". Meaningful for the
  // course types and for Deworming (the only record types with a medication /
  // product field, i.e. the only ones with a non-null medicationName here).
  const medicationIsCustom =
    (isCourseType(recordType) || recordType === "deworming") &&
    str(formData.get("medication_is_custom")) === "1" &&
    medicationName !== null &&
    medicationName !== "";

  return {
    goatId: goatIdNum,
    titleIsCustom,
    medicationIsCustom,
    fields: {
      record_type: recordType,
      title,
      notes: optionalStr(formData.get("notes")),
      date_occurred: dateOccurred,
      vet_name: optionalStr(formData.get("vet_name")),
      cost,
      medication_name: medicationName,
      dosage,
      treatment_start_date: treatmentStartDate,
      treatment_duration_days: treatmentDurationDays,
      treatment_times_per_day: treatmentTimesPerDay,
      next_due_date: nextDueDate,
      status,
    },
  };
}

function revalidateForGoat(goatId: number) {
  revalidatePath(`/goats/${goatId}`);
  revalidatePath("/health");
}

/**
 * UPD-004 — when the owner typed a brand-new title via "+ Add new", save it as
 * an owner-scoped preset so it appears in the combobox next time this
 * `record_type` is selected. Best-effort: a failure here (e.g. the preset
 * already exists) must not fail the health-record write that already
 * succeeded. The insert policy's `with check (auth.uid() = owner_id)` and the
 * `unique (owner_id, record_type, name)` constraint keep this safe.
 */
async function saveCustomTitlePreset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recordType: Database["public"]["Enums"]["health_record_type"],
  title: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("health_condition_presets")
    .upsert(
      { owner_id: user.id, record_type: recordType, name: title },
      { onConflict: "owner_id,record_type,name", ignoreDuplicates: true },
    );
}

/**
 * UPD-005 — when the owner typed a brand-new medicine via the Medication
 * combobox's "+ Add new", create an `inventory_items` row for it (medicine,
 * quantity 0) so it appears in the list next time. Best-effort, same as
 * `saveCustomTitlePreset`: `health_records.medication` is already stored as
 * plain text, so a failure here (e.g. the item already exists) must not fail
 * the health-record write. `unique (owner_id, type, name)` + the `for all`
 * owner policy keep this safe. Spec 10 will own real quantity management.
 */
async function saveCustomMedicineItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  category: Database["public"]["Enums"]["medicine_category"] | null,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Categorise by the context it was added from (UPD-005 amendment): a product
  // added on the Deworming step is a dewormer; one added on the Treatment step
  // is left uncategorised for spec 10's inventory screens to sort out.
  await supabase
    .from("inventory_items")
    .upsert(
      { owner_id: user.id, type: "medicine", name, quantity: 0, category },
      { onConflict: "owner_id,type,name", ignoreDuplicates: true },
    );
}

/** The medicine category a "+ Add new" item gets, based on the record type. */
function newMedicineCategoryFor(
  recordType: Database["public"]["Enums"]["health_record_type"],
): Database["public"]["Enums"]["medicine_category"] | null {
  return recordType === "deworming" ? "dewormer" : null;
}

/**
 * Every health-condition preset visible to the signed-in owner: the seeded
 * global defaults (`owner_id is null`) plus the owner's own custom presets.
 * RLS enforces that scoping; the combobox filters by `record_type` client-side.
 */
export async function listHealthConditionPresets(): Promise<
  HealthConditionPreset[]
> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_condition_presets")
    .select("*")
    .order("name");

  return data ?? [];
}

export async function createHealthRecord(
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readHealthRecordFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();

  // RLS already scopes this to the owner; the check turns a would-be FK error
  // into a clean message and blocks attaching a record to someone else's goat.
  const { data: goat } = await supabase
    .from("goats")
    .select("id")
    .eq("id", parsed.goatId)
    .maybeSingle();
  if (!goat) {
    return "Could not find that goat.";
  }

  // owner_id is stamped by the column default (auth.uid()); RLS scopes every
  // later read / update / delete to that owner.
  const { error } = await supabase
    .from("health_records")
    .insert({ ...parsed.fields, goat_id: parsed.goatId });

  if (error) {
    return "Could not save the health record. Please try again.";
  }

  if (parsed.titleIsCustom) {
    await saveCustomTitlePreset(
      supabase,
      parsed.fields.record_type,
      parsed.fields.title,
    );
  }

  if (parsed.medicationIsCustom && parsed.fields.medication_name) {
    await saveCustomMedicineItem(
      supabase,
      parsed.fields.medication_name,
      newMedicineCategoryFor(parsed.fields.record_type),
    );
  }

  revalidateForGoat(parsed.goatId);
}

export async function updateHealthRecord(
  id: number,
  formData: FormData,
): Promise<string | undefined> {
  const parsed = readHealthRecordFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("health_records")
    .update(parsed.fields)
    .eq("id", id);

  if (error) {
    return "Could not update the health record. Please try again.";
  }

  if (parsed.titleIsCustom) {
    await saveCustomTitlePreset(
      supabase,
      parsed.fields.record_type,
      parsed.fields.title,
    );
  }

  if (parsed.medicationIsCustom && parsed.fields.medication_name) {
    await saveCustomMedicineItem(
      supabase,
      parsed.fields.medication_name,
      newMedicineCategoryFor(parsed.fields.record_type),
    );
  }

  revalidateForGoat(parsed.goatId);
}

export async function deleteHealthRecord(
  id: number,
  goatId: number,
): Promise<string | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.from("health_records").delete().eq("id", id);

  if (error) {
    return "Could not delete the health record. Please try again.";
  }

  revalidateForGoat(goatId);
}

/**
 * All of a goat's health records, newest event first. RLS scopes this to the
 * signed-in owner. Spec 07, Section 8.
 */
export async function listHealthRecordsByGoat(
  goatId: number,
): Promise<HealthRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_records")
    .select("*")
    .eq("goat_id", goatId)
    .order("date_occurred", { ascending: false })
    .order("id", { ascending: false });

  return data ?? [];
}
