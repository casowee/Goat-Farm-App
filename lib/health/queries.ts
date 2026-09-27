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
import type { HealthRecordType } from "@/lib/health/records";
import type { DueSoonSourceRecord } from "@/lib/dashboard/due-soon";

/**
 * Everything the Health tab renders or the edit dialog needs. The previous
 * `select('*')` also carried `created_at`, `updated_at` and `owner_id`, which
 * no screen reads.
 */
const HEALTH_RECORD_COLUMNS =
  "id, goat_id, record_type, status, title, date_occurred, next_due_date, medication_name, dosage, treatment_start_date, treatment_duration_days, treatment_times_per_day, vet_name, cost, notes, marked_effective";

/**
 * Feature 15 — one row of the Doctor condition page's "Your farm's history with
 * this condition" list. The goat is embedded rather than looked up per row so
 * the whole list is one query (spec 17.2 §5C), and `!inner` drops any record
 * whose goat has gone, which would have nothing to link to anyway.
 */
const DOCTOR_HISTORY_COLUMNS =
  "id, goat_id, record_type, status, title, date_occurred, medication_name, dosage, treatment_start_date, treatment_duration_days, treatment_times_per_day, vet_name, cost, notes, marked_effective, goats!inner(id, tag, name)";

/** Just enough to count what the farm has logged, per condition name. */
const HEALTH_RECORD_TITLE_COLUMNS = "title, marked_effective";

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

// ---------------------------------------------------------------------------
// Feature 15 — Doctor (health reference) reads.
//
// These live here, with the other `health_records` reads, rather than under
// `lib/doctor/`: they are the same table, the same RLS scoping and the same
// explicit-column discipline as everything above. `lib/doctor/conditions.ts`
// stays pure static content with no I/O.
// ---------------------------------------------------------------------------

function doctorHistoryQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
) {
  return supabase
    .from("health_records")
    .select(DOCTOR_HISTORY_COLUMNS)
    .eq("title", title)
    .order("date_occurred", { ascending: false })
    .order("id", { ascending: false });
}

function healthTitleStatsQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  return supabase.from("health_records").select(HEALTH_RECORD_TITLE_COLUMNS);
}

type DoctorHistoryQuery = ReturnType<typeof doctorHistoryQuery>;
export type DoctorHistoryRecord = NonNullable<
  Awaited<DoctorHistoryQuery>["data"]
>[number];

/** What the farm has logged under one condition name: totals for the browse list. */
export interface ConditionHistoryStats {
  /** Health records logged under this exact title. */
  count: number;
  /** How many of those are flagged `marked_effective`. */
  effectiveCount: number;
}

/**
 * Every health record logged under this exact condition name, across all of the
 * owner's goats, newest event first — the Doctor page's "what worked before".
 *
 * Matching is a straight equality on `health_records.title`, which is why the
 * static reference names in `lib/doctor/conditions.ts` must match UPD-004's
 * seeded preset strings character-for-character. RLS scopes this to the
 * signed-in owner exactly as it does every other read of this table, so a
 * second account can never see another owner's history or effectiveness flags.
 */
export const listHealthRecordsByTitle = cache(
  async (title: string): Promise<DoctorHistoryRecord[]> => {
    const supabase = await createClient();
    const { data } = await doctorHistoryQuery(supabase, title);
    return data ?? [];
  },
);

/**
 * Per-condition record counts for the whole farm, keyed by exact title.
 *
 * One narrow two-column read rather than a count query per condition: the
 * browse page shows a line for ~17 static conditions plus any custom preset,
 * and 17+ head-only counts would be 17+ round-trips.
 */
export const listConditionHistoryStats = cache(
  async (): Promise<Map<string, ConditionHistoryStats>> => {
    const supabase = await createClient();
    const { data } = await healthTitleStatsQuery(supabase);

    const stats = new Map<string, ConditionHistoryStats>();
    for (const row of data ?? []) {
      const entry = stats.get(row.title) ?? { count: 0, effectiveCount: 0 };
      entry.count += 1;
      if (row.marked_effective) entry.effectiveCount += 1;
      stats.set(row.title, entry);
    }
    return stats;
  },
);

// ---------------------------------------------------------------------------
// UPD-016 — farm-wide health reads for the `/health` page.
//
// Feature 07 stores health records per goat and every existing read is scoped
// by `goat_id`. Nothing aggregated across the herd existed, which is why the
// sidebar's Health entry sat on a stub. These reads add that view only — they
// do not change how a record is created, stored or shown on a goat's own
// Health tab.
//
// The goat is embedded (`goats!inner`) rather than looked up per row, so the
// whole page is one query (the same spec 17.2 §5C rule the Doctor history
// follows), and `!inner` drops any record whose goat has gone — there would be
// nothing to link to anyway.
// ---------------------------------------------------------------------------

/** One row of the History tab: the record, plus the goat it belongs to. */
const FARM_HEALTH_RECORD_COLUMNS =
  "id, goat_id, record_type, status, title, date_occurred, next_due_date, medication_name, dosage, treatment_duration_days, treatment_times_per_day, vet_name, cost, notes, marked_effective, goats!inner(id, tag, name)";

/** Just enough of a due record to build a Schedule row (plus its goat). */
const FARM_DUE_HEALTH_COLUMNS =
  "goat_id, record_type, title, next_due_date, status, goats!inner(id, tag, name)";

/** The History tab's two optional filters, both carried in the URL. */
export interface FarmHealthFilters {
  goatId?: number;
  recordType?: HealthRecordType;
}

function farmHealthRecordQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: FarmHealthFilters,
) {
  let query = supabase
    .from("health_records")
    .select(FARM_HEALTH_RECORD_COLUMNS)
    .order("date_occurred", { ascending: false })
    .order("id", { ascending: false });

  if (filters.goatId != null) query = query.eq("goat_id", filters.goatId);
  if (filters.recordType) query = query.eq("record_type", filters.recordType);

  return query;
}

function farmDueHealthQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
) {
  return supabase
    .from("health_records")
    .select(FARM_DUE_HEALTH_COLUMNS)
    .not("next_due_date", "is", null);
}

type FarmHealthRecordQuery = ReturnType<typeof farmHealthRecordQuery>;
export type FarmHealthRecord = NonNullable<
  Awaited<FarmHealthRecordQuery>["data"]
>[number];

/**
 * One page of every health record the owner has, across every goat, newest
 * event first. RLS scopes it to the signed-in owner exactly as the per-goat
 * read does, so a second account can never see another farm's records.
 */
export async function listFarmHealthRecordsPage(
  filters: FarmHealthFilters = {},
  offset = 0,
  pageSize: number = HISTORY_PAGE_SIZE,
): Promise<FarmHealthRecord[]> {
  const supabase = await createClient();
  const { from, to } = pageRange(offset, pageSize);
  const { data } = await farmHealthRecordQuery(supabase, filters).range(
    from,
    to,
  );
  return data ?? [];
}

/** The `cache()`d first page — the History tab renders it during the request. */
export const listFarmHealthRecordsFirstPage = cache(
  async (filters: FarmHealthFilters = {}): Promise<FarmHealthRecord[]> =>
    listFarmHealthRecordsPage(filters),
);

/**
 * How many records match the History tab's current filters — a head-only
 * count, so "Show more" disappears at exactly the right moment (§5D/§5E).
 */
export const countFarmHealthRecords = cache(
  async (filters: FarmHealthFilters = {}): Promise<number> => {
    const supabase = await createClient();
    let query = supabase
      .from("health_records")
      .select("id", { count: "exact", head: true });

    if (filters.goatId != null) query = query.eq("goat_id", filters.goatId);
    if (filters.recordType) query = query.eq("record_type", filters.recordType);

    const { count } = await query;
    return count ?? 0;
  },
);

/**
 * Every record the owner has that carries a `next_due_date`, farm-wide, mapped
 * into `dueSoon()`'s input shape.
 *
 * The dashboard's own widget keeps its barn-scoped `listDueHealthRecords()`;
 * this is the un-scoped equivalent for the Schedule tab. Both feed the *same*
 * `dueSoon()` computation in `lib/dashboard/due-soon.ts` — the windowing,
 * ordering and overdue handling are not reimplemented here.
 */
export const listFarmDueHealthRecords = cache(
  async (): Promise<DueSoonSourceRecord[]> => {
    const supabase = await createClient();
    const { data } = await farmDueHealthQuery(supabase);

    return (data ?? []).map((row) => ({
      goatId: row.goat_id,
      goatTag: row.goats.tag,
      goatName: row.goats.name,
      recordType: row.record_type,
      title: row.title,
      nextDueDate: row.next_due_date,
      status: row.status,
    }));
  },
);
