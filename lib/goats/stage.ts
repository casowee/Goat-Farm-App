export type GoatSex = "male" | "female";
export type ReproductiveState = "intact" | "castrated";
export type GoatStage = "Kid" | "Doeling" | "Buckling" | "Doe" | "Buck" | "Wether";

// Confirmed with the owner (2026-08-26): general-purpose thresholds, not breed-specific.
// Kept in one place so they stay easy to retune per breed later.
export const STAGE_THRESHOLDS_MONTHS = {
  kidMax: 6,
  youngStockMax: 12,
} as const;

export function ageInMonths(dateOfBirth: string | Date, now: Date = new Date()): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;

  let months =
    (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());

  if (now.getDate() < dob.getDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

export function deriveGoatStage(input: {
  sex: GoatSex;
  reproductiveState: ReproductiveState;
  dateOfBirth: string | Date;
  now?: Date;
}): GoatStage {
  const { sex, reproductiveState, dateOfBirth, now } = input;

  if (sex === "male" && reproductiveState === "castrated") {
    return "Wether";
  }

  const age = ageInMonths(dateOfBirth, now);

  if (age < STAGE_THRESHOLDS_MONTHS.kidMax) {
    return "Kid";
  }

  if (age < STAGE_THRESHOLDS_MONTHS.youngStockMax) {
    return sex === "female" ? "Doeling" : "Buckling";
  }

  return sex === "female" ? "Doe" : "Buck";
}
