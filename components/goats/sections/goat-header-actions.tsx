import {
  GoatFormDialog,
  type GoatFormGoat,
} from "@/components/goats/goat-form-dialog";
import { RemoveGoatDialog } from "@/components/goats/remove-goat-dialog";
import { MoveBarnDialog } from "@/components/goats/move-barn-dialog";
import { listBarns, listHerdGoats } from "@/lib/goats/queries";
import { listHealthConditionPresets } from "@/lib/health/queries";

/**
 * Spec 17.3 (§5D) — the goat header's action cluster, streamed separately from
 * the header itself.
 *
 * The header's *text* (tag, name, age, status, barn) comes from the goat row, so
 * it renders the moment that row lands. These four controls can't: Edit and
 * "Add newborn kid" need every goat for the sire/dam pickers and every barn,
 * Move barn needs the barn list, and Remove needs the cause-of-death presets.
 * Holding the whole header back for them would defeat §5D, so they stream on
 * their own behind a button-shaped skeleton.
 *
 * Every reader here is one of 17.2's `cache()`d ones, so the herd list this pulls
 * is the same one the Lineage and Breeding tabs use — one query for all three.
 */
export async function GoatHeaderActions({
  goat,
  goatLabel,
  backHref,
}: {
  /** The goat row the page already loaded, plus its breed composition. */
  goat: GoatFormGoat & { breed_composition: { breed: string; pct: number }[] };
  goatLabel: string;
  backHref: string;
}) {
  const [barns, allGoats, healthPresets] = await Promise.all([
    listBarns(),
    listHerdGoats(),
    listHealthConditionPresets(),
  ]);

  const parentGoats = allGoats.map((g) => ({
    id: g.id,
    tag: g.tag,
    name: g.name,
    sex: g.sex,
    status: g.status,
    is_temp_tag: g.is_temp_tag,
    composition: g.breed_composition ?? [],
  }));

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <GoatFormDialog
          goat={goat}
          breedComposition={goat.breed_composition}
          barns={barns}
          goats={parentGoats}
          triggerLabel="Edit"
          triggerVariant="outline"
        />
        {goat.sex === "female" && (
          <GoatFormDialog
            newbornDam={{ id: goat.id, tag: goat.tag }}
            breedComposition={[]}
            barns={barns}
            goats={parentGoats}
            triggerLabel="Add newborn kid"
            triggerIcon
            triggerVariant="outline"
          />
        )}
        <MoveBarnDialog
          goatId={goat.id}
          currentBarnId={goat.barn_id}
          barns={barns}
        />
        <RemoveGoatDialog
          goatId={goat.id}
          goatLabel={goatLabel}
          causePresets={healthPresets}
          returnTo={backHref}
        />
      </div>
      {goat.sex === "female" && (
        <p className="text-xs text-copy-muted">
          Kidding history is in the{" "}
          <span className="text-copy-secondary">Breeding</span> tab below.
        </p>
      )}
    </div>
  );
}
