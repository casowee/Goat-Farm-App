"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import {
  type BreedComposition,
  normalizeComposition,
  primaryBreed,
  validateComposition,
} from "@/lib/goats/breeds";

type GoatSex = Database["public"]["Enums"]["goat_sex"];
type GoatStatus = Database["public"]["Enums"]["goat_status"];
type ReproductiveState = Database["public"]["Enums"]["reproductive_state"];
type GoatOrigin = Database["public"]["Enums"]["goat_origin"];

const GOAT_SEXES: GoatSex[] = ["male", "female"];
const GOAT_STATUSES: GoatStatus[] = ["active", "sold", "deceased"];
const REPRODUCTIVE_STATES: ReproductiveState[] = ["intact", "castrated"];
const GOAT_ORIGINS: GoatOrigin[] = ["born_here", "purchased"];

// A parent is either an in-system goat id OR an external name, never both.
// An id, when present, wins and the name is cleared.
function resolveParent(
  idRaw: FormDataEntryValue | null,
  nameRaw: FormDataEntryValue | null,
  which: "sire" | "dam",
  selfId?: number,
): { id: number | null; name: string | null } | { error: string } {
  const idStr = typeof idRaw === "string" ? idRaw.trim() : "";
  const nameStr = typeof nameRaw === "string" ? nameRaw.trim() : "";

  if (idStr) {
    const idNum = Number(idStr);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return { error: `Select a valid ${which}.` };
    }
    if (selfId != null && idNum === selfId) {
      return { error: `A goat can't be its own ${which}.` };
    }
    return { id: idNum, name: null };
  }

  if (nameStr) {
    return { id: null, name: nameStr };
  }

  return { id: null, name: null };
}

// Parse the JSON breed composition the form submits (an array of {breed, pct}).
function parseComposition(
  raw: FormDataEntryValue | null,
): BreedComposition | { error: string } {
  if (typeof raw !== "string" || !raw.trim()) {
    return { error: "Breed is required." };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Breed is required." };
  }
  if (!Array.isArray(parsed)) {
    return { error: "Breed is required." };
  }
  const rows: BreedComposition = [];
  for (const entry of parsed) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as { breed?: unknown }).breed !== "string" ||
      typeof (entry as { pct?: unknown }).pct !== "number"
    ) {
      return { error: "Breed entry is not in the expected format." };
    }
    rows.push({
      breed: (entry as { breed: string }).breed.trim(),
      pct: (entry as { pct: number }).pct,
    });
  }
  const normalized = normalizeComposition(rows);
  const invalid = validateComposition(normalized);
  if (invalid) {
    return { error: invalid };
  }
  return normalized;
}

function readGoatFields(formData: FormData, selfId?: number) {
  const tag = formData.get("tag");
  const name = formData.get("name");
  const sex = formData.get("sex");
  const dateOfBirth = formData.get("date_of_birth");
  const reproductiveState = formData.get("reproductive_state");
  const status = formData.get("status");
  const barnId = formData.get("barn_id");
  const notes = formData.get("notes");
  const origin = formData.get("origin");
  const purchaseDate = formData.get("purchase_date");

  if (typeof tag !== "string" || !tag.trim()) {
    return { error: "Tag is required." } as const;
  }

  const composition = parseComposition(formData.get("breed_composition"));
  if ("error" in composition) {
    return { error: composition.error } as const;
  }

  if (typeof origin !== "string" || !GOAT_ORIGINS.includes(origin as GoatOrigin)) {
    return { error: "Select a valid origin." } as const;
  }

  if (typeof sex !== "string" || !GOAT_SEXES.includes(sex as GoatSex)) {
    return { error: "Select a valid sex." } as const;
  }

  if (typeof dateOfBirth !== "string" || !dateOfBirth) {
    return { error: "Date of birth is required." } as const;
  }

  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime()) || dob > new Date()) {
    return { error: "Enter a valid date of birth that isn't in the future." } as const;
  }

  let resolvedPurchaseDate: string | null = null;
  if (origin === "purchased" && typeof purchaseDate === "string" && purchaseDate) {
    const purchase = new Date(purchaseDate);
    if (Number.isNaN(purchase.getTime()) || purchase > new Date()) {
      return {
        error: "Enter a valid purchase date that isn't in the future.",
      } as const;
    }
    if (purchase < dob) {
      return {
        error: "Purchase date can't be before the date of birth.",
      } as const;
    }
    resolvedPurchaseDate = purchaseDate;
  }

  if (
    typeof status !== "string" ||
    !GOAT_STATUSES.includes(status as GoatStatus)
  ) {
    return { error: "Select a valid status." } as const;
  }

  let resolvedReproductiveState: ReproductiveState = "intact";
  if (sex === "male") {
    if (
      typeof reproductiveState !== "string" ||
      !REPRODUCTIVE_STATES.includes(reproductiveState as ReproductiveState)
    ) {
      return { error: "Select a valid reproductive state." } as const;
    }
    resolvedReproductiveState = reproductiveState as ReproductiveState;
  }

  if (typeof barnId !== "string" || !barnId) {
    return { error: "Barn is required." } as const;
  }
  const barnIdNumber = Number(barnId);
  if (!Number.isInteger(barnIdNumber)) {
    return { error: "Select a valid barn." } as const;
  }

  const sire = resolveParent(
    formData.get("sire_id"),
    formData.get("sire_name"),
    "sire",
    selfId,
  );
  if ("error" in sire) {
    return { error: sire.error } as const;
  }
  const dam = resolveParent(
    formData.get("dam_id"),
    formData.get("dam_name"),
    "dam",
    selfId,
  );
  if ("error" in dam) {
    return { error: dam.error } as const;
  }

  return {
    composition,
    fields: {
      tag: tag.trim(),
      name: typeof name === "string" && name.trim() ? name.trim() : null,
      // Denormalised primary-breed label; the full split lives in goat_breed_composition.
      breed: primaryBreed(composition),
      sex: sex as GoatSex,
      date_of_birth: dateOfBirth,
      reproductive_state: resolvedReproductiveState,
      status: status as GoatStatus,
      barn_id: barnIdNumber,
      origin: origin as GoatOrigin,
      purchase_date: resolvedPurchaseDate,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      sire_id: sire.id,
      sire_name: sire.name,
      dam_id: dam.id,
      dam_name: dam.name,
    },
  } as const;
}

// Confirm any referenced parent ids are among the owner's goats (RLS already
// scopes the query) so the owner gets a clean message instead of a raw FK error.
async function verifyParentIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentIds: number[],
): Promise<string | undefined> {
  if (parentIds.length === 0) return;
  const { data } = await supabase
    .from("goats")
    .select("id")
    .in("id", parentIds);
  const found = new Set((data ?? []).map((row) => row.id));
  if (parentIds.some((id) => !found.has(id))) {
    return "One of the selected parents could not be found.";
  }
}

export async function createGoat(
  formData: FormData
): Promise<string | undefined> {
  const parsed = readGoatFields(formData);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();

  const { data: barn } = await supabase
    .from("barns")
    .select("id")
    .eq("id", parsed.fields.barn_id)
    .maybeSingle();

  if (!barn) {
    return "Select a valid barn.";
  }

  const parentError = await verifyParentIds(
    supabase,
    [parsed.fields.sire_id, parsed.fields.dam_id].filter(
      (id): id is number => id != null,
    ),
  );
  if (parentError) {
    return parentError;
  }

  // owner_id is not set here: the column default (auth.uid()) stamps it,
  // and RLS scopes every later read/update/delete to that owner.
  const { data: created, error } = await supabase
    .from("goats")
    .insert(parsed.fields)
    .select("id")
    .single();

  if (error || !created) {
    return "Could not register the goat. Please try again.";
  }

  const compositionError = await writeBreedComposition(
    supabase,
    created.id,
    parsed.composition,
  );
  if (compositionError) {
    return compositionError;
  }

  revalidatePath("/goats");
}

// Replace a goat's breed-composition rows. Two-step (delete + insert), not
// atomic — acceptable for a single-owner app (06-family-tree.md Section 16).
async function writeBreedComposition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  goatId: number,
  composition: BreedComposition,
): Promise<string | undefined> {
  const { error: deleteError } = await supabase
    .from("goat_breed_composition")
    .delete()
    .eq("goat_id", goatId);
  if (deleteError) {
    return "Could not save the goat's breed. Please try again.";
  }

  const { error: insertError } = await supabase
    .from("goat_breed_composition")
    .insert(
      composition.map((row) => ({
        goat_id: goatId,
        breed: row.breed,
        pct: row.pct,
      })),
    );
  if (insertError) {
    return "Could not save the goat's breed. Please try again.";
  }
}

export async function updateGoat(
  id: number,
  formData: FormData
): Promise<string | undefined> {
  const parsed = readGoatFields(formData, id);
  if ("error" in parsed) {
    return parsed.error;
  }

  const supabase = await createClient();

  const { data: barn } = await supabase
    .from("barns")
    .select("id")
    .eq("id", parsed.fields.barn_id)
    .maybeSingle();

  if (!barn) {
    return "Select a valid barn.";
  }

  const parentError = await verifyParentIds(
    supabase,
    [parsed.fields.sire_id, parsed.fields.dam_id].filter(
      (pid): pid is number => pid != null,
    ),
  );
  if (parentError) {
    return parentError;
  }

  const { error } = await supabase
    .from("goats")
    .update(parsed.fields)
    .eq("id", id);

  if (!error) {
    const compositionError = await writeBreedComposition(
      supabase,
      id,
      parsed.composition,
    );
    if (compositionError) {
      return compositionError;
    }
  }

  if (error) {
    return "Could not update the goat. Please try again.";
  }

  revalidatePath("/goats");
  revalidatePath(`/goats/${id}`);
}

export async function deleteGoat(id: number): Promise<string | undefined> {
  const supabase = await createClient();
  const { error } = await supabase.from("goats").delete().eq("id", id);

  if (error) {
    return "Could not delete the goat. Please try again.";
  }

  revalidatePath("/goats");
}

// Feature 06 (6d) — move a goat to another barn and record the move.
// Two-step (update goats.barn_id, then insert the history row); not atomic — see
// 06-family-tree.md Section 16, decision 6.
export async function moveGoatToBarn(
  goatId: number,
  formData: FormData,
): Promise<string | undefined> {
  const toBarnRaw = formData.get("to_barn_id");
  const movedOnRaw = formData.get("moved_on");
  const noteRaw = formData.get("note");

  const toBarnId = typeof toBarnRaw === "string" ? Number(toBarnRaw) : NaN;
  if (!Number.isInteger(toBarnId)) {
    return "Select a barn to move to.";
  }

  let movedOn: string | undefined;
  if (typeof movedOnRaw === "string" && movedOnRaw) {
    const moved = new Date(movedOnRaw);
    if (Number.isNaN(moved.getTime()) || moved > new Date()) {
      return "Enter a valid move date that isn't in the future.";
    }
    movedOn = movedOnRaw;
  }

  const note =
    typeof noteRaw === "string" && noteRaw.trim() ? noteRaw.trim() : null;

  const supabase = await createClient();

  const { data: goat } = await supabase
    .from("goats")
    .select("id, barn_id")
    .eq("id", goatId)
    .maybeSingle();
  if (!goat) {
    return "Could not find that goat.";
  }

  const { data: toBarn } = await supabase
    .from("barns")
    .select("id")
    .eq("id", toBarnId)
    .maybeSingle();
  if (!toBarn) {
    return "Select a valid barn.";
  }

  if (goat.barn_id === toBarnId) {
    return "That goat is already in this barn.";
  }

  const { error: updateError } = await supabase
    .from("goats")
    .update({ barn_id: toBarnId })
    .eq("id", goatId);
  if (updateError) {
    return "Could not move the goat. Please try again.";
  }

  const { error: insertError } = await supabase.from("goat_barn_moves").insert({
    goat_id: goatId,
    from_barn_id: goat.barn_id,
    to_barn_id: toBarnId,
    moved_on: movedOn,
    note,
  });
  if (insertError) {
    // The move applied; only the history row failed. Don't roll back.
    return "The goat was moved, but the history entry could not be saved.";
  }

  revalidatePath("/goats");
  revalidatePath(`/goats/${goatId}`);
}
