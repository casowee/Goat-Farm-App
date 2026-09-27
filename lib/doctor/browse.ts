// Feature 15 — assembling the Doctor browse page's list.
//
// Pure: takes the static reference content, the owner's presets and the
// per-condition record counts, and returns exactly what the page renders. No
// React and no Supabase, so the shape is testable and the page component stays
// composition only (code-standards.md: components hold no business logic).

import {
  DOCTOR_CATEGORIES,
  DOCTOR_CATEGORY_BLURBS,
  DOCTOR_CATEGORY_LABELS,
  DOCTOR_CONDITIONS,
  conditionSlug,
  type DoctorCategory,
} from "@/lib/doctor/conditions";

/** One line in the browse list. */
export interface DoctorBrowseEntry {
  /** The exact `health_records.title` this entry matches. */
  name: string;
  slug: string;
  /** The static one-liner, or `null` for a condition with no reference entry. */
  summary: string | null;
  /** Health records the farm has logged under this name. */
  count: number;
  /** How many of those are flagged as a treatment that worked. */
  effectiveCount: number;
}

export interface DoctorBrowseGroup {
  category: DoctorCategory;
  label: string;
  blurb: string;
  entries: DoctorBrowseEntry[];
}

export interface DoctorBrowse {
  /** The static reference, grouped by category, in the order it is written. */
  groups: DoctorBrowseGroup[];
  /**
   * Conditions the farm uses that have no static entry — a name the owner added
   * through UPD-004's "+ Add new". They get a history-and-effectiveness page
   * with no guidance section, which spec 15 §2 calls expected, not a bug. They
   * are listed here so that page is actually reachable.
   */
  otherEntries: DoctorBrowseEntry[];
}

/** The health-record types the Doctor module covers, as preset `record_type`s. */
const IN_SCOPE_RECORD_TYPES: readonly string[] = [
  "illness",
  "injury",
  "vaccination",
];

/** The minimum a preset row needs to look like for this to sort it. */
export interface BrowsePreset {
  name: string;
  record_type: string;
}

export interface ConditionCount {
  count: number;
  effectiveCount: number;
}

function entryFor(
  name: string,
  summary: string | null,
  stats: Map<string, ConditionCount>,
): DoctorBrowseEntry {
  const found = stats.get(name);
  return {
    name,
    slug: conditionSlug(name),
    summary,
    count: found?.count ?? 0,
    effectiveCount: found?.effectiveCount ?? 0,
  };
}

export function buildDoctorBrowse({
  presets,
  stats,
}: {
  /** Every preset visible to the owner — seeded globals plus their own. */
  presets: BrowsePreset[];
  /** Record counts per exact title, from `listConditionHistoryStats()`. */
  stats: Map<string, ConditionCount>;
}): DoctorBrowse {
  const staticNames = new Set(DOCTOR_CONDITIONS.map((c) => c.name));

  const groups = DOCTOR_CATEGORIES.map((category) => ({
    category,
    label: DOCTOR_CATEGORY_LABELS[category],
    blurb: DOCTOR_CATEGORY_BLURBS[category],
    entries: DOCTOR_CONDITIONS.filter((c) => c.category === category).map((c) =>
      entryFor(c.name, c.summary, stats),
    ),
  }));

  // Only presets are considered here, not every title in `stats`: a preset row
  // carries the `record_type` that says whether the name is an illness, an
  // injury or a vaccination, and Doctor covers only those three. A raw title
  // has no such marker, so treatment / deworming / checkup titles would end up
  // listed as unexplained "other conditions". Every name typed through
  // "+ Add new" is saved as a preset (UPD-004), so nothing the owner adds is
  // missed by going through presets.
  // De-duplicated by name: the same name can exist both as a seeded global and
  // as an owner's own preset (the unique constraint is per owner).
  const otherNames = new Set<string>();
  for (const preset of presets) {
    if (!IN_SCOPE_RECORD_TYPES.includes(preset.record_type)) continue;
    if (staticNames.has(preset.name)) continue;
    otherNames.add(preset.name);
  }

  const otherEntries = [...otherNames]
    .map((name) => entryFor(name, null, stats))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return { groups, otherEntries };
}

/**
 * Resolve a URL slug to the condition name it stands for, checking the static
 * reference first and then the owner's own presets. Returns `null` when neither
 * knows the slug, which is a 404 rather than an empty page — a made-up URL
 * should not render as "this condition has no history".
 */
export function resolveConditionName(
  slug: string,
  presets: BrowsePreset[],
): string | null {
  const staticMatch = DOCTOR_CONDITIONS.find((c) => c.slug === slug);
  if (staticMatch) return staticMatch.name;

  const preset = presets.find(
    (p) =>
      IN_SCOPE_RECORD_TYPES.includes(p.record_type) &&
      conditionSlug(p.name) === slug,
  );
  return preset ? preset.name : null;
}
