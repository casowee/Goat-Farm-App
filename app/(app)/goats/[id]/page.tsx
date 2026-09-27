import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PawPrint } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { GoatStageBadge } from "@/components/goats/goat-stage-badge";
import { TempTagBadge } from "@/components/goats/temp-tag-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ageInMonths } from "@/lib/goats/stage";
import { formatBreed } from "@/lib/goats/breeds";
import { SkeletonCard } from "@/components/skeletons/skeleton-card";
import { SkeletonTabPanel } from "@/components/skeletons/skeleton-tabs";
import { SkeletonGoatHeaderActions } from "@/components/skeletons/skeleton-goat-header";
import { GoatHeaderActions } from "@/components/goats/sections/goat-header-actions";
import { GoatBarnMovesSection } from "@/components/goats/sections/goat-barn-moves-section";
import { GoatHealthTabSection } from "@/components/goats/sections/goat-health-tab-section";
import { GoatWeightTabSection } from "@/components/goats/sections/goat-weight-tab-section";
import { GoatBreedingTabSection } from "@/components/goats/sections/goat-breeding-tab-section";
import { GoatLineageTabSection } from "@/components/goats/sections/goat-lineage-tab-section";

// Spec 17.2 (§5A) — the columns this page renders plus the ones the edit
// dialog needs, instead of `select('*')`. `breed`, `photo_url`, `created_at`,
// `updated_at` and `owner_id` were being fetched and thrown away.
// Written as one literal, not concatenated: the Supabase client infers the row
// type from the literal, so splitting it across `+` would erase the generated
// types for this query.
const GOAT_DETAIL_COLUMNS =
  "id, tag, name, date_of_birth, sex, reproductive_state, origin, purchase_date, is_temp_tag, barn_id, sire_id, sire_name, dam_id, dam_name, status, notes, barn:barns(id, name), breed_composition:goat_breed_composition(breed, pct)";

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

/**
 * Spec 17.3 (§5D) — the goat profile, with the header ahead of everything else.
 *
 * **This page awaits exactly one query: the goat row.** That row is what the page
 * cannot exist without (a missing one is a 404), and it is enough to draw the
 * whole header — tag, name, age via `formatAge()`, stage badge, status, barn,
 * breed, origin, notes. So the owner sees the goat they tapped almost at once.
 *
 * Everything else streams behind its own `<Suspense>`: the header's action
 * buttons (they need the whole herd for the parent pickers), the barn move
 * history, and each of the four tab panels. The `TabsList` is static markup and
 * renders with the header, so the tabs are visible and tappable while their
 * contents are still arriving.
 *
 * No waterfall: the sections are siblings, so React renders them in one pass and
 * their queries all start together. They read 17.2's `cache()`d helpers, so the
 * herd list shared by the action cluster, the Lineage tab and the Breeding tab is
 * fetched once (§5C's rules, applied here per §5D).
 */
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
    .select(GOAT_DETAIL_COLUMNS)
    .eq("id", goatId)
    .maybeSingle();

  if (!goat) {
    notFound();
  }

  const label = goat.name ?? goat.tag;
  const breedComposition = goat.breed_composition ?? [];

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
          {/*
            §5D — the four action controls need the whole herd (parent pickers),
            the barn list and the cause-of-death presets, so they stream behind
            the header text rather than holding it back.
          */}
          <Suspense
            fallback={<SkeletonGoatHeaderActions label="Loading actions…" />}
          >
            <GoatHeaderActions
              goat={{ ...goat, breed_composition: breedComposition }}
              goatLabel={label}
              backHref={backHref}
            />
          </Suspense>
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
            <p className="text-sm text-copy-primary">{goat.barn?.name ?? "—"}</p>
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

      <Suspense
        fallback={
          <SkeletonCard
            contentHeight="h-16"
            descriptionLines={0}
            label="Loading barn move history…"
          />
        }
      >
        <GoatBarnMovesSection goatId={goat.id} />
      </Suspense>

      {/*
        The tab bar itself is static markup with no data behind it, so it paints
        with the header and stays tappable while the panels stream (§5D).
      */}
      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">Health</TabsTrigger>
          <TabsTrigger value="weight">Weight</TabsTrigger>
          <TabsTrigger value="breeding">Breeding</TabsTrigger>
          <TabsTrigger value="lineage">Lineage</TabsTrigger>
        </TabsList>
        <TabsContent value="health">
          <Suspense
            fallback={
              <SkeletonTabPanel rows={4} label="Loading health records…" />
            }
          >
            <GoatHealthTabSection goatId={goat.id} />
          </Suspense>
        </TabsContent>
        <TabsContent value="weight">
          <Suspense
            fallback={<SkeletonTabPanel rows={4} label="Loading weigh-ins…" />}
          >
            <GoatWeightTabSection goatId={goat.id} />
          </Suspense>
        </TabsContent>
        <TabsContent value="breeding">
          <Suspense
            fallback={
              <SkeletonTabPanel
                rows={3}
                withAction={false}
                label="Loading breeding history…"
              />
            }
          >
            <GoatBreedingTabSection
              goat={{
                id: goat.id,
                sex: goat.sex,
                reproductive_state: goat.reproductive_state,
                date_of_birth: goat.date_of_birth,
                status: goat.status,
                tag: goat.tag,
                name: goat.name,
              }}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="lineage">
          <Suspense
            fallback={
              <SkeletonTabPanel
                rows={3}
                withAction={false}
                label="Loading family tree…"
              />
            }
          >
            <GoatLineageTabSection goatId={goat.id} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
