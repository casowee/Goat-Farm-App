import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GoatFormDialog } from "@/components/goats/goat-form-dialog";
import { RemoveGoatDialog } from "@/components/goats/remove-goat-dialog";
import { GoatStageBadge } from "@/components/goats/goat-stage-badge";
import { TempTagBadge } from "@/components/goats/temp-tag-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ageInMonths } from "@/lib/goats/stage";
import { formatBreed } from "@/lib/goats/breeds";
import { buildPedigree, type PedigreeGoatRow } from "@/lib/goats/pedigree";
import { PedigreeView } from "@/components/goats/pedigree-view";
import { MoveBarnDialog } from "@/components/goats/move-barn-dialog";
import {
  BarnMoveHistory,
  type BarnMove,
} from "@/components/goats/barn-move-history";
import { HealthRecordFormDialog } from "@/components/health/health-record-form-dialog";
import { HealthRecordList } from "@/components/health/health-record-list";
import {
  listHealthConditionPresets,
  listHealthRecordsByGoat,
} from "@/app/(app)/health/actions";
import { listMedicineItems } from "@/app/(app)/inventory/actions";
import { WeightFormDialog } from "@/components/weight/weight-form-dialog";
import { WeightGrowthChart } from "@/components/weight/weight-growth-chart";
import { WeightHistoryList } from "@/components/weight/weight-history-list";
import { listWeightsByGoat } from "@/app/(app)/weight/actions";
import {
  GoatBreedingTab,
  loadGoatBreedingTabData,
} from "@/components/goats/goat-breeding-tab";

function formatAge(dateOfBirth: string): string {
  const months = ageInMonths(dateOfBirth);
  if (months < 12) {
    return `${months} month${months === 1 ? "" : "s"} old`;
  }
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  const yearsLabel = `${years} year${years === 1 ? "" : "s"}`;
  return remainingMonths === 0
    ? `${yearsLabel} old`
    : `${yearsLabel}, ${remainingMonths} month${remainingMonths === 1 ? "" : "s"} old`;
}

export default async function GoatDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  // UPD-008 — when the owner opened this profile from the "possible duplicates"
  // view, send them back there (not to the full list) from both the "Back to
  // Goats" button and after a removal.
  const backHref = from === "duplicates" ? "/goats?view=duplicates" : "/goats";
  const backLabel = from === "duplicates" ? "Back to duplicates" : "Back to Goats";
  const goatId = Number(id);

  if (!Number.isInteger(goatId)) {
    notFound();
  }

  const supabase = await createClient();

  // RLS scopes this to the signed-in owner's goats only; a missing row here
  // means either the goat doesn't exist or it isn't this owner's.
  const { data: goat } = await supabase
    .from("goats")
    .select(
      "*, barn:barns(id, name), breed_composition:goat_breed_composition(breed, pct)",
    )
    .eq("id", goatId)
    .maybeSingle();

  if (!goat) {
    notFound();
  }

  const { data: barns } = await supabase
    .from("barns")
    .select("id, name")
    .order("name");

  // All the owner's goats — for the sire / dam pickers and the pedigree walk.
  const { data: allGoats } = await supabase
    .from("goats")
    .select(
      "id, tag, name, sex, status, is_temp_tag, sire_id, dam_id, sire_name, dam_name, breed_composition:goat_breed_composition(breed, pct)",
    )
    .order("tag");

  // UPD-010 — lifetime "Total kids" for a doe: every kid ever linked to her via
  // dam_id, regardless of tag status (temp / promoted) or life status
  // (active / sold / deceased / stolen). A direct RLS-scoped count — no herd fetch.
  const { count: totalKids } =
    goat.sex === "female"
      ? await supabase
          .from("goats")
          .select("id", { count: "exact", head: true })
          .eq("dam_id", goatId)
      : { count: null };

  const goatsById = new Map<number, PedigreeGoatRow>(
    (allGoats ?? []).map((g) => [g.id, g]),
  );
  const breedByGoatId = new Map<number, string>(
    (allGoats ?? [])
      .filter((g) => (g.breed_composition ?? []).length > 0)
      .map((g) => [g.id, formatBreed(g.breed_composition)]),
  );
  const pedigree = buildPedigree(goat.id, goatsById);

  const { data: barnMoves } = await supabase
    .from("goat_barn_moves")
    .select(
      "id, moved_on, note, from_barn:barns!goat_barn_moves_from_barn_id_fkey(name), to_barn:barns!goat_barn_moves_to_barn_id_fkey(name)",
    )
    .eq("goat_id", goatId)
    .order("moved_on", { ascending: false })
    .order("id", { ascending: false });

  const healthRecords = await listHealthRecordsByGoat(goatId);
  const healthPresets = await listHealthConditionPresets();
  const medicines = await listMedicineItems();
  const weights = await listWeightsByGoat(goatId);

  // UPD-012 / Feature 09 integration — real content for the Breeding tab,
  // assembled from the Breeding page's and Doe Performance tab's own pieces.
  const breedingTabData = await loadGoatBreedingTabData(
    {
      id: goat.id,
      sex: goat.sex,
      reproductive_state: goat.reproductive_state,
      date_of_birth: goat.date_of_birth,
      status: goat.status,
      tag: goat.tag,
      name: goat.name,
    },
    healthRecords,
  );

  const parentGoats = (allGoats ?? []).map((g) => ({
    id: g.id,
    tag: g.tag,
    name: g.name,
    sex: g.sex,
    status: g.status,
    is_temp_tag: g.is_temp_tag,
    composition: g.breed_composition ?? [],
  }));

  const label = goat.name ?? goat.tag;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href={backHref} />}
      >
        <ArrowLeft />
        {backLabel}
      </Button>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-subtle text-copy-muted">
              <PawPrint className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{label}</CardTitle>
                {goat.is_temp_tag && <TempTagBadge />}
              </div>
              <p className="text-sm text-copy-muted">
                {goat.name ? `Tag ${goat.tag}` : "No name on file"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <GoatStageBadge
                  sex={goat.sex}
                  reproductiveState={goat.reproductive_state}
                  dateOfBirth={goat.date_of_birth}
                />
                <span className="text-sm text-copy-secondary capitalize">
                  {goat.status}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap justify-end gap-2">
              <GoatFormDialog
                goat={goat}
                breedComposition={goat.breed_composition ?? []}
                barns={barns ?? []}
                goats={parentGoats}
                triggerLabel="Edit"
                triggerVariant="outline"
              />
              {goat.sex === "female" && (
                <GoatFormDialog
                  newbornDam={{ id: goat.id, tag: goat.tag }}
                  breedComposition={[]}
                  barns={barns ?? []}
                  goats={parentGoats}
                  triggerLabel="Add newborn kid"
                  triggerIcon
                  triggerVariant="outline"
                />
              )}
              <MoveBarnDialog
                goatId={goat.id}
                currentBarnId={goat.barn_id}
                barns={barns ?? []}
              />
              <RemoveGoatDialog
                goatId={goat.id}
                goatLabel={label}
                causePresets={healthPresets}
                returnTo={backHref}
              />
            </div>
            {goat.sex === "female" && (
              <p className="text-xs text-copy-muted">
                Total kids:{" "}
                <span className="text-copy-secondary">{totalKids ?? 0}</span>{" "}
                <span className="text-copy-muted">
                  (every kid ever born to her)
                </span>
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-copy-muted">Breed</p>
            <p className="text-sm text-copy-primary">
              {formatBreed(goat.breed_composition)}
            </p>
          </div>
          <div>
            <p className="text-xs text-copy-muted">Sex</p>
            <p className="text-sm text-copy-primary capitalize">{goat.sex}</p>
          </div>
          <div>
            <p className="text-xs text-copy-muted">Date of birth</p>
            <p className="text-sm text-copy-primary">
              {goat.date_of_birth} ({formatAge(goat.date_of_birth)})
            </p>
          </div>
          <div>
            <p className="text-xs text-copy-muted">Reproductive state</p>
            <p className="text-sm text-copy-primary capitalize">
              {goat.reproductive_state}
            </p>
          </div>
          <div>
            <p className="text-xs text-copy-muted">Barn</p>
            <p className="text-sm text-copy-primary">
              {goat.barn?.name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-copy-muted">Origin</p>
            <p className="text-sm text-copy-primary">
              {goat.origin === "purchased" ? "Purchased" : "Born on the farm"}
              {goat.origin === "purchased" && goat.purchase_date
                ? ` (${goat.purchase_date})`
                : ""}
            </p>
          </div>
          {goat.notes && (
            <div className="sm:col-span-2 lg:col-span-4">
              <p className="text-xs text-copy-muted">Notes</p>
              <p className="text-sm text-copy-primary">{goat.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-copy-secondary">
            Barn move history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BarnMoveHistory moves={(barnMoves ?? []) as BarnMove[]} />
        </CardContent>
      </Card>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
          <TabsTrigger value="breeding">Breeding</TabsTrigger>
          <TabsTrigger value="lineage">Lineage</TabsTrigger>
        </TabsList>
        <TabsContent value="health">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm text-copy-secondary">
                Health records
              </CardTitle>
              <HealthRecordFormDialog
                goatId={goat.id}
                presets={healthPresets}
                medicines={medicines}
                triggerLabel="Add health record"
                triggerIcon
              />
            </CardHeader>
            <CardContent>
              <HealthRecordList
                goatId={goat.id}
                records={healthRecords}
                presets={healthPresets}
                medicines={medicines}
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="weight">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm text-copy-secondary">Weight</CardTitle>
              <WeightFormDialog
                goatId={goat.id}
                triggerLabel="Add weight"
                triggerIcon
              />
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {weights.length > 0 ? (
                <WeightGrowthChart
                  points={weights.map((w) => ({
                    weighed_on: w.weighed_on,
                    weight_kg: w.weight_kg,
                  }))}
                />
              ) : null}
              <WeightHistoryList goatId={goat.id} weights={weights} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="breeding">
          <GoatBreedingTab data={breedingTabData} />
        </TabsContent>
        <TabsContent value="lineage">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm text-copy-secondary">
                Family tree
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PedigreeView node={pedigree} breedByGoatId={breedByGoatId} />
              <p className="mt-4 text-xs text-copy-muted">
                Showing up to 4 generations. Edit this goat to set or change its
                sire and dam.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
