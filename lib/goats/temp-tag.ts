// UPD-010 — auto-generated temporary tag for a newborn kid.
//
// Pure, no React / no Supabase, so it can move into a Supabase function later
// (architecture-context.md invariant 6) and is trivially unit-testable. The
// server action is the authority: it passes the full current tag list here and
// the returned value goes straight into `goats.tag` with `is_temp_tag = true`.
//
// Collision checks use `normalizeTag()` equivalence — the same "is this the same
// tag?" rule duplicate detection uses everywhere else in this project — NOT raw
// string equality, so a case / leading-zero variant ("mj02-k1", "MJ2-K1") of an
// existing tag can't be mistaken for an available slot.

import { normalizeTag } from "@/lib/goats/tag";

/**
 * The next unique `{damTag}-K{n}` value for a newborn kid of the given dam.
 *
 *   generateTempTag("MJ02", ["MJ02", "MJ01"])            → "MJ02-K1"
 *   generateTempTag("MJ02", ["MJ02", "MJ02-K1"])         → "MJ02-K2"
 *   generateTempTag("MJ02", ["mj02-k1", " MJ02 K2 "])    → "MJ02-K3"  (normalized match)
 *
 * `n` starts at 1 and increments until a non-colliding candidate is found. The
 * loop is bounded — after `existingTags.length + 1` attempts a fresh number is
 * guaranteed — but a hard cap keeps it total for any input.
 */
export function generateTempTag(damTag: string, existingTags: string[]): string {
  const base = damTag.trim();
  const taken = new Set(
    existingTags.map((t) => normalizeTag(t ?? "")).filter(Boolean),
  );

  const cap = existingTags.length + 2;
  for (let n = 1; n <= cap; n++) {
    const candidate = `${base}-K${n}`;
    if (!taken.has(normalizeTag(candidate))) return candidate;
  }

  // Unreachable in practice (cap always exceeds the number of possible
  // collisions); fall back to a suffix that cannot collide with a counted one.
  return `${base}-K${Date.now()}`;
}
