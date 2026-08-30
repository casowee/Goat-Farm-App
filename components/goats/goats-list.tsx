"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronsUpDown, ChevronUp, Search } from "lucide-react";
import { GoatFormDialog } from "@/components/goats/goat-form-dialog";
import { RemoveGoatDialog } from "@/components/goats/remove-goat-dialog";
import { GoatStageBadge } from "@/components/goats/goat-stage-badge";
import { TempTagBadge } from "@/components/goats/temp-tag-badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { formatBreed, type BreedComposition } from "@/lib/goats/breeds";
import { filterGoats, type GoatStatus } from "@/lib/goats/search";
import { findDuplicateTagGroups } from "@/lib/goats/tag";
import { ageInMonths, type GoatStage } from "@/lib/goats/stage";
import { formatAge } from "@/lib/goats/age";
import type { Database } from "@/types/database.types";
import type { ParentPickerGoat } from "@/components/goats/parent-picker";
import type { HealthConditionPreset } from "@/app/(app)/health/actions";

type Goat = Database["public"]["Tables"]["goats"]["Row"];

export type GoatListRow = Goat & {
  barn: { id: number; name: string } | null;
  breed_composition: BreedComposition;
};

const STAGE_OPTIONS: GoatStage[] = [
  "Kid",
  "Doeling",
  "Buckling",
  "Doe",
  "Buck",
  "Wether",
];

const ALL = "all";

// UPD-009 — the Status filter. Defaults to "active" (the owner's working list is
// the current herd); the other statuses and "all" are explicit opt-ins that
// bring UPD-008's preserved Sold / Deceased / Stolen history back into view.
const STATUS_OPTIONS: { value: GoatStatus | typeof ALL; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "sold", label: "Sold" },
  { value: "deceased", label: "Deceased" },
  { value: "stolen", label: "Stolen" },
  { value: ALL, label: "All statuses" },
];

const DEFAULT_STATUS: GoatStatus = "active";

// UPD-009 amendment — Age-column sort. This is a SORT, not a filter: it only
// reorders the currently-visible (already-filtered) rows, hiding nothing.
//   "none"  → natural order (input order, or search relevance when searching)
//   "desc"  → oldest first  (age in months, high → low)
//   "asc"   → youngest first (age in months, low → high)
// The header toggle cycles none → desc → asc → none.
type AgeSort = "none" | "desc" | "asc";

const NEXT_AGE_SORT: Record<AgeSort, AgeSort> = {
  none: "desc",
  desc: "asc",
  asc: "none",
};

const AGE_SORT_LABEL: Record<AgeSort, string> = {
  none: "Sort by age",
  desc: "Sorted oldest to youngest — click to sort youngest to oldest",
  asc: "Sorted youngest to oldest — click to clear age sorting",
};

function AgeSortToggle({
  sort,
  onToggle,
}: {
  sort: AgeSort;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={AGE_SORT_LABEL[sort]}
      title={AGE_SORT_LABEL[sort]}
      className="inline-flex items-center gap-1 rounded-md hover:text-copy-primary"
    >
      Age
      {sort === "desc" ? (
        <ChevronDown className="h-3.5 w-3.5" />
      ) : sort === "asc" ? (
        <ChevronUp className="h-3.5 w-3.5" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
      )}
    </button>
  );
}

interface GoatsListProps {
  goats: GoatListRow[];
  barns: { id: number; name: string }[];
  parentGoats: ParentPickerGoat[];
  causePresets: HealthConditionPreset[];
  /** Driven by the `?view=duplicates` URL param (see the goats page). */
  showDuplicates: boolean;
}

export function GoatsList({
  goats,
  barns,
  parentGoats,
  causePresets,
  showDuplicates,
}: GoatsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sex, setSex] = useState<string>(ALL);
  const [stage, setStage] = useState<string>(ALL);
  const [barn, setBarn] = useState<string>(ALL);
  const [breed, setBreed] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(DEFAULT_STATUS);
  const [ageSort, setAgeSort] = useState<AgeSort>("none");

  // UPD-009 — Breed filter options come from the breeds actually present in the
  // owner's data (across every status, so switching Status still has a full
  // breed list), not a hardcoded list — a custom "Other" breed shows up too.
  const breedOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const goat of goats) {
      for (const row of goat.breed_composition ?? []) {
        if (row.breed) seen.add(row.breed);
      }
    }
    return [...seen].sort((a, b) => a.localeCompare(b));
  }, [goats]);

  // The duplicates view is URL state, not component state, so it survives a
  // round trip into a goat's profile. Filter state above stays local — a soft
  // nav to the same route keeps this component mounted.
  function toggleDuplicates() {
    router.push(showDuplicates ? "/goats" : "/goats?view=duplicates");
  }

  const filtered = useMemo(
    () =>
      filterGoats(goats, {
        search,
        sex: sex === ALL ? undefined : (sex as "male" | "female"),
        stage: stage === ALL ? undefined : (stage as GoatStage),
        barnId: barn === ALL ? undefined : Number(barn),
        breed: breed === ALL ? undefined : breed,
        status: status === ALL ? "all" : (status as GoatStatus),
      }),
    [goats, search, sex, stage, barn, breed, status],
  );

  // UPD-009 amendment — apply the Age sort ON TOP of the active filters (sort the
  // filtered result, never the full list). Sorts on the underlying month count
  // from `ageInMonths`, not the formatted "1y 4m" label, so ordering is truly
  // numeric. `"none"` leaves `filtered`'s order (input / search relevance) alone.
  const visibleGoats = useMemo(() => {
    if (ageSort === "none") return filtered;
    return [...filtered]
      .map((goat) => ({ goat, months: ageInMonths(goat.date_of_birth) }))
      .sort((a, b) =>
        ageSort === "desc" ? b.months - a.months : a.months - b.months,
      )
      .map((entry) => entry.goat);
  }, [filtered, ageSort]);

  // The duplicate-review scan runs over every goat, ignoring the filters above —
  // it's a retroactive audit of near-duplicate tags entered before UPD-008.
  const duplicateGroups = useMemo(
    () => findDuplicateTagGroups(goats),
    [goats],
  );

  const rowActions = (goat: GoatListRow, returnTo?: string) => (
    <>
      <GoatFormDialog
        goat={goat}
        breedComposition={goat.breed_composition ?? []}
        barns={barns}
        goats={parentGoats}
        triggerLabel="Edit"
        triggerVariant="outline"
        triggerSize="sm"
      />
      <RemoveGoatDialog
        goatId={goat.id}
        goatLabel={goat.name ?? goat.tag}
        causePresets={causePresets}
        returnTo={returnTo}
      />
    </>
  );

  const anyFilterActive =
    search.trim() !== "" ||
    sex !== ALL ||
    stage !== ALL ||
    barn !== ALL ||
    breed !== ALL ||
    status !== DEFAULT_STATUS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center">
        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-copy-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tag or name"
            className="pl-8"
            aria-label="Search goats by tag or name"
          />
        </div>

        <Select value={sex} onValueChange={(v) => setSex(v ?? ALL)}>
          <SelectTrigger className="w-full lg:w-40" aria-label="Filter by sex">
            <SelectValue placeholder="All sexes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sexes</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="male">Male</SelectItem>
          </SelectContent>
        </Select>

        <Select value={stage} onValueChange={(v) => setStage(v ?? ALL)}>
          <SelectTrigger className="w-full lg:w-40" aria-label="Filter by stage">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {STAGE_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {breedOptions.length > 0 && (
          <Select value={breed} onValueChange={(v) => setBreed(v ?? ALL)}>
            <SelectTrigger
              className="w-full lg:w-44"
              aria-label="Filter by breed"
            >
              <SelectValue placeholder="All breeds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All breeds</SelectItem>
              {breedOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={barn} onValueChange={(v) => setBarn(v ?? ALL)}>
          <SelectTrigger className="w-full lg:w-44" aria-label="Filter by barn">
            <SelectValue placeholder="All barns" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All barns</SelectItem>
            {barns.map((b) => (
              <SelectItem key={b.id} value={String(b.id)}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => setStatus(v ?? DEFAULT_STATUS)}>
          <SelectTrigger className="w-full lg:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Active" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant={showDuplicates ? "default" : "outline"}
          size="sm"
          onClick={toggleDuplicates}
          className="lg:ml-auto"
        >
          {showDuplicates
            ? "Back to all goats"
            : `Show possible duplicates${
                duplicateGroups.length > 0 ? ` (${duplicateGroups.length})` : ""
              }`}
        </Button>
      </div>

      {showDuplicates ? (
        <DuplicatesView
          groups={duplicateGroups}
          rowActions={(goat) => rowActions(goat, "/goats?view=duplicates")}
        />
      ) : (
        <GoatTable
          goats={visibleGoats}
          total={goats.length}
          anyFilterActive={anyFilterActive}
          rowActions={rowActions}
          ageSort={ageSort}
          onToggleAgeSort={() => setAgeSort((s) => NEXT_AGE_SORT[s])}
        />
      )}
    </div>
  );
}

function GoatTable({
  goats,
  total,
  anyFilterActive,
  rowActions,
  ageSort,
  onToggleAgeSort,
}: {
  goats: GoatListRow[];
  total: number;
  anyFilterActive: boolean;
  rowActions: (goat: GoatListRow) => ReactNode;
  ageSort: AgeSort;
  onToggleAgeSort: () => void;
}) {
  if (goats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {anyFilterActive ? "No goats match these filters" : "No goats yet"}
          </CardTitle>
          <CardDescription>
            {anyFilterActive
              ? `None of your ${total} goats match the current search and filters.`
              : "Register your first goat to start tracking its profile."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name / Tag</TableHead>
              <TableHead>Breed</TableHead>
              <TableHead>Sex</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>
                <AgeSortToggle sort={ageSort} onToggle={onToggleAgeSort} />
              </TableHead>
              <TableHead>Barn</TableHead>
              <TableHead>Origin</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {goats.map((goat) => (
              <TableRow key={goat.id}>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/goats/${goat.id}`}
                      className="font-medium text-copy-primary hover:text-brand"
                    >
                      {goat.name ?? goat.tag}
                    </Link>
                    {goat.is_temp_tag && <TempTagBadge />}
                  </div>
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
                <TableCell className="text-copy-secondary">
                  {formatAge(ageInMonths(goat.date_of_birth))}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {goat.barn?.name ?? "—"}
                </TableCell>
                <TableCell className="text-copy-secondary">
                  {goat.origin === "purchased" ? "Purchased" : "Born here"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">{rowActions(goat)}</div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* No table header on phone — surface the same Age sort toggle here so a
          phone user (the owner's common case) can still reorder by age. */}
      <div className="flex md:hidden">
        <span className="text-xs text-copy-muted">
          <AgeSortToggle sort={ageSort} onToggle={onToggleAgeSort} />
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:hidden">
        {goats.map((goat) => (
          <Card key={goat.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-1.5">
                  <Link href={`/goats/${goat.id}`} className="hover:text-brand">
                    {goat.name ?? goat.tag}
                  </Link>
                  {goat.is_temp_tag && <TempTagBadge />}
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
              <p className="text-sm text-copy-secondary">
                <span className="capitalize">{goat.sex}</span> ·{" "}
                {formatAge(ageInMonths(goat.date_of_birth))} ·{" "}
                {goat.barn?.name ?? "No barn"}
              </p>
              <p className="text-sm text-copy-secondary">
                {goat.origin === "purchased" ? "Purchased" : "Born here"}
              </p>
              <div className="flex gap-2">{rowActions(goat)}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

function DuplicatesView({
  groups,
  rowActions,
}: {
  groups: GoatListRow[][];
  rowActions: (goat: GoatListRow) => ReactNode;
}) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <CardTitle>No duplicate goats found</CardTitle>
          <CardDescription>
            No two goats share a tag once case and leading zeros are ignored — so
            “MJ02”, “MJ2” and “mj2” would count as the same tag and show up here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-copy-muted">
        {groups.length} tag{groups.length === 1 ? "" : "s"} used by more than one
        goat once case and leading zeros are ignored. Review each group and edit
        or remove the goats that were registered twice.
      </p>
      {groups.map((group) => (
        <Card key={group.map((g) => g.id).join("-")}>
          <CardHeader>
            <CardTitle className="text-sm">
              Tag “{group[0].tag}” · {group.length} goats
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {group.map((goat) => (
              <div
                key={goat.id}
                className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-3 first:border-t-0 first:pt-0"
              >
                <div className="flex flex-col">
                  <Link
                    href={`/goats/${goat.id}?from=duplicates`}
                    className="font-medium text-copy-primary hover:text-brand"
                  >
                    {goat.name ?? goat.tag}
                  </Link>
                  <span className="text-xs text-copy-muted capitalize">
                    Tag {goat.tag} · {goat.sex} · {goat.status} ·{" "}
                    {goat.barn?.name ?? "No barn"}
                  </span>
                </div>
                <div className="flex gap-2">{rowActions(goat)}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
