import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoatFormDialog } from "@/components/goats/goat-form-dialog";
import { GoatsList, type GoatListRow } from "@/components/goats/goats-list";
import { listHealthConditionPresets } from "@/app/(app)/health/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function GoatsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  // UPD-008 (8b) — the "possible duplicates" view is a real URL state
  // (`/goats?view=duplicates`) so it survives navigating into a goat's profile
  // and back, and so the profile's "Back to Goats" button can return to it.
  const { view } = await searchParams;
  const showDuplicates = view === "duplicates";

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

  // Unfiltered list of the owner's goats for the sire / dam pickers. Includes
  // each goat's breed composition so the form can compute a born-here goat's
  // breed from its parents (6c).
  const { data: allGoats } = await supabase
    .from("goats")
    .select(
      "id, tag, name, sex, status, is_temp_tag, breed_composition:goat_breed_composition(breed, pct)",
    )
    .order("tag");
  const parentGoats = (allGoats ?? []).map((g) => ({
    id: g.id,
    tag: g.tag,
    name: g.name,
    sex: g.sex,
    status: g.status,
    is_temp_tag: g.is_temp_tag,
    composition: g.breed_composition ?? [],
  }));

  // UPD-008 (8a) — the full owner-scoped goat list; search / sex / stage / barn
  // filtering all happen client-side over this array (small farm scale, no new
  // query complexity — see the spec's Section 6 performance note).
  const { data: goats } = await supabase
    .from("goats")
    .select(
      "*, barn:barns(id, name), breed_composition:goat_breed_composition(breed, pct)",
    )
    .order("created_at", { ascending: false });

  // UPD-008 (8c) — presets for the removal dialog's "Cause of death" combobox
  // (filtered to illness + injury inside the combobox).
  const causePresets = await listHealthConditionPresets();

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-copy-primary">Goats</h1>
        <GoatFormDialog
          barns={barns}
          goats={parentGoats}
          triggerLabel="Add Goat"
          triggerIcon
        />
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
        <GoatsList
          goats={goats as unknown as GoatListRow[]}
          barns={barns}
          parentGoats={parentGoats}
          causePresets={causePresets}
          showDuplicates={showDuplicates}
        />
      )}
    </div>
  );
}
