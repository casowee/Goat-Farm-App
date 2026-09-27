import { HealthTabs, parseHealthTab } from "@/components/health/health-tabs";
import {
  FarmHealthFilters as FarmHealthFiltersControl,
  type HealthFilterGoat,
} from "@/components/health/farm-health-filters";
import { FarmHealthRecordList } from "@/components/health/farm-health-record-list";
import { HealthScheduleList } from "@/components/health/health-schedule-list";
import { ScheduleWindowSelect } from "@/components/health/schedule-window-select";
import {
  countFarmHealthRecords,
  listFarmDueHealthRecords,
  listFarmHealthRecordsFirstPage,
  type FarmHealthFilters,
} from "@/lib/health/queries";
import {
  BulkHealthDialog,
  type BulkGoat,
} from "@/components/health/bulk-health-dialog";
import { listBarns, listHerdGoats } from "@/lib/goats/queries";
import { listHealthConditionPresets } from "@/lib/health/queries";
import { listMedicineItems } from "@/lib/inventory/queries";
import { dueSoon, parseDueWindow } from "@/lib/dashboard/due-soon";
import { isHealthRecordType } from "@/lib/health/records";

// UPD-016 — the real `/health` page, replacing the `ModulePlaceholder` stub
// that spec 03 put here and nothing had replaced since.
//
// Feature 07 built health records as a per-goat tab on each goat's own detail
// page, and that is still the only place a record is created, edited or
// deleted. What never existed was a farm-wide view of them, which is why the
// sidebar's Health entry has been a dead end while real records piled up. This
// page adds exactly that, in two tabs:
//
//   History  — every goat's existing records aggregated into one newest-first
//              list, with optional goat / record-type filters.
//   Schedule — everything with an upcoming `next_due_date`, soonest first,
//              over a selectable lookahead window.
//
// The Schedule tab is not a second due-date implementation: it calls the same
// `dueSoon()` the dashboard's Due soon widget calls, with a wider `windowDays`
// (90 by default vs. the dashboard's 30). The dashboard widget is unchanged.
//
// Both tabs' view state lives in the URL (`?tab=`, `?goat=`, `?type=`,
// `?window=`) so it survives opening a goat from the list and coming back.

interface HealthPageSearchParams {
  tab?: string;
  goat?: string;
  type?: string;
  window?: string;
}

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<HealthPageSearchParams>;
}) {
  const params = await searchParams;
  const tab = parseHealthTab(params.tab);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-copy-primary">Health</h1>
        {/*
          UPD-017 — the bulk entry point. An action in the page header, not a
          third tab: UPD-016 had just settled the History / Schedule split and
          this creates records rather than showing a new kind of content.
        */}
        <BulkScheduleAction />
      </div>

      <HealthTabs active={tab} />

      {tab === "schedule" ? (
        <ScheduleTab windowParam={params.window} />
      ) : (
        <HistoryTab goatParam={params.goat} typeParam={params.type} />
      )}
    </div>
  );
}

/**
 * UPD-017 — everything the bulk dialog needs, loaded on the server so the goat
 * ids it can offer are only ever ones RLS already returned for this owner
 * (spec Section 7). All four reads are `cache()`d, and `listHerdGoats` /
 * `listHealthConditionPresets` are the same calls the tabs below already make.
 */
async function BulkScheduleAction() {
  const [goats, barns, presets, medicines] = await Promise.all([
    listHerdGoats(),
    listBarns(),
    listHealthConditionPresets(),
    listMedicineItems(),
  ]);

  const bulkGoats: BulkGoat[] = goats.map((goat) => ({
    id: goat.id,
    tag: goat.tag,
    name: goat.name,
    sex: goat.sex,
    reproductive_state: goat.reproductive_state,
    date_of_birth: goat.date_of_birth,
    barn_id: goat.barn_id,
    status: goat.status,
  }));

  return (
    <BulkHealthDialog
      goats={bulkGoats}
      barns={barns}
      presets={presets}
      medicines={medicines}
    />
  );
}

async function HistoryTab({
  goatParam,
  typeParam,
}: {
  goatParam: string | undefined;
  typeParam: string | undefined;
}) {
  // An unrecognised param is ignored rather than erroring — a hand-edited or
  // stale URL should degrade to the unfiltered list, not a broken page.
  const goatId = Number(goatParam);
  const filters: FarmHealthFilters = {
    ...(Number.isInteger(goatId) && goatId > 0 ? { goatId } : {}),
    ...(typeParam && isHealthRecordType(typeParam)
      ? { recordType: typeParam }
      : {}),
  };
  const filtered = filters.goatId != null || filters.recordType != null;

  const [records, total, goats] = await Promise.all([
    listFarmHealthRecordsFirstPage(filters),
    countFarmHealthRecords(filters),
    listHerdGoats(),
  ]);

  // Every goat, tag order, including sold / deceased / stolen ones — their
  // records are still part of the farm's history and must stay filterable.
  const filterGoats: HealthFilterGoat[] = goats.map((goat) => ({
    id: goat.id,
    tag: goat.tag,
    name: goat.name,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-copy-muted">
          Every health record across the whole herd, newest first. Tap a goat’s
          tag to open its profile, where records are added and edited.
        </p>
      </div>

      <FarmHealthFiltersControl
        goats={filterGoats}
        goatValue={filters.goatId != null ? String(filters.goatId) : "all"}
        typeValue={filters.recordType ?? "all"}
      />

      <p className="text-xs text-copy-muted">
        {total} record{total === 1 ? "" : "s"}
        {filtered ? " match these filters" : " in total"}.
      </p>

      <FarmHealthRecordList
        records={records}
        total={total}
        filters={filters}
        filtered={filtered}
      />
    </div>
  );
}

async function ScheduleTab({
  windowParam,
}: {
  windowParam: string | undefined;
}) {
  const windowDays = parseDueWindow(windowParam);
  const sourceRecords = await listFarmDueHealthRecords();

  // The shared computation — same function, same overdue handling and ordering
  // as the dashboard's Due soon widget, just a wider window.
  const items = dueSoon(sourceRecords, { windowDays });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-copy-muted">
          Vaccinations, deworming, dip washes and checkups with a next due date,
          across the whole herd, soonest first. Anything already overdue is
          listed at the top.
        </p>
      </div>

      <ScheduleWindowSelect value={windowDays} />

      <HealthScheduleList items={items} windowDays={windowDays} />
    </div>
  );
}
