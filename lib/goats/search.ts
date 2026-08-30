// UPD-008 (8a) — goats-list search & filter.
// Pure, no React / no Supabase. Runs over the owner's already-fetched goat list
// (small farm scale — see the spec's Section 6 performance note), so there is
// no new query complexity and no schema change.

import {
  deriveGoatStage,
  type GoatSex,
  type GoatStage,
  type ReproductiveState,
} from "@/lib/goats/stage";
import { normalizeTag } from "@/lib/goats/tag";

/**
 * `goat_status` values. Kept as a local union (like `GoatSex`/`GoatStage` in
 * `stage.ts`) so this module stays free of the generated Supabase types and
 * remains portable — same reasoning as every other pure `lib/goats` function.
 */
export type GoatStatus = "active" | "sold" | "deceased" | "stolen";

/** The minimum shape `filterGoats` needs from a goat row. */
export interface FilterableGoat {
  tag: string;
  name: string | null;
  sex: GoatSex;
  reproductive_state: ReproductiveState;
  date_of_birth: string;
  barn_id: number | null;
  /** `goat_status` — the Status filter matches on this exactly (UPD-009). */
  status: string;
  /**
   * Breed composition rows (`goat_breed_composition`). The Breed filter (UPD-009)
   * matches when **any** component breed equals the chosen value, so a cross
   * matches on either of its breeds. Optional — a goat with no rows never
   * matches a specific breed filter.
   */
  breed_composition?: { breed: string; pct: number }[] | null;
}

export interface GoatFilters {
  /** Free text matched against tag and name — see `searchTier` for the rules. */
  search?: string;
  sex?: GoatSex;
  stage?: GoatStage;
  barnId?: number;
  /**
   * Exact `goat_status` match. `'all'` or omitted → no status filter. The UI
   * layer applies `'active'` as the default; this pure function never assumes
   * one (UPD-009 §7).
   */
  status?: GoatStatus | "all";
  /** Exact breed name; matches any one of a cross's component breeds (UPD-009). */
  breed?: string;
}

/**
 * How well a goat matches the search term, lower = better; `null` = no match.
 *
 * The only place tag normalization (`normalizeTag`, which strips leading zeros
 * inside digit runs) is applied to the *query* is Tier 0, where it compares two
 * whole tags for equivalence — the same "is this the same tag?" question
 * duplicate detection asks. Tiers 1 and 2 use the raw typed text only: reducing
 * the query before a substring match would collapse "009" to "9" and match
 * every tag containing a 9 anywhere.
 *
 *  - Tier 0 — exact: the tag is equivalent to the query as whole tags, or the
 *    name equals the query (case-insensitive).
 *  - Tier 1 — prefix: the raw tag or raw name starts with the raw query.
 *  - Tier 2 — substring: the raw tag or raw name contains the raw query.
 */
export function searchTier(
  goat: FilterableGoat,
  rawQuery: string,
): 0 | 1 | 2 | null {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return null;

  const tag = (goat.tag ?? "").toLowerCase();
  const name = (goat.name ?? "").toLowerCase();

  const exactTag = normalizeTag(goat.tag ?? "") === normalizeTag(rawQuery.trim());
  const exactName = name !== "" && name === q;
  if (exactTag || exactName) return 0;

  if (tag.startsWith(q) || (name !== "" && name.startsWith(q))) return 1;

  if (tag.includes(q) || (name !== "" && name.includes(q))) return 2;

  return null;
}

/**
 * Apply the combined search + sex + stage + barn filters (all AND, each
 * defaulting to "no filter") to a goat list. Stage is derived with
 * `deriveGoatStage` so the six computed stages stay in one place.
 *
 * With no search term the input order is preserved. With a search term the
 * results are ranked by match tier (exact → prefix → substring) and, within a
 * tier, sorted by tag (numeric-aware) for a stable, predictable order.
 */
export function filterGoats<T extends FilterableGoat>(
  goats: T[],
  filters: GoatFilters,
): T[] {
  const { search, sex, stage, barnId, status, breed } = filters;

  const attributeMatch = (goat: T): boolean => {
    if (sex !== undefined && goat.sex !== sex) return false;
    if (barnId !== undefined && goat.barn_id !== barnId) return false;
    if (status !== undefined && status !== "all" && goat.status !== status) {
      return false;
    }
    if (breed !== undefined && breed !== "") {
      const carriesBreed = (goat.breed_composition ?? []).some(
        (row) => row.breed === breed,
      );
      if (!carriesBreed) return false;
    }
    if (stage !== undefined) {
      const derived = deriveGoatStage({
        sex: goat.sex,
        reproductiveState: goat.reproductive_state,
        dateOfBirth: goat.date_of_birth,
      });
      if (derived !== stage) return false;
    }
    return true;
  };

  const query = search?.trim() ?? "";

  if (!query) {
    return goats.filter(attributeMatch);
  }

  const ranked: { goat: T; tier: 0 | 1 | 2 }[] = [];
  for (const goat of goats) {
    if (!attributeMatch(goat)) continue;
    const tier = searchTier(goat, query);
    if (tier !== null) ranked.push({ goat, tier });
  }

  ranked.sort(
    (a, b) =>
      a.tier - b.tier ||
      (a.goat.tag ?? "").localeCompare(b.goat.tag ?? "", undefined, {
        numeric: true,
        sensitivity: "base",
      }),
  );

  return ranked.map((r) => r.goat);
}
