// Feature 09 — Breeding (Seasonal, Farm-Wide). Pure buck-capacity stat: no
// React, no Supabase. Informational only — never a validation rule
// (09-breeding.md Section 8).
//
// The active buck / doe counts are NOT recomputed here — they come from
// `computeHerdComposition()` in `lib/dashboard/herd-composition.ts` (its
// `buckToDoeRatio`, which is already adult Buck / Doe stages only, excluding
// bucklings, doelings, wethers and kids, and already active-goats-only).

import type { HerdComposition } from "@/lib/dashboard/herd-composition";
import type { BreedingSettings } from "@/lib/breeding/settings";

export interface BuckCapacity {
  /** Active adult bucks (from herd composition). */
  activeBucks: number;
  /** Active adult does (from herd composition). */
  activeDoes: number;
  /** `ceil(activeDoes / doesPerGroup * bucksPerGroup)`, floored at 0. */
  recommendedBucks: number;
}

export function computeBuckCapacity(
  composition: Pick<HerdComposition, "buckToDoeRatio">,
  settings: Pick<BreedingSettings, "bucks_per_group" | "does_per_group">,
): BuckCapacity {
  const activeBucks = composition.buckToDoeRatio.bucks;
  const activeDoes = composition.buckToDoeRatio.does;

  const doesPerGroup = Math.max(1, settings.does_per_group);
  const bucksPerGroup = Math.max(0, settings.bucks_per_group);

  const recommendedBucks =
    activeDoes === 0
      ? 0
      : Math.ceil((activeDoes / doesPerGroup) * bucksPerGroup);

  return { activeBucks, activeDoes, recommendedBucks };
}
