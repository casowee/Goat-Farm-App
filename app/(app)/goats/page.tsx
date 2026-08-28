import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoatFormDialog } from "@/components/goats/goat-form-dialog";
import { DeleteGoatDialog } from "@/components/goats/delete-goat-dialog";
import { GoatStageBadge } from "@/components/goats/goat-stage-badge";
import { BarnFilter } from "@/components/goats/barn-filter";
import { formatBreed } from "@/lib/goats/breeds";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function GoatsPage({
  searchParams,
}: {
  searchParams: Promise<{ barn?: string }>;
}) {
  const { barn } = await searchParams;
  const supabase = await createClient();

  // RLS scopes this to the signed-in owner's barns only.
  const { data: barns } = await supabase
    .from("barns")
    .select("id, name")
    .order("name");

  if (!barns || barns.length === 0) {
    return (
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <h1 className="text-xl font-semibold text-copy-primary">Goats</h1>
        <Card>
          <CardHeader>
            <CardTitle>Create a barn before registering a goat</CardTitle>
            <CardDescription>
              Every goat is assigned to a barn at registration. Add a barn
              first, then come back here to register your goats.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button nativeButton={false} render={<Link href="/barns" />}>
              Go to Barns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unfiltered list of the owner's goats for the sire / dam pickers — must not be
  // narrowed by the barn filter below. Includes each goat's breed composition so
  // the form can compute a born-here goat's breed from its parents (6c).
  const { data: allGoats } = await supabase
    .from("goats")
    .select("id, tag, name, sex, breed_composition:goat_breed_composition(breed, pct)")
    .order("tag");
  const parentGoats = (allGoats ?? []).map((g) => ({
    id: g.id,
    tag: g.tag,
    name: g.name,
    sex: g.sex,
    composition: g.breed_composition ?? [],
  }));

  let query = supabase
    .from("goats")
    .select(
      "*, barn:barns(id, name), breed_composition:goat_breed_composition(breed, pct)",
    )
    .order("created_at", { ascending: false });

  const barnId = barn ? Number(barn) : undefined;
  if (barnId !== undefined && Number.isInteger(barnId)) {
    query = query.eq("barn_id", barnId);
  }

  const { data: goats } = await query;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-copy-primary">Goats</h1>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <BarnFilter barns={barns} value={barn ?? "all"} />
          <GoatFormDialog
            barns={barns}
            goats={parentGoats}
            triggerLabel="Add Goat"
            triggerIcon
          />
        </div>
      </div>

      {!goats || goats.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No goats yet</CardTitle>
            <CardDescription>
              Register your first goat to start tracking its profile.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Tag</TableHead>
                  <TableHead>Breed</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Barn</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {goats.map((goat) => (
                  <TableRow key={goat.id}>
                    <TableCell>
                      <Link
                        href={`/goats/${goat.id}`}
                        className="font-medium text-copy-primary hover:text-brand"
                      >
                        {goat.name ?? goat.tag}
                      </Link>
                      {goat.name && (
                        <p className="text-xs text-copy-muted">{goat.tag}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {formatBreed(goat.breed_composition)}
                    </TableCell>
                    <TableCell className="text-copy-secondary capitalize">
                      {goat.sex}
                    </TableCell>
                    <TableCell>
                      <GoatStageBadge
                        sex={goat.sex}
                        reproductiveState={goat.reproductive_state}
                        dateOfBirth={goat.date_of_birth}
                      />
                    </TableCell>
                    <TableCell className="text-copy-secondary capitalize">
                      {goat.status}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {goat.barn?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-copy-secondary">
                      {goat.origin === "purchased" ? "Purchased" : "Born here"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <GoatFormDialog
                          goat={goat}
                          breedComposition={goat.breed_composition ?? []}
                          barns={barns}
                          goats={parentGoats}
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          triggerSize="sm"
                        />
                        <DeleteGoatDialog
                          goatId={goat.id}
                          goatLabel={goat.name ?? goat.tag}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:hidden">
            {goats.map((goat) => (
              <Card key={goat.id}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>
                      <Link
                        href={`/goats/${goat.id}`}
                        className="hover:text-brand"
                      >
                        {goat.name ?? goat.tag}
                      </Link>
                    </CardTitle>
                    <GoatStageBadge
                      sex={goat.sex}
                      reproductiveState={goat.reproductive_state}
                      dateOfBirth={goat.date_of_birth}
                    />
                  </div>
                  <CardDescription>
                    {goat.name ? `Tag ${goat.tag} · ` : ""}
                    {goat.breed_composition && goat.breed_composition.length > 0
                      ? formatBreed(goat.breed_composition)
                      : "Unknown breed"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-copy-secondary capitalize">
                    {goat.sex} · {goat.status} · {goat.barn?.name ?? "No barn"}
                  </p>
                  <p className="text-sm text-copy-secondary">
                    {goat.origin === "purchased" ? "Purchased" : "Born here"}
                  </p>
                  <div className="flex gap-2">
                    <GoatFormDialog
                      goat={goat}
                      breedComposition={goat.breed_composition ?? []}
                      barns={barns}
                      goats={parentGoats}
                      triggerLabel="Edit"
                      triggerVariant="outline"
                      triggerSize="sm"
                    />
                    <DeleteGoatDialog
                      goatId={goat.id}
                      goatLabel={goat.name ?? goat.tag}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
