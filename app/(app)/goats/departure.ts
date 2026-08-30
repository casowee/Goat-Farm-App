"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type CauseCategory = Extract<
  Database["public"]["Enums"]["health_record_type"],
  "illness" | "injury"
>;

export type GoatDepartureKind = "sale" | "death" | "stolen";

export interface GoatDepartureCause {
  title: string;
  category: CauseCategory;
  /** True when the owner typed a new cause via the combobox's "+ Add new". */
  isCustom: boolean;
}

function isIsoDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
  );
}

/**
 * UPD-008 (8c) — the ONE shared "a goat left the herd" side effect. Wraps the
 * `record_goat_departure` RPC, which atomically writes the goat's status, the
 * `herd_events` row, and (for a death with a cause) a `health_records` row, so
 * they can never half-apply out of sync (spec Section 7).
 *
 * Callers:
 *  - the reason-based removal dialog (Sold / Death / Stolen)
 *  - `createHerdEvent` (UPD-006's Log Herd Event form) for its Sale / Death paths
 *
 * A hard delete is NEVER performed here — that only happens for "Wrong
 * registration", via the existing `deleteGoat` action.
 */
export async function recordGoatDeparture(
  goatId: number,
  kind: GoatDepartureKind,
  date: string,
  note?: string,
  cause?: GoatDepartureCause,
): Promise<string | undefined> {
  if (!Number.isInteger(goatId) || goatId <= 0) {
    return "Could not find that goat.";
  }
  if (kind !== "sale" && kind !== "death" && kind !== "stolen") {
    return "Choose a reason for removing this goat.";
  }
  if (!date || !isIsoDate(date)) {
    return "Enter a valid date.";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${date}T00:00:00`) > today) {
    return "The date can't be in the future.";
  }

  const trimmedNote = note?.trim() ? note.trim() : undefined;
  const causeTitle =
    kind === "death" && cause?.title.trim() ? cause.title.trim() : undefined;
  const causeCategory = causeTitle ? (cause?.category ?? "illness") : undefined;

  const supabase = await createClient();

  // RLS already scopes this; the explicit check turns a would-be silent no-op
  // into a clean message and blocks acting on someone else's goat.
  const { data: goat } = await supabase
    .from("goats")
    .select("id")
    .eq("id", goatId)
    .maybeSingle();
  if (!goat) {
    return "Could not find that goat.";
  }

  const { error } = await supabase.rpc("record_goat_departure", {
    p_goat_id: goatId,
    p_kind: kind,
    p_date: date,
    p_note: trimmedNote,
    p_cause_title: causeTitle,
    p_cause_category: causeCategory,
  });

  if (error) {
    return "Could not record the removal. Please try again.";
  }

  // Best-effort: save a typed-in cause as an owner-scoped preset so it appears
  // in the combobox next time (same pattern as UPD-004's saveCustomTitlePreset).
  // A failure here must not fail the removal that already succeeded.
  if (kind === "death" && causeTitle && cause?.isCustom) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("health_condition_presets")
        .upsert(
          {
            owner_id: user.id,
            record_type: causeCategory ?? "illness",
            name: causeTitle,
          },
          { onConflict: "owner_id,record_type,name", ignoreDuplicates: true },
        );
    }
  }

  revalidatePath("/goats");
  revalidatePath(`/goats/${goatId}`);
  revalidatePath("/");

  return undefined;
}
