// Pure ancestry walk for the family tree (feature 06). No React, no Supabase —
// callers pass an in-memory map of goats so this stays portable and reusable by
// spec 09's inbreeding check (invariant 6) and a future mobile / DB function.

// One place to tune how many generations the pedigree view and 09's inbreeding
// check look back. Generation 0 is the goat itself; PEDIGREE_MAX_GENERATIONS is
// how many rows of ancestors above it are walked.
export const PEDIGREE_MAX_GENERATIONS = 4;

// The minimal shape the walk needs. `goats` Row satisfies this structurally, so
// callers can pass rows straight from Supabase without mapping.
export interface PedigreeGoatRow {
  id: number;
  tag: string;
  name: string | null;
  sire_id: number | null;
  dam_id: number | null;
  sire_name: string | null;
  dam_name: string | null;
}

export type PedigreeNodeKind = "goat" | "external" | "unknown";

export interface PedigreeNode {
  kind: PedigreeNodeKind;
  goatId?: number; // set when kind === "goat"
  label: string; // tag (fallback to name) for goats; the recorded name for external; "Unknown" otherwise
  sire?: PedigreeNode;
  dam?: PedigreeNode;
}

function labelForGoat(g: PedigreeGoatRow): string {
  if (g.tag && g.tag.trim()) return g.tag.trim();
  if (g.name && g.name.trim()) return g.name.trim();
  return `Goat #${g.id}`;
}

/**
 * Build an ancestry tree rooted at `rootGoatId`, walking `sire_id` / `dam_id`
 * up to `maxGenerations`. Cycle-safe: a goat that reappears on its own ancestry
 * path becomes a leaf instead of recursing forever.
 */
export function buildPedigree(
  rootGoatId: number,
  goatsById: Map<number, PedigreeGoatRow>,
  maxGenerations: number = PEDIGREE_MAX_GENERATIONS,
): PedigreeNode {
  const root = goatsById.get(rootGoatId);
  if (!root) {
    return { kind: "unknown", label: "Unknown" };
  }
  return goatNode(root, goatsById, maxGenerations, new Set<number>());
}

function goatNode(
  g: PedigreeGoatRow,
  goatsById: Map<number, PedigreeGoatRow>,
  generationsRemaining: number,
  pathIds: Set<number>,
): PedigreeNode {
  const node: PedigreeNode = { kind: "goat", goatId: g.id, label: labelForGoat(g) };

  // Stop if we've reached the depth limit or hit a cycle (bad data).
  if (generationsRemaining <= 0 || pathIds.has(g.id)) {
    return node;
  }

  const nextPath = new Set(pathIds).add(g.id);
  node.sire = parentNode(g.sire_id, g.sire_name, goatsById, generationsRemaining - 1, nextPath);
  node.dam = parentNode(g.dam_id, g.dam_name, goatsById, generationsRemaining - 1, nextPath);
  return node;
}

function parentNode(
  parentId: number | null,
  parentName: string | null,
  goatsById: Map<number, PedigreeGoatRow>,
  generationsRemaining: number,
  pathIds: Set<number>,
): PedigreeNode {
  if (parentId != null && !pathIds.has(parentId)) {
    const parent = goatsById.get(parentId);
    if (parent) {
      return goatNode(parent, goatsById, generationsRemaining, pathIds);
    }
  }
  // An id recorded but no longer reachable (deleted / not the owner's) falls back
  // to the recorded name if there is one, otherwise "Unknown".
  if (parentName && parentName.trim()) {
    return { kind: "external", label: parentName.trim() };
  }
  return { kind: "unknown", label: "Unknown" };
}

/**
 * Flat set of ancestor goat ids (in-system references), walked the same way as
 * buildPedigree. Spec 09 intersects two of these sets to find shared ancestors.
 * Does not include `goatId` itself. Cycle-safe.
 */
export function collectAncestorIds(
  goatId: number,
  goatsById: Map<number, PedigreeGoatRow>,
  maxGenerations: number = PEDIGREE_MAX_GENERATIONS,
): Set<number> {
  const result = new Set<number>();

  function walk(id: number, generationsRemaining: number, pathIds: Set<number>) {
    if (generationsRemaining <= 0) return;
    const g = goatsById.get(id);
    if (!g) return;
    const nextPath = new Set(pathIds).add(id);
    for (const parentId of [g.sire_id, g.dam_id]) {
      if (parentId == null || nextPath.has(parentId)) continue;
      result.add(parentId);
      walk(parentId, generationsRemaining - 1, nextPath);
    }
  }

  walk(goatId, maxGenerations, new Set<number>());
  return result;
}
