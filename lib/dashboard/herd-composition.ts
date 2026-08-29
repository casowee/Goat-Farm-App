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
  const byStage = emptyByStage();
  let totalMale = 0;
  let totalFemale = 0;

  for (const goat of goats) {
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
    total: goats.length,
    byStage,
    totalMale,
    totalFemale,
    buckToDoeRatio: { bucks: byStage.Buck, does: byStage.Doe },
  };
}
