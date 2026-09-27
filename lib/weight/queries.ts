// Spec 17.2 — weight reads, moved out of `app/(app)/weight/actions.ts` for the
// same two reasons as the health queries: a render-time read should not be a
// `"use server"` action, and React `cache()` needs a real module export.
//
// Select strings are single literals so the Supabase client can still infer the
// row shapes from the generated types (see the note in `lib/health/queries.ts`).

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { pageRange, HISTORY_PAGE_SIZE } from "@/lib/pagination";
import { weightDeltas } from "@/lib/weight/weights";

/** Everything the list renders or the edit dialog needs, minus the audit columns. */
const WEIGHT_COLUMNS = "id, goat_id, weighed_on, weight_kg, notes";

type WeightQuery = ReturnType<typeof weightQuery>;
export type Weight = NonNullable<Awaited<WeightQuery>["data"]>[number];

/** A weigh-in plus its change vs. the previous (older) weigh-in. */
export type WeightWithDelta = Weight & { delta: number | null };

/** A weigh-in reduced to what the growth chart plots. */
export interface WeightPoint {
  weighed_on: string;
  weight_kg: number;
}

function weightQuery(
  supabase: Awaited<ReturnType<typeof createClient>>,
  goatId: number,
) {
  return supabase
    .from("weights")
    .select(WEIGHT_COLUMNS)
    .eq("goat_id", goatId)
    .order("weighed_on", { ascending: false })
    .order("id", { ascending: false });
}

/**
 * One page of a goat's weigh-ins, newest first, each carrying its own delta
 * (spec 17.2 §5E).
 *
 * The delta is resolved here rather than on the client because showing
 * "+2.4 kg since last time" on the oldest row of a page needs the weigh-in
 * *before* it — a row that belongs to the next page. The query asks for
 * `pageSize + 1` rows, uses the extra older one only to seed that delta, and
 * returns exactly `pageSize` rows. That keeps the "Show more" offsets exact and
 * means paginating changes none of the numbers the owner sees.
 */
export async function listWeightsPageByGoat(
  goatId: number,
  offset = 0,
  pageSize: number = HISTORY_PAGE_SIZE,
): Promise<WeightWithDelta[]> {
  const supabase = await createClient();
  const { from } = pageRange(offset, pageSize);
  const { data } = await weightQuery(supabase, goatId).range(
    from,
    from + pageSize, // inclusive → pageSize + 1 rows
  );

  const newestFirst = data ?? [];

  // `weightDeltas` wants oldest-first and leaves the first entry's delta null —
  // right for the seed row, and right for the very oldest weigh-in when there
  // is no seed.
  const withDeltas = weightDeltas([...newestFirst].reverse())
    .map(({ row, delta }) => ({ ...row, delta }))
    .reverse();

  return withDeltas.slice(0, pageSize);
}

/** Total weigh-ins for this goat — head-only count (§5D). */
export const countWeightsByGoat = cache(
  async (goatId: number): Promise<number> => {
    const supabase = await createClient();
    const { count } = await supabase
      .from("weights")
      .select("id", { count: "exact", head: true })
      .eq("goat_id", goatId);

    return count ?? 0;
  },
);

/**
 * Every weigh-in for the growth chart, oldest first, trimmed to the two columns
 * the chart plots.
 *
 * Deliberately NOT paginated: the chart is a full-history computation (spec
 * 17.2 §2/§5E), so it keeps all its rows and only sheds columns.
 */
export const listWeightPointsByGoat = cache(
  async (goatId: number): Promise<WeightPoint[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("weights")
      .select("weighed_on, weight_kg")
      .eq("goat_id", goatId)
      .order("weighed_on", { ascending: true })
      .order("id", { ascending: true });

    return data ?? [];
  },
);
