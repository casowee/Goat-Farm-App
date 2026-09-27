// Spec 17.2 — health-record reads, moved out of `app/(app)/health/actions.ts`.
//
// Two reasons for the move:
//   1. That file is `"use server"`, so every export there becomes a callable
//      server action (a POST endpoint). A plain read used during render has no
//      business being one.
//   2. React `cache()` (§5F) needs a real module export to dedupe against. The
//      goat-detail page and the Breeding tab both ask for the same presets and
//      the same herd data in one render; `cache()` collapses that to one query
//      per request without any server-side *data* caching — the cache lives
//      and dies with the request, so freshness is unchanged (§4, out of scope).
//
// Column lists are explicit (§5A) and written as single string literals: the
// Supabase client infers each row type from that literal, so concatenating the
// list would silently drop the generated types and lose the compile-time check
// that a screen's columns are actually selected.

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { pageRange, HISTORY_PAGE_SIZE } from "@/lib/pagination";

/**
 * Everything the Health tab renders or the edit dialog needs. The previous
 * `select('*')` also carried `created_at`, `updated_at` and `owner_id`, which
 * no screen reads.
 */
const HEALTH_RECORD_COLUMNS =
  "id, goat_id, record_type, status, title, date_occurred, next_due_date, medication_name, dosage, treatment_start_date, treatment_duration_days, treatment_times_per_day, vet_name, cost, notes";

/** The narrower subset `toDoePerformanceRow()` reads. */
const HEALTH_RECORD_SUMMARY_COLUMNS =
  "id, goat_id, record_type, title, date_occurred, status";

const HEALTH_PRESET_COLUMNS = "id, name, record_type, owner_id";

// The row shapes are derived from the queries themselves rather than from the
// full generated Row type, so they can never claim a column the select omits.
type HealthRecordQuery = ReturnType<typeof healthRecordQuery>;
export type HealthRecord = NonNullable<
  Awaited<HealthRecordQuery>["data"]
>[number];

type HealthSummaryQuery = ReturnType<typeof healthSummaryQuery>;
export type HealthRecordSummary = NonNullable<
  Awaited<HealthSummaryQuery>["data"]
>[number];

type HealthPresetQuery = ReturnType<typeof healthPresetQuery>;
export type HealthConditionPreset = NonNullable<
  Awaited<HealthPresetQuery>["data"]
>[number];

function healthRecordQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  goatId: number,
) {
  return supabase
    .from("health_records")
    .select(HEALTH_RECORD_COLUMNS)
    .eq("goat_id", goatId)
    .order("date_occurred", { ascending: false })
    .order("id", { ascending: false });
}

function healthSummaryQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  goatIds: number[],
) {
  return supabase
    .from("health_records")
    .select(HEALTH_RECORD_SUMMARY_COLUMNS)
    .in("goat_id", goatIds)
    .order("date_occurred", { ascending: false })
    .order("id", { ascending: false });
}

function healthPresetQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  return supabase
    .from("health_condition_presets")
    .select(HEALTH_PRESET_COLUMNS)
    .order("name");
}

/**
 * Every health-condition preset visible to the signed-in owner: the seeded
 * global defaults (`owner_id is null`) plus the owner's own custom presets.
 * RLS enforces that scoping; the combobox filters by `record_type` client-side.
 *
 * Cached per request — the goats list, the goat-detail page and the removal
 * dialog all want the same list.
 */
export const listHealthConditionPresets = cache(
  async (): Promise<HealthConditionPreset[]> => {
    const supabase = await createClient();
    const { data } = await healthPresetQuery(supabase);
    return data ?? [];
  },
);

/**
 * One page of a goat's health records, newest event first (spec 17.2 §5E).
 * `offset` 0 is the first page; "Show more" asks for the next one.
 */
export async function listHealthRecordsPageByGoat(
  goatId: number,
  offset = 0,
  pageSize: number = HISTORY_PAGE_SIZE,
): Promise<HealthRecord[]> {
  const supabase = await createClient();
  const { from, to } = pageRange(offset, pageSize);
  const { data } = await healthRecordQuery(supabase, goatId).range(from, to);

  return data ?? [];
}

/**
 * The FIRST page of a goat’s health records — the same 20 newest rows
 * `listHealthRecordsPageByGoat(goatId)` returns, but `cache()`d.
 *
 * Added by spec 17.3 (§5D). Splitting the goat-detail page into Suspense sections
 * gave two independent consumers of that first page: the Health tab renders it,
 * and the Breeding tab feeds it to `loadGoatBreedingTabData()` for a doe’s
 * kidding history. Before the split the page fetched it once and passed it to
 * both; now each section fetches for itself, so it has to be deduped here or the
 * query runs twice per render. This is exactly the §5C rule — sections keep using
 * 17.2’s helpers, with `cache()` so nothing is fetched twice.
 *
 * The paginated `listHealthRecordsPageByGoat` itself stays uncached on purpose:
 * “Show more” calls it per page from a server action, where request-scoped
 * memoisation would buy nothing.
 */
export const listHealthRecordsFirstPageByGoat = cache(
  async (goatId: number): Promise<HealthRecord[]> =>
    listHealthRecordsPageByGoat(goatId),
);

/**
 * How many health records the goat has in total — a head-only count, so a tab
 * can report the real total while the list shows one page (§5D/§5E).
 */
export const countHealthRecordsByGoat = cache(
  async (goatId: number): Promise<number> => {
    const supabase = await createClient();
    const { count } = await supabase
      .from("health_records")
      .select("id", { count: "exact", head: true })
      .eq("goat_id", goatId);

    return count ?? 0;
  },
);

/**
 * All of a goat's health records, newest event first — unpaginated.
 *
 * Kept for callers that genuinely need full history rather than a page.
 * RLS scopes this to the signed-in owner. Spec 07, Section 8.
 */
export const listHealthRecordsByGoat = cache(
  async (goatId: number): Promise<HealthRecord[]> => {
    const supabase = await createClient();
    const { data } = await healthRecordQuery(supabase, goatId);
    return data ?? [];
  },
);

/**
 * Health-record summaries for many goats in ONE query (spec 17.2 §5C).
 *
 * Replaces the Doe Performance page's per-doe lookup, which fired one
 * `select('*')` round-trip for every flagged doe. Ordered newest first so each
 * doe's slice stays in the order `toDoePerformanceRow()` expects.
 */
export async function listHealthRecordSummariesByGoats(
  goatIds: number[],
): Promise<Map<number, HealthRecordSummary[]>> {
  const byGoat = new Map<number, HealthRecordSummary[]>();
  if (goatIds.length === 0) return byGoat;

  const supabase = await createClient();
  const { data } = await healthSummaryQuery(supabase, goatIds);

  for (const row of data ?? []) {
    const list = byGoat.get(row.goat_id) ?? [];
    list.push(row);
    byGoat.set(row.goat_id, list);
  }
  return byGoat;
}
