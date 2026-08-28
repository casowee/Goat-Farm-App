import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GoatFormDialog } from "@/components/goats/goat-form-dialog";
import { DeleteGoatDialog } from "@/components/goats/delete-goat-dialog";
import { GoatStageBadge } from "@/components/goats/goat-stage-badge";
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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
      "id, tag, name, sex, sire_id, dam_id, sire_name, dam_name, breed_composition:goat_breed_composition(breed, pct)",
    )
    .order("tag");

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

  const parentGoats = (allGoats ?? []).map((g) => ({
    id: g.id,
    tag: g.tag,
    name: g.name,
    sex: g.sex,
    composition: g.breed_composition ?? [],
  }));

  const label = goat.name ?? goat.tag;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        render={<Link href="/goats" />}
      >
        <ArrowLeft />
        Back to Goats
      </Button>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-subtle text-copy-muted">
              <PawPrint className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-lg">{label}</CardTitle>
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
          <div className="flex flex-wrap gap-2">
            <GoatFormDialog
              goat={goat}
              breedComposition={goat.breed_composition ?? []}
              barns={barns ?? []}
              goats={parentGoats}
              triggerLabel="Edit"
              triggerVariant="outline"
            />
            <MoveBarnDialog
              goatId={goat.id}
              currentBarnId={goat.barn_id}
              barns={barns ?? []}
            />
            <DeleteGoatDialog goatId={goat.id} goatLabel={label} />
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
          <ComingSoon label="Health history" />
        </TabsContent>
        <TabsContent value="weight">
          <ComingSoon label="Weight history" />
        </TabsContent>
        <TabsContent value="breeding">
          <ComingSoon label="Breeding history" />
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

function ComingSoon({ label }: { label: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-copy-muted">
          {label} — coming soon
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
