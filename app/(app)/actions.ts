"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { recordGoatDeparture } from "@/app/(app)/goats/departure";

export type HerdEvent = Database["public"]["Tables"]["herd_events"]["Row"];
type HerdEventType = Database["public"]["Enums"]["herd_event_type"];

const HERD_EVENT_TYPES: HerdEventType[] = [
  "sale",
  "death",
  "other_addition",
  "other_removal",
];

function isHerdEventType(value: string): value is HerdEventType {
  return (HERD_EVENT_TYPES as string[]).includes(value);
}

/** True when this event type must name a goat (UPD-006 Section 6). */
function herdEventRequiresGoat(type: HerdEventType): boolean {
  return type === "sale" || type === "death";
}

function isIsoDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
  );
}

/**
 * UPD-006 (6b) — log a herd event. Birth and purchase are never logged here —
 * the timeline derives those from the goat records.
 *
 * UPD-008 (8c) refactor: Sale / Death now go through the shared
 * `recordGoatDeparture` helper (the `record_goat_departure` RPC), the same path
 * the reason-based removal dialog uses, so the goat-status + `herd_events`
 * side effect lives in exactly one place. Goat-less "Other addition" /
 * "Other removal" still use the `log_herd_event` RPC.
 */
export async function createHerdEvent(
  formData: FormData,
): Promise<string | undefined> {
  const typeRaw = String(formData.get("event_type") ?? "").trim();
  if (!isHerdEventType(typeRaw)) {
    return "Choose an event type.";
  }

  const goatIdRaw = String(formData.get("goat_id") ?? "").trim();
  let goatId: number | null = null;
  if (goatIdRaw) {
    const parsed = Number(goatIdRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return "Select a valid goat.";
    }
    goatId = parsed;
  }

  if (herdEventRequiresGoat(typeRaw) && goatId === null) {
    return typeRaw === "sale"
      ? "Pick which goat was sold."
      : "Pick which goat died.";
  }

  const dateRaw = String(formData.get("event_date") ?? "").trim();
  if (!dateRaw || !isIsoDate(dateRaw)) {
    return "Enter a valid date.";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(`${dateRaw}T00:00:00`) > today) {
    return "The date can't be in the future.";
  }

  const note = String(formData.get("note") ?? "").trim() || null;

  // Sale / Death → the shared departure path (status + herd_events, atomic).
  // Both require a goat (checked above), so `goatId` is non-null here.
  if ((typeRaw === "sale" || typeRaw === "death") && goatId !== null) {
    return recordGoatDeparture(goatId, typeRaw, dateRaw, note ?? undefined);
  }

  const supabase = await createClient();

  // RLS already scopes this, but the explicit check turns a would-be silent
  // no-op into a clean message and blocks linking someone else's goat.
  if (goatId !== null) {
    const { data: goat } = await supabase
      .from("goats")
      .select("id")
      .eq("id", goatId)
      .maybeSingle();
    if (!goat) {
      return "Could not find that goat.";
    }
  }

  // The RPC params default to NULL when omitted, so pass `undefined` (not
  // `null`) for the optional ones to satisfy the generated arg types.
  const { error } = await supabase.rpc("log_herd_event", {
    p_event_type: typeRaw,
    p_event_date: dateRaw,
    p_goat_id: goatId ?? undefined,
    p_note: note ?? undefined,
  });

  if (error) {
    return "Could not log the event. Please try again.";
  }

  revalidatePath("/");
  if (goatId !== null) {
    revalidatePath(`/goats/${goatId}`);
    revalidatePath("/goats");
  }
}
