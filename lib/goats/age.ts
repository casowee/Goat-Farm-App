// UPD-009 — compact age label for the goats list's Age column.
// Pure, no React / no Supabase.
//
// The age *calculation* is not re-implemented here: callers derive whole months
// once with `ageInMonths()` from `lib/goats/stage.ts` (the single source of
// truth, also used by stage derivation) and pass the result in. This module
// only turns a month count into a label.
//
// Format (owner-confirmed default, UPD-009 §15):
//   - under a year   → "5 months" / "1 month"
//   - a year or more → "1y 4m", or "2y" when the goat is an exact number of years

export function formatAge(months: number): string {
  const total = Math.max(0, Math.round(months));

  if (total < 12) {
    return `${total} month${total === 1 ? "" : "s"}`;
  }

  const years = Math.floor(total / 12);
  const remainingMonths = total % 12;

  return remainingMonths === 0 ? `${years}y` : `${years}y ${remainingMonths}m`;
}
