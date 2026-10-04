// UPD-017 amendment (2026-10-04) — the description of the group a bulk health
// action was applied to. Pure, no React / no Supabase.
//
// The label is GENERATED from the filters the owner used to pick the group
// ("Does", "Kids · Barn 2", "All goats"), never typed by hand, and is stored on
// the `health_record_batches` row so the Health page can show a whole bulk
// action as one line. The bulk dialog (live preview) and the server action (the
// stored value) both call this one function, so what the owner confirmed is
// what gets saved.

import type { GoatSex, GoatStage } from "@/lib/goats/stage";

export const GOAT_STAGES: readonly GoatStage[] = [
  "Kid",
  "Doeling",
  "Buckling",
  "Doe",
  "Buck",
  "Wether",
];

const STAGE_PLURALS: Record<GoatStage, string> = {
  Kid: "Kids",
  Doeling: "Doelings",
  Buckling: "Bucklings",
  Doe: "Does",
  Buck: "Bucks",
  Wether: "Wethers",
};

const SEX_PLURALS: Record<GoatSex, string> = {
  female: "Females",
  male: "Males",
};

export function isGoatStage(value: string): value is GoatStage {
  return (GOAT_STAGES as readonly string[]).includes(value);
}

export function isGoatSex(value: string): value is GoatSex {
  return value === "male" || value === "female";
}

/** The group filters a bulk action can target. All optional — none = "All goats". */
export interface BatchGroupFilters {
  sex?: GoatSex;
  stage?: GoatStage;
  /** The chosen barn's name (not its id) — the label is for reading. */
  barnName?: string;
}

/**
 * "Does", "Kids · Barn 2", "Female kids", "Males · Barn A", "All goats".
 *
 * A stage already says the sex for every stage except Kid, so sex is only
 * spelled out when it adds something: with no stage, or alongside Kid.
 */
export function batchGroupLabel(filters: BatchGroupFilters): string {
  const { sex, stage, barnName } = filters;
  const parts: string[] = [];

  if (stage === "Kid" && sex) {
    parts.push(sex === "female" ? "Female kids" : "Male kids");
  } else if (stage) {
    parts.push(STAGE_PLURALS[stage]);
  } else if (sex) {
    parts.push(SEX_PLURALS[sex]);
  }

  if (barnName) parts.push(barnName);

  return parts.length > 0 ? parts.join(" · ") : "All goats";
}

/**
 * The label for what was actually targeted: the group label alone when every
 * matching goat is included, or "Does (56 of 58)" when some were left out.
 */
export function batchLabel(
  filters: BatchGroupFilters,
  includedCount: number,
  matchedCount: number,
): string {
  const group = batchGroupLabel(filters);
  return includedCount < matchedCount
    ? `${group} (${includedCount} of ${matchedCount})`
    : group;
}
