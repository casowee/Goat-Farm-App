export const GOAT_BREEDS = [
  "Somali (Galla)",
  "Boer",
  "Savanna",
  "Kalahari",
  "Local",
] as const;
export type GoatBreed = (typeof GOAT_BREEDS)[number];

// Breed is a composition: one row per breed component of a goat, percentages
// summing to 100. Feature 06 (6b) replaced the old two-column model
// (primary + secondary + one percentage) with this list so that a born-here
// goat's breed can be averaged from its two parents — which can yield three or
// more breeds (a 50/50 cross bred to a third breed → 25/25/50).
//
// Stored in the `goat_breed_composition` child table (one row per entry).
// `goats.breed` is kept as a denormalised "primary breed" label for quick display.
export interface BreedShare {
  breed: string;
  pct: number;
}
export type BreedComposition = BreedShare[];

const PCT_EPSILON = 0.01;

export function isPurebred(c: BreedComposition): boolean {
  return c.length === 1 && c[0].pct >= 100 - PCT_EPSILON;
}

// The primary (highest-share) breed — used as the denormalised `goats.breed` label.
export function primaryBreed(c: BreedComposition): string | null {
  if (c.length === 0) return null;
  return [...c].sort((a, b) => b.pct - a.pct)[0].breed;
}

// A cross of two 100%-pure parent breeds is 50/50 under the manual "Crossed…"
// input. Parent-based averaging (composeFromParents) produces the finer grades.
export function crossOfPureBreeds(first: string, second: string): BreedComposition {
  return [
    { breed: first, pct: 50 },
    { breed: second, pct: 50 },
  ];
}

/**
 * Average two parent compositions: every breed present in either parent gets
 * (damShare + sireShare) / 2. Result rows are normalised to sum to 100.
 *
 *  [{Boer:100}] × [{Somali:100}]                 → [{Boer:50},{Somali:50}]
 *  [{Boer:100}] × [{Boer:50},{Somali:50}]        → [{Boer:75},{Somali:25}]
 *  [{Boer:50},{Somali:50}] × [{Savanna:100}]     → [{Boer:25},{Somali:25},{Savanna:50}]
 */
export function composeFromParents(
  dam: BreedComposition,
  sire: BreedComposition,
): BreedComposition {
  const shares = new Map<string, number>();
  for (const { breed, pct } of dam) {
    shares.set(breed, (shares.get(breed) ?? 0) + pct / 2);
  }
  for (const { breed, pct } of sire) {
    shares.set(breed, (shares.get(breed) ?? 0) + pct / 2);
  }
  return normalizeComposition(
    [...shares].map(([breed, pct]) => ({ breed, pct })),
  );
}

/**
 * Clean a composition: merge duplicate breeds, drop blank/zero rows, round to
 * 3 decimals, sort by descending share, and correct any rounding drift so the
 * shares sum to exactly 100.
 */
export function normalizeComposition(c: BreedComposition): BreedComposition {
  const merged = new Map<string, number>();
  for (const { breed, pct } of c) {
    const name = breed.trim();
    if (!name || !Number.isFinite(pct) || pct <= 0) continue;
    merged.set(name, (merged.get(name) ?? 0) + pct);
  }

  let rows = [...merged]
    .map(([breed, pct]) => ({ breed, pct: Math.round(pct * 1000) / 1000 }))
    .filter((row) => row.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  if (rows.length === 0) return [];

  const total = rows.reduce((sum, row) => sum + row.pct, 0);
  const drift = Math.round((100 - total) * 1000) / 1000;
  if (drift !== 0) {
    rows = rows.map((row, i) =>
      i === 0 ? { ...row, pct: Math.round((row.pct + drift) * 1000) / 1000 } : row,
    );
  }

  return rows;
}

/**
 * Validate a composition for a write. Returns an error string, or null if valid.
 */
export function validateComposition(c: BreedComposition): string | null {
  if (c.length === 0) return "Breed is required.";
  const seen = new Set<string>();
  for (const { breed, pct } of c) {
    if (!breed || !breed.trim()) return "Every breed entry needs a name.";
    if (seen.has(breed.trim())) return "The same breed is listed twice.";
    seen.add(breed.trim());
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100) {
      return "Each breed's percentage must be between 0 and 100.";
    }
  }
  const total = c.reduce((sum, row) => sum + row.pct, 0);
  if (Math.abs(total - 100) > PCT_EPSILON) {
    return "Breed percentages must add up to 100.";
  }
  return null;
}

export function formatBreed(c: BreedComposition | null | undefined): string {
  if (!c || c.length === 0) return "—";
  if (isPurebred(c)) return `${c[0].breed} (purebred)`;
  return [...c]
    .sort((a, b) => b.pct - a.pct)
    .map((row) => `${formatPct(row.pct)}% ${row.breed}`)
    .join(" × ");
}

function formatPct(pct: number): string {
  return Number.isInteger(pct)
    ? String(pct)
    : pct.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}
