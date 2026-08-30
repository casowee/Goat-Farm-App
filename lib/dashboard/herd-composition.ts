// Feature 12 — Dashboard & Analytics. Pure, portable herd-composition maths: no
// React, no Supabase, so the dashboard page and (later) a mobile client or a
// Supabase function can all reuse it (architecture-context.md invariant 6).
//
// Stage derivation is NOT re-implemented here — it delegates to
// `deriveGoatStage()` from `lib/goats/stage.ts`, the single source of truth for
// the Kid / Doeling / Buckling / Doe / Buck / Wether rules.

import {
  deriveGoatStage,
  type GoatSex,
  type GoatStage,
  type ReproductiveState,
} from "@/lib/goats/stage";

/** The subset of a `goats` row this computation needs. */
export interface HerdCompositionGoat {
  sex: GoatSex;
  reproductive_state: ReproductiveState;
  date_of_birth: string;
  /**
   * `goat_status`. Only 'active' goats are part of the current herd — Sold /
   * Deceased / Stolen goats are excluded from every count here (total, per
   * stage, sex split, buck-to-doe ratio), unconditionally. This is a
   * correctness rule of the count itself, not a display filter
   * (UPD-008 amendment, 2026-08-30).
   */
  status: string;
}

export interface HerdComposition {
  /** How many goats were counted. */
  total: number;
  /** Count per derived stage. Every stage key is always present (0 if none). */
  byStage: Record<GoatStage, number>;
  totalMale: number;
  totalFemale: number;
  /**
   * Adult-stage counts only — `Buck` and `Doe`, excluding Bucklings, Doelings,
   * Wethers and Kids. This matches "for breeding planning" in
   * `project-overview.md` (Spec 12, Section 13 — confirmed by the owner
   * 2026-08-29).
   */
  buckToDoeRatio: { bucks: number; does: number };
}

function emptyByStage(): Record<GoatStage, number> {
  return { Kid: 0, Doeling: 0, Buckling: 0, Doe: 0, Buck: 0, Wether: 0 };
}

export function computeHerdComposition(
  goats: HerdCompositionGoat[],
  now: Date = new Date(),
): HerdComposition {
  // Only active goats count toward the current herd — a sold / deceased /
  // stolen goat has left, regardless of any list-level status filter.
  const activeGoats = goats.filter((goat) => goat.status === "active");

  const byStage = emptyByStage();
  let totalMale = 0;
  let totalFemale = 0;

  for (const goat of activeGoats) {
    const stage = deriveGoatStage({
      sex: goat.sex,
      reproductiveState: goat.reproductive_state,
      dateOfBirth: goat.date_of_birth,
      now,
    });
    byStage[stage] += 1;
    if (goat.sex === "male") totalMale += 1;
    else totalFemale += 1;
  }

  return {
    total: activeGoats.length,
    byStage,
    totalMale,
    totalFemale,
    buckToDoeRatio: { bucks: byStage.Buck, does: byStage.Doe },
  };
}
