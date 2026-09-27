import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GoatFormDialog } from "@/components/goats/goat-form-dialog";
import { GoatsList, type GoatListRow } from "@/components/goats/goats-list";
import { listHealthConditionPresets } from "@/lib/health/queries";
import { listBarns } from "@/lib/goats/queries";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Spec 17.2 (§5A) — everything the list renders (tag, name, age, stage, breed,
// barn, status, temp-tag badge, duplicate detection) plus the columns the inline
// edit dialog needs, instead of `select('*')`. `breed`, `photo_url`,
// `created_at`, `updated_at` and `owner_id` were fetched and never used —
// `created_at` only ordered the query, which happens server-side.
// One literal, not concatenated — see the note on the goat-detail page's copy.
const GOAT_LIST_COLUMNS =
  "id, tag, name, date_of_birth, sex, reproductive_state, origin, purchase_date, is_temp_tag, barn_id, sire_id, sire_name, dam_id, dam_name, status, notes, barn:barns(id, name), breed_composition:goat_breed_composition(breed, pct)";

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

  // RLS scopes this to the signed-in owner's barns only. This one stays
  // sequential on purpose: a farm with no barns can't register goats at all,
  // so the page returns early and the goat queries below never need to run.
  const barns = await listBarns();

  if (barns.length === 0) {
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

  // Spec 17.2 (§5B, §5E) — these two are independent, so they run together
  // instead of one after the other.
  //
  // The sire/dam picker list used to be a THIRD query over the same table: an
  // `id, tag, name, sex, status, is_temp_tag` read of every goat, which the
  // full list below already returns. It's now derived from that list in
  // memory, removing one whole full-herd round-trip per page view.
  //
  // UPD-008 (8a) — the full owner-scoped goat list; search / sex / stage / barn
  // filtering all happen client-side over this array (small farm scale, no new
  // query complexity — see the spec's Section 6 performance note). That's also
  // why this list is NOT paginated: the search covers the whole herd.
  //
  // UPD-008 (8c) — presets for the removal dialog's "Cause of death" combobox
  // (filtered to illness + injury inside the combobox).
  const [{ data: goats }, causePresets] = await Promise.all([
    supabase
      .from("goats")
      .select(GOAT_LIST_COLUMNS)
      .order("created_at", { ascending: false }),
    listHealthConditionPresets(),
  ]);

  // Sorted by tag, the order the removed picker query used — the list above is
  // newest-first, and the pickers must not silently reorder.
  const parentGoats = (goats ?? [])
    .map((g) => ({
      id: g.id,
      tag: g.tag,
      name: g.name,
      sex: g.sex,
      status: g.status,
      is_temp_tag: g.is_temp_tag,
      composition: g.breed_composition ?? [],
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

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
