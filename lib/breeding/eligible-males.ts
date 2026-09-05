// Feature 09 — Breeding (Seasonal, Farm-Wide). Pure "which males can run with a
// breeding group" logic. No React, no Supabase.
//
// Filters to breeding-capable males (sex = male, reproductive_state = intact,
// status = active — the UPD-008/009 active-goat convention), then splits the
// survivors by DERIVED STAGE (delegated to `deriveGoatStage`, the single source
// of truth). Kid-stage males are dropped entirely — a kid can never be a buck
// in the picker under any circumstance. Wethers are already excluded by the
// `intact` filter.

import {
  deriveGoatStage,
  type GoatSex,
  type ReproductiveState,
} from "@/lib/goats/stage";

/** The subset of a `goats` row this needs. */
export interface EligibleMalesGoat {
  id: number;
  tag: string;
  name: string | null;
  sex: GoatSex;
  reproductive_state: ReproductiveState;
  date_of_birth: string;
  /** `goat_status` — only 'active' males are eligible. */
  status: string;
}

export interface EligibleMale {
  id: number;
  tag: string;
  name: string | null;
}

export interface EligibleBreedingMales {
  /** Derived stage `Buck` — shown in the picker by default. */
  bucks: EligibleMale[];
  /** Derived stage `Buckling` — shown only after "Show bucklings too". */
  bucklings: EligibleMale[];
}

export function eligibleBreedingMales(
  goats: EligibleMalesGoat[],
  now: Date = new Date(),
): EligibleBreedingMales {
  const bucks: EligibleMale[] = [];
  const bucklings: EligibleMale[] = [];

  for (const goat of goats) {
    if (
      goat.sex !== "male" ||
      goat.reproductive_state !== "intact" ||
      goat.status !== "active"
    ) {
      continue;
    }

    const stage = deriveGoatStage({
      sex: goat.sex,
      reproductiveState: goat.reproductive_state,
      dateOfBirth: goat.date_of_birth,
      now,
    });

    const entry: EligibleMale = { id: goat.id, tag: goat.tag, name: goat.name };
    if (stage === "Buck") bucks.push(entry);
    else if (stage === "Buckling") bucklings.push(entry);
    // "Kid" (and anything else) is dropped — never breeding-eligible here.
  }

  const byTag = (a: EligibleMale, b: EligibleMale) =>
    a.tag.localeCompare(b.tag, undefined, { numeric: true });
  bucks.sort(byTag);
  bucklings.sort(byTag);

  return { bucks, bucklings };
}

/**
 * Whether a single male is breeding-eligible at all (intact male, not Kid
 * stage). Used server-side to re-validate a submitted buck id — the active
 * check is applied separately (an already-linked buck that was later sold may
 * stay on its season).
 */
export function isBreedingEligibleMale(
  goat: Pick<
    EligibleMalesGoat,
    "sex" | "reproductive_state" | "date_of_birth"
  >,
  now: Date = new Date(),
): boolean {
  if (goat.sex !== "male" || goat.reproductive_state !== "intact") return false;
  const stage = deriveGoatStage({
    sex: goat.sex,
    reproductiveState: goat.reproductive_state,
    dateOfBirth: goat.date_of_birth,
    now,
  });
  return stage === "Buck" || stage === "Buckling";
}
