// Spec 17.2 (§5E) — one page size for every long history list, so the
// goat-detail tabs all behave the same way and a future list can opt in
// without inventing its own number.
//
// Pure, no React / no Supabase: the server queries use it to build their
// `.range()` bounds, and the client "Show more" control uses it to decide
// whether another page can exist.

/** How many records a history list loads at a time (spec 17.2 §5E). */
export const HISTORY_PAGE_SIZE = 20;

/**
 * Inclusive `.range(from, to)` bounds for the page starting at `offset`.
 *
 * PostgREST's range is inclusive on both ends, so a 20-row page starting at
 * row 0 is `range(0, 19)` — not `range(0, 20)`, which would quietly return 21
 * rows and make the "Show more" arithmetic drift by one page.
 */
export function pageRange(
  offset: number,
  pageSize: number = HISTORY_PAGE_SIZE,
): { from: number; to: number } {
  const from = Math.max(0, Math.trunc(offset));
  return { from, to: from + pageSize - 1 };
}

/** Whether more records remain after `loaded` of `total` have been shown. */
export function hasMoreRows(loaded: number, total: number): boolean {
  return loaded < total;
}
