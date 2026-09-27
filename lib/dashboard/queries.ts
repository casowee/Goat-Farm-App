// Spec 17.3 (§5C) — the dashboard's reads, moved out of the page component.
//
// The page used to await one big `Promise.all` of eight queries before rendering
// any JSX, so nothing appeared until the slowest of them returned. Spec 17.3
// splits the dashboard into independent `<Suspense>` sections, and a section can
// only start its own fetch if the fetch is callable from inside it — hence this
// module.
//
// **Why this doesn't reintroduce a waterfall.** The page component awaits
// nothing. The sections are siblings, so React renders them all in the same pass
// and every query below starts together, exactly as `Promise.all` did. What
// changed is only *when each card paints* — the fast ones no longer wait for the
// slow ones.
//
// **Why `cache()`.** Several sections want the same rows (three consumers read
// the goat list). `cache()` is request-scoped memoisation, so the query runs once
// per request however many sections ask. Nothing is retained between requests, so
// this is not server-side data caching — a reload reads fresh rows, and spec
// 17.2 §4's exclusion still holds.
//
// Column lists are unchanged from the page's originals and are written as single
// literals so the Supabase client can still infer each row shape from the
// generated types (same reason as `lib/health/queries.ts`).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  computeHerdComposition,
  type HerdComposition,
} from "@/lib/dashboard/herd-composition";

/** What the herd-composition and sex-ratio donuts read, per barn view. */
const DASHBOARD_GOAT_COLUMNS =
  "id, tag, name, sex, reproductive_state, date_of_birth, status";

/**
 * The farm-wide goat read: every column the herd timeline, the newborn-periods
 * chart, the log-event picker and the breeding panel need between them.
 */
const ALL_GOAT_COLUMNS =
  "id, tag, name, sex, reproductive_state, status, origin, date_of_birth, purchase_date";

type DashboardGoatQuery = ReturnType<typeof dashboardGoatQuery>;
export type DashboardGoat = NonNullable<
  Awaited<DashboardGoatQuery>["data"]
>[number];

type AllGoatQuery = ReturnType<typeof allGoatQuery>;
export type DashboardAllGoat = NonNullable<Awaited<AllGoatQuery>["data"]>[number];

function dashboardGoatQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  barnId: number | undefined,
) {
  const query = supabase.from("goats").select(DASHBOARD_GOAT_COLUMNS);
  return barnId === undefined ? query : query.eq("barn_id", barnId);
}

function allGoatQuery(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from("goats").select(ALL_GOAT_COLUMNS).order("tag");
}

/**
 * The goats in the current barn view (or the whole farm when no barn filter is
 * set). RLS scopes this to the signed-in owner.
 *
 * `barnId` is part of the `cache()` key, so the composition donut, the sex-ratio
 * donut and the CSV export all share one query for a given view.
 */
export const listDashboardGoats = cache(
  async (barnId?: number): Promise<DashboardGoat[]> => {
    const supabase = await createClient();
    const { data } = await dashboardGoatQuery(supabase, barnId);
    return data ?? [];
  },
);

/**
 * Herd composition for the current barn view.
 *
 * Moved here verbatim from the dashboard page — same query, same
 * `computeHerdComposition` call, so sold, deceased and stolen goats keep being
 * excluded from the herd totals by exactly the same code as before (§5C, V10).
 * Nothing about the counting changed; only where it is called from.
 *
 * `cache()`d so the two donut cards and the CSV button share one computation and
 * cannot disagree about the numbers.
 */
export const loadHerdComposition = cache(
  async (barnId?: number): Promise<HerdComposition> =>
    computeHerdComposition(await listDashboardGoats(barnId)),
);

/** Every goat on the farm — never barn-filtered; whole-farm metrics only. */
export const listAllDashboardGoats = cache(
  async (): Promise<DashboardAllGoat[]> => {
    const supabase = await createClient();
    const { data } = await allGoatQuery(supabase);
    return data ?? [];
  },
);

/** Logged herd additions and removals, for the population timeline. */
export const listHerdEvents = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("herd_events")
    .select("event_type, event_date");
  return data ?? [];
});

/** Logged breeding seasons (feature 09). Farm-wide, not barn-filtered. */
export const listBreedingOccurrences = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("breeding_season_occurrences")
    .select("id, season_template_id, start_date, end_date");
  return data ?? [];
});

/** Which bucks were in which season. */
export const listBreedingSeasonBucks = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("breeding_season_bucks")
    .select("season_id, buck_id");
  return data ?? [];
});

/** The owner's breeding-season templates, in calendar order. */
export const listBreedingSeasonTemplates = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("breeding_season_templates")
    .select("id, label, start_month, length_months")
    .order("start_month");
  return data ?? [];
});

/**
 * Weigh-ins for the given goats, for the monthly average trend.
 *
 * Not `cache()`d, and deliberately so: the argument is an array, and `cache()`
 * keys on argument identity — two callers passing equal-but-distinct arrays would
 * each get their own entry and the memo would be worse than useless. Only the
 * weight-trend section reads this, so there is nothing to dedupe.
 */
export async function listDashboardWeights(goatIds: number[]) {
  if (goatIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("weights")
    .select("weighed_on, weight_kg")
    .in("goat_id", goatIds);
  return data ?? [];
}

/**
 * Health records with a `next_due_date`, for the "Due soon" card. Same
 * single-consumer reasoning as `listDashboardWeights` for the missing `cache()`.
 */
export async function listDueHealthRecords(goatIds: number[]) {
  if (goatIds.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("health_records")
    .select("goat_id, record_type, title, next_due_date, status")
    .not("next_due_date", "is", null)
    .in("goat_id", goatIds);
  return data ?? [];
}

/** The barn names used by the filter, the card descriptions and the CSV header. */
export const listDashboardBarns = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("barns").select("id, name").order("name");
  return data ?? [];
});

/**
 * Resolves the `?barn=` search param into the barn id the queries take and the
 * label the UI shows. Pure apart from the barn-name lookup, and shared so the
 * two donut descriptions and the CSV filename can never disagree.
 */
export interface BarnView {
  barnId: number | undefined;
  barnLabel: string;
  hasBarnFilter: boolean;
}

export const resolveBarnView = cache(async (
  barn: string | undefined,
): Promise<BarnView> => {
  const parsed = barn ? Number(barn) : undefined;
  const hasBarnFilter = parsed !== undefined && Number.isInteger(parsed);
  if (!hasBarnFilter) {
    return { barnId: undefined, barnLabel: "All barns", hasBarnFilter: false };
  }
  const barns = await listDashboardBarns();
  return {
    barnId: parsed,
    barnLabel: barns.find((b) => b.id === parsed)?.name ?? "Selected barn",
    hasBarnFilter: true,
  };
});
