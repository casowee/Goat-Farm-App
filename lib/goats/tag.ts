// UPD-008 (8b) — tag normalization + duplicate-tag detection.
// Pure, no React / no Supabase, so it can move into a Supabase function later
// (architecture-context.md invariant 6) and is trivially unit-testable.
//
// Two tags are "the same" once case, surrounding whitespace, and leading zeros
// inside every digit run are ignored — so "MJ02", "MJ2", "mj2", and " Mj 02 "
// all normalize to the same string. This powers the goats-list search (8a) and
// the non-blocking duplicate warning on the goat form (8b).
//
// Duplicate detection only ever considers ACTIVE goats. A tag retired with a
// goat that was Sold / Deceased / Stolen is free to reuse on a new animal —
// normal farm practice, not a mistake — so `findDuplicateTagGroups` and
// `findTagMatches` skip any goat whose status isn't 'active'. The retired
// goat keeps its own tag on its own record forever; this only affects which
// goats a NEW tag entry is checked against.
//
// UPD-010: they also skip any goat with `is_temp_tag = true`. A newborn kid's
// `{dam_tag}-K{n}` value is system-generated and already guaranteed unique
// against the whole herd, so warning about it would just be noise. Once the kid
// is promoted to a real tag (`is_temp_tag` back to false) it re-enters the
// comparison set like any other goat.

/**
 * Canonical form of a tag for equality/search comparison.
 *
 *   "MJ02"   → "mj2"
 *   "mj2"    → "mj2"
 *   " Mj 02" → "mj2"
 *   "007"    → "7"
 *   "0"      → "0"
 */
export function normalizeTag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\d+/g, (digits) => String(parseInt(digits, 10)));
}

/** The minimum shape the duplicate-detection helpers need from a goat row. */
export interface TaggedGoat {
  id: number;
  tag: string;
  /** `goat_status` — only 'active' goats are considered a live tag collision. */
  status: string;
  /**
   * UPD-010 — a system-generated newborn temp tag (`{dam_tag}-K{n}`). Already
   * guaranteed unique, so it's excluded from duplicate detection entirely.
   */
  is_temp_tag?: boolean;
}

/**
 * Group ACTIVE goats that share a normalized tag. Non-active goats (Sold /
 * Deceased / Stolen) are skipped — their tags are retired and reusable. Only
 * groups with **more than one** member are returned. Groups keep the input
 * order of their members; the group list is ordered by each group's first
 * appearance in `goats`.
 *
 * At this farm's scale (tens to a few hundred goats) this is a single in-memory
 * pass with no measurable cost — no index or schema support is needed.
 */
export function findDuplicateTagGroups<T extends TaggedGoat>(goats: T[]): T[][] {
  const byNormalized = new Map<string, T[]>();

  for (const goat of goats) {
    if (goat.status !== "active") continue;
    if (goat.is_temp_tag) continue;
    const key = normalizeTag(goat.tag ?? "");
    if (!key) continue; // a blank tag can't be a meaningful duplicate
    const group = byNormalized.get(key);
    if (group) {
      group.push(goat);
    } else {
      byNormalized.set(key, [goat]);
    }
  }

  return [...byNormalized.values()].filter((group) => group.length > 1);
}

/**
 * The other ACTIVE goats whose tag collides with `tag` once normalized,
 * excluding the goat identified by `excludeId` (the one being edited). Sold /
 * Deceased / Stolen goats are ignored — their tags are free to reuse. Used by
 * the goat form's non-blocking duplicate warning — it must never block a save.
 */
export function findTagMatches<T extends TaggedGoat>(
  tag: string,
  goats: T[],
  excludeId?: number,
): T[] {
  const key = normalizeTag(tag ?? "");
  if (!key) return [];
  return goats.filter(
    (goat) =>
      goat.id !== excludeId &&
      goat.status === "active" &&
      !goat.is_temp_tag &&
      normalizeTag(goat.tag ?? "") === key,
  );
}
