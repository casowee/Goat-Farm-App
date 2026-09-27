"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { conditionSlug } from "@/lib/doctor/conditions";
import {
  listFarmHealthRecordsPage,
  listHealthRecordsPageByGoat,
  type FarmHealthFilters,
  type FarmHealthRecord,
  type HealthRecord,
} from "@/lib/health/queries";
import type { Database } from "@/types/database.types";
import {
  type HealthRecordStatus,
  defaultStatusForType,
  isCourseType,
  isFollowUpType,
  isHealthRecordStatus,
  isHealthRecordType,
} from "@/lib/health/records";
import {
  hasProductField,
  newMedicineCategoryFor,
} from "@/lib/health/products";

type HealthRecordInsert =
  Database["public"]["Tables"]["health_records"]["Insert"];

// Spec 17.2 (§5F) — the reads moved to `lib/health/queries.ts` so they can be
// wrapped in React `cache()` and are no longer exported as server actions.
// The row types are re-exported here so existing importers keep working.
export type {
  HealthRecord,
  HealthConditionPreset,
} from "@/lib/health/queries";

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

interface ParsedHealthRecordFields {
  fields: Omit<HealthRecordInsert, "goat_id">;
  titleIsCustom: boolean;
  medicationIsCustom: boolean;
}

/**
 * Parse and validate every field of a health record except which goat it
 * belongs to. Conditional fields are cleared unless the record type allows
 * them (Spec 07, Section 6), so a value left over from a since-changed type is
 * never persisted.
 *
 * The goat-independent half was split out by UPD-017 so the bulk create runs
 * the SAME validation as a single-goat create rather than a second, looser
 * path — one set of rules, applied once per submission and reused for every
 * goat in a bulk selection.
 */
function readHealthRecordFieldValues(
  formData: FormData,
): ParsedHealthRecordFields | { error: string } {
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

  // UPD-005 amendment, generalised by UPD-017 — the types with their own
  // product field (Deworming, Dip wash) also carry a `medication_name`, but
  // none of the course-schedule fields.
  if (hasProductField(recordType)) {
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

  // Follow-up field — only for vaccination / deworming / dip wash / checkup
  // (UPD-016 added dip wash to FOLLOW_UP_RECORD_TYPES; nothing here changed).
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
    (isCourseType(recordType) || hasProductField(recordType)) &&
    str(formData.get("medication_is_custom")) === "1" &&
    medicationName !== null &&
    medicationName !== "";

  return {
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

/**
 * The single-goat parse: a goat id plus the shared field validation above.
 * Unchanged in behaviour — `createHealthRecord` / `updateHealthRecord` call
 * this exactly as they did before UPD-017 split the two halves apart.
 */
function readHealthRecordFields(
  formData: FormData,
): (ParsedHealthRecordFields & { goatId: number }) | { error: string } {
  const goatIdNum = Number(str(formData.get("goat_id")));
  if (!Number.isInteger(goatIdNum) || goatIdNum <= 0) {
    return { error: "Missing or invalid goat." };
  }

  const parsed = readHealthRecordFieldValues(formData);
  if ("error" in parsed) return parsed;

  return { goatId: goatIdNum, ...parsed };
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
 * Spec 17.2 (§5E) — the "Show more" server action for the Health tab: the next
 * page of this goat's records, newest first. RLS scopes it to the signed-in
 * owner, exactly like the first page rendered on the server.
 */
export async function loadMoreHealthRecords(
  goatId: number,
  offset: number,
): Promise<HealthRecord[]> {
  return listHealthRecordsPageByGoat(goatId, offset);
}

/**
 * UPD-016 — the same "Show more" contract for the farm-wide History tab on
 * `/health`. The filters travel with the request so page 2 matches page 1; RLS
 * scopes it to the signed-in owner, exactly like the server-rendered first page.
 */
export async function loadMoreFarmHealthRecords(
  filters: FarmHealthFilters,
  offset: number,
): Promise<FarmHealthRecord[]> {
  return listFarmHealthRecordsPage(filters, offset);
}

/**
 * Feature 15, Task 4 — flag (or unflag) a health record as a treatment that
 * actually worked.
 *
 * This is the ONE code path for the flag. Both places that offer the toggle —
 * the record's row and edit dialog on a goat's card, and the Doctor condition
 * page's "Your farm's history with this condition" list — call this same
 * action through the same shared `MarkEffectiveToggle` component, so the two
 * views can never drift apart: there is one column, one write, one truth.
 * `updateHealthRecord` deliberately does NOT touch `marked_effective`, so
 * editing a record's other fields can never silently clear the flag.
 *
 * RLS scopes the update to the signed-in owner. A record id belonging to
 * another owner matches no row, so nothing is written and the caller gets the
 * generic failure message — no new policy is needed for this column.
 */
export async function setHealthRecordEffective(
  recordId: number,
  effective: boolean,
): Promise<string | undefined> {
  const supabase = await createClient();

  // `select()` on the update returns the affected row, which both confirms RLS
  // let the write through and hands back the goat and title this record belongs
  // to — the two things needed to revalidate the pages that show it.
  const { data, error } = await supabase
    .from("health_records")
    .update({ marked_effective: effective })
    .eq("id", recordId)
    .select("goat_id, title")
    .maybeSingle();

  if (error || !data) {
    return "Could not update this record. Please try again.";
  }

  revalidateForGoat(data.goat_id);
  revalidatePath("/doctor");
  revalidatePath(`/doctor/${conditionSlug(data.title)}`);
}

/**
 * UPD-017 — the outcome of one bulk create, shown back in the dialog. Either
 * the whole operation failed (`error`, nothing was written) or it succeeded
 * and `created` / `createdGoats` describe what now exists. `missingGoats`
 * names anything that was asked for but is not the owner's to write to, so a
 * partial selection is reported rather than silently dropped.
 */
export interface BulkHealthRecordResult {
  error?: string;
  created?: number;
  createdGoats?: string[];
  missingGoats?: string[];
}

function goatLabel(goat: { tag: string; name: string | null }): string {
  return goat.name ? `${goat.tag} — ${goat.name}` : goat.tag;
}

/**
 * UPD-017 — apply one health record to many goats at once.
 *
 * Three things this deliberately does NOT do:
 *
 * 1. **It does not validate differently.** The shared field values go through
 *    `readHealthRecordFieldValues`, the exact function a single-goat create
 *    uses, once per submission. A bulk record is the same row a per-goat
 *    record is, so it cannot be created under looser rules (Section 6).
 * 2. **It does not trust the client's goat ids.** The submitted ids are
 *    re-read back through `goats` under RLS, so the insert can only ever
 *    reference goats this owner actually has, whatever the browser sent
 *    (Section 7). Ids that come back empty are reported, not skipped quietly.
 * 3. **It does not loop inserts.** All the rows go in ONE `insert` statement,
 *    which Postgres runs in a single implicit transaction — so this is
 *    genuinely all-or-nothing without needing an RPC: either every selected
 *    goat gets its record or none does and nothing is half-applied. The
 *    `select()` on the way back confirms how many rows really landed, so a
 *    short write is reported rather than assumed.
 */
export async function bulkCreateHealthRecords(
  formData: FormData,
): Promise<BulkHealthRecordResult> {
  // The selection travels as one comma-separated hidden field.
  const ids = [
    ...new Set(
      str(formData.get("goat_ids"))
        .split(",")
        .map((raw) => Number(raw.trim()))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ];
  if (ids.length === 0) {
    return { error: "Select at least one goat." };
  }

  const parsed = readHealthRecordFieldValues(formData);
  if ("error" in parsed) {
    return { error: parsed.error };
  }

  const supabase = await createClient();

  // Section 7 — the ids are re-scoped through RLS before anything is written.
  const { data: owned, error: goatError } = await supabase
    .from("goats")
    .select("id, tag, name")
    .in("id", ids)
    .order("tag");

  if (goatError) {
    return { error: "Could not check the selected goats. Please try again." };
  }

  const ownedGoats = owned ?? [];
  const ownedIds = new Set(ownedGoats.map((goat) => goat.id));
  const missingGoats = ids
    .filter((id) => !ownedIds.has(id))
    .map((id) => `#${id}`);

  if (ownedGoats.length === 0) {
    return {
      error:
        "None of the selected goats could be found. Reload the page and try again.",
      missingGoats,
    };
  }

  // owner_id is stamped by the column default (auth.uid()) on every row, just
  // as it is for a single-goat create.
  const { data: inserted, error } = await supabase
    .from("health_records")
    .insert(
      ownedGoats.map((goat) => ({ ...parsed.fields, goat_id: goat.id })),
    )
    .select("goat_id");

  if (error || !inserted) {
    return {
      error: `Could not save these records. Nothing was created for any of the ${ownedGoats.length} selected goats — please try again.`,
    };
  }

  // One statement, so a short result should be impossible — reported rather
  // than trusted, because "silently created fewer records than asked for" is
  // exactly the failure the owner would never notice.
  if (inserted.length !== ownedGoats.length) {
    const wrote = new Set(inserted.map((row) => row.goat_id));
    return {
      error: `Only ${inserted.length} of ${ownedGoats.length} records were created. Missing: ${ownedGoats
        .filter((goat) => !wrote.has(goat.id))
        .map(goatLabel)
        .join(", ")}. Check each goat's Health tab before retrying.`,
    };
  }

  // Best-effort catalogue writes, exactly as the single-goat create does them:
  // once per submission, not once per goat, and never able to fail the records
  // that already exist.
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

  for (const goat of ownedGoats) {
    revalidatePath(`/goats/${goat.id}`);
  }
  revalidatePath("/health");

  return {
    created: inserted.length,
    createdGoats: ownedGoats.map(goatLabel),
    ...(missingGoats.length > 0 ? { missingGoats } : {}),
  };
}
