import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PedigreeView } from "@/components/goats/pedigree-view";
import { buildPedigree, type PedigreeGoatRow } from "@/lib/goats/pedigree";
import { formatBreed } from "@/lib/goats/breeds";
import { listHerdGoats } from "@/lib/goats/queries";

/**
 * Spec 17.3 (§5D) — the Lineage tab's panel.
 *
 * The pedigree walk needs the whole herd keyed by id, so this is the page's one
 * full-herd read. It is 17.2's `cache()`d `listHerdGoats()`, shared with the
 * header's action cluster and the Breeding tab — one query, three consumers.
 */
export async function GoatLineageTabSection({ goatId }: { goatId: number }) {
  const allGoats = await listHerdGoats();

  const goatsById = new Map<number, PedigreeGoatRow>(
    allGoats.map((g) => [g.id, g]),
  );
  const breedByGoatId = new Map<number, string>(
    allGoats
      .filter((g) => (g.breed_composition ?? []).length > 0)
      .map((g) => [g.id, formatBreed(g.breed_composition)]),
  );
  const pedigree = buildPedigree(goatId, goatsById);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-copy-secondary">
          Family tree
        </CardTitle>
      </CardHeader>
      <CardContent>
        <PedigreeView node={pedigree} breedByGoatId={breedByGoatId} />
        <p className="mt-4 text-xs text-copy-muted">
          Showing up to 4 generations. Edit this goat to set or change its sire
          and dam.
        </p>
      </CardContent>
    </Card>
  );
}
