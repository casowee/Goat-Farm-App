// Spec 17.2 — shared, request-cached goat and barn reads (§5A, §5F).
//
// The goat-detail page used to fetch the owner's whole goat list once for the
// pedigree walk and the parent pickers, and then the Breeding tab fetched it
// again — two full-herd round-trips per page view. `listHerdGoats()` is the
// single superset both need, wrapped in React `cache()` so it runs once per
// request no matter how many components ask.
//
// `cache()` is request-scoped only. Nothing is retained between requests, so
// this is not the server-side data caching that spec 17.2 §4 rules out — a
// reload still reads fresh rows from Supabase.
//
// Select strings are single literals so the Supabase client can still infer the
// row shapes from the generated types (see the note in `lib/health/queries.ts`).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * The union of every column the herd-wide consumers read: the pedigree walk and
 * parent pickers (tag / name / sex / status / temp tag / parent links) and the
 * doe-performance computation (reproductive state / date of birth / `dam_id`).
 * Deliberately a superset of both, so one query serves both and `cache()` can
 * collapse them.
 */
const HERD_GOAT_COLUMNS =
  "id, tag, name, sex, reproductive_state, date_of_birth, status, is_temp_tag, sire_id, dam_id, sire_name, dam_name, breed_composition:goat_breed_composition(breed, pct)";

type HerdGoatQuery = ReturnType<typeof herdGoatQuery>;
export type HerdGoat = NonNullable<Awaited<HerdGoatQuery>["data"]>[number];

type BarnQuery = ReturnType<typeof barnQuery>;
export type Barn = NonNullable<Awaited<BarnQuery>["data"]>[number];

function herdGoatQuery(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from("goats").select(HERD_GOAT_COLUMNS).order("tag");
}

function barnQuery(supabase: Awaited<ReturnType<typeof createClient>>) {
  return supabase.from("barns").select("id, name").order("name");
}

/**
 * Every goat the owner has, tag order. Includes sold / deceased / stolen goats
 * on purpose — lineage, parent pickers and kid counts all have to keep seeing
 * them. Callers that need *current herd* numbers apply the active-status rule
 * themselves (`computeHerdComposition` and friends); this query must not do it
 * for them.
 */
export const listHerdGoats = cache(async (): Promise<HerdGoat[]> => {
  const supabase = await createClient();
  const { data } = await herdGoatQuery(supabase);
  return data ?? [];
});

/** The owner's barns, name order — fetched by several components per render. */
export const listBarns = cache(async (): Promise<Barn[]> => {
  const supabase = await createClient();
  const { data } = await barnQuery(supabase);
  return data ?? [];
});
