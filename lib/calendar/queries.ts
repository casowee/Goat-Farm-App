// Feature 13 — Calendar reads. Read-only and RLS-scoped; no migration.
//
// Everything with a date of its own is read for the visible range only: the
// single-goat due dates, the kids born and the departures. Three sources are
// read whole, each for a reason, and each through the existing `cache()`d
// helper another page already uses:
//
//   - group health events — whether a due date still stands depends on every
//     later event for the same group (the "superseded" rule), wherever it falls;
//   - breeding seasons and templates — a season logged months ago is what puts
//     a kidding window in the month being shown, and the reminders need them
//     all. A farm has a handful of these.
//
// Select strings are single literals so the Supabase client can infer each row
// shape from the generated types (see `lib/health/queries.ts`).

import { createClient } from "@/lib/supabase/server";
import {
  listBatchDueHealthRecords,
  listHealthBatches,
} from "@/lib/health/queries";
import {
  listBreedingOccurrences,
  listBreedingSeasonBucks,
  listBreedingSeasonTemplates,
} from "@/lib/dashboard/queries";
import { GROUP_ACTIVITIES } from "@/lib/health/group-events";
import { DEFAULT_BREEDING_SETTINGS } from "@/lib/breeding/settings";
import { KIDDING_EVENT_GROUPING_DAYS } from "@/lib/breeding/doe-performance";
import type { DueSoonSourceRecord } from "@/lib/dashboard/due-soon";
import type { BreedingSeasonOccurrenceRow } from "@/lib/breeding/season";
import type {
  CalendarGoatRef,
  CalendarHerdEvent,
  CalendarSources,
} from "@/lib/calendar/events";
import { addDays } from "@/lib/calendar/view-state";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Single-goat routine records (no batch) due inside the range. Illness, injury,
 * treatment and checkup records are never read: only the three routine
 * activities are asked for.
 */
function singleDueQuery(supabase: Supabase, from: string, to: string) {
  return supabase
    .from("health_records")
    .select(
      "goat_id, record_type, title, next_due_date, status, goats!inner(id, tag, name)",
    )
    .is("batch_id", null)
    .in("record_type", [...GROUP_ACTIVITIES])
    .gte("next_due_date", from)
    .lte("next_due_date", to);
}

/** Goats with a recorded dam, born inside the range. */
function kidQuery(supabase: Supabase, from: string, to: string) {
  return supabase
    .from("goats")
    .select("id, tag, name, sex, reproductive_state, date_of_birth, status, dam_id")
    .not("dam_id", "is", null)
    .gte("date_of_birth", from)
    .lte("date_of_birth", to);
}

/** Sales, deaths and (as `other_removal`) stolen goats inside the range. */
function herdEventQuery(supabase: Supabase, from: string, to: string) {
  return supabase
    .from("herd_events")
    .select("id, event_type, event_date, goats(id, tag, name)")
    .in("event_type", ["sale", "death", "other_removal"])
    .gte("event_date", from)
    .lte("event_date", to);
}

export interface LoadedCalendarSources {
  sources: CalendarSources;
  /** False when the group-event read failed — see `listHealthBatches()`. */
  groupEventsLoaded: boolean;
}

/**
 * Every source the calendar combines, for the days `from`..`to` (ISO, inclusive).
 * The reads are independent, so they all start together.
 */
export async function loadCalendarSources(
  from: string,
  to: string,
): Promise<LoadedCalendarSources> {
  const supabase = await createClient();

  // A litter registered over a couple of days is one kidding event, so read a
  // few days either side to count it whole.
  const kidsFrom = addDays(from, -KIDDING_EVENT_GROUPING_DAYS);
  const kidsTo = addDays(to, KIDDING_EVENT_GROUPING_DAYS);

  const [
    batches,
    batchDueRecords,
    { data: singleRows },
    occurrences,
    seasonBucks,
    templates,
    { data: settingsRow },
    { data: kids },
    { data: goatRefs },
    { data: herdRows },
  ] = await Promise.all([
    listHealthBatches(),
    listBatchDueHealthRecords(),
    singleDueQuery(supabase, from, to),
    listBreedingOccurrences(),
    listBreedingSeasonBucks(),
    listBreedingSeasonTemplates(),
    supabase.from("breeding_settings").select("gestation_days").maybeSingle(),
    kidQuery(supabase, kidsFrom, kidsTo),
    // Tags only, to name a litter's dam.
    supabase.from("goats").select("id, tag, name"),
    herdEventQuery(supabase, from, to),
  ]);

  const singleDueRecords: DueSoonSourceRecord[] = (singleRows ?? []).map(
    (row) => ({
      goatId: row.goat_id,
      goatTag: row.goats.tag,
      goatName: row.goats.name,
      recordType: row.record_type,
      title: row.title,
      nextDueDate: row.next_due_date,
      status: row.status,
    }),
  );

  const buckIdsBySeason = new Map<number, number[]>();
  for (const row of seasonBucks) {
    buckIdsBySeason.set(row.season_id, [
      ...(buckIdsBySeason.get(row.season_id) ?? []),
      row.buck_id,
    ]);
  }
  const occurrenceRows: BreedingSeasonOccurrenceRow[] = occurrences.map(
    (occurrence) => ({
      id: occurrence.id,
      buck_ids: buckIdsBySeason.get(occurrence.id) ?? [],
      season_template_id: occurrence.season_template_id,
      start_date: occurrence.start_date,
      end_date: occurrence.end_date,
    }),
  );

  const kidRows = kids ?? [];
  const damIds = new Set(kidRows.map((kid) => kid.dam_id));
  const dams: CalendarGoatRef[] = (goatRefs ?? []).filter((goat) =>
    damIds.has(goat.id),
  );

  const herdEvents: CalendarHerdEvent[] = [];
  for (const row of herdRows ?? []) {
    if (row.event_type === "other_addition") continue;
    // A goat-less "other removal" is a manual headcount correction, not a
    // stolen goat.
    if (row.event_type === "other_removal" && !row.goats) continue;
    herdEvents.push({
      id: row.id,
      eventType: row.event_type,
      eventDate: row.event_date,
      goat: row.goats,
    });
  }

  return {
    sources: {
      batches: batches ?? [],
      batchDueRecords: batchDueRecords ?? [],
      singleDueRecords,
      templates,
      occurrences: occurrenceRows,
      gestationDays:
        settingsRow?.gestation_days ?? DEFAULT_BREEDING_SETTINGS.gestation_days,
      kids: kidRows,
      dams,
      herdEvents,
    },
    groupEventsLoaded: batches !== null && batchDueRecords !== null,
  };
}
