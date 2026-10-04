import Link from "next/link";
import {
  HealthTabs,
  parseHealthTab,
  type HealthTab,
} from "@/components/health/health-tabs";
import { HealthArchiveFilter } from "@/components/health/health-archive-filter";
import { HealthGroupEventList } from "@/components/health/health-group-event-list";
import {
  HEALTH_BATCH_LIST_LIMIT,
  listBatchDueHealthRecords,
  listHealthBatches,
  listHealthConditionPresets,
} from "@/lib/health/queries";
import {
  BulkHealthDialog,
  type BulkGoat,
} from "@/components/health/bulk-health-dialog";
import { listBarns, listHerdGoats } from "@/lib/goats/queries";
import { listMedicineItems } from "@/lib/inventory/queries";
import { dueSoon } from "@/lib/dashboard/due-soon";
import {
  currentUpcoming,
  doneGroupEvents,
  excludedGoatsByBatch,
  filterByActivity,
  flagSuperseded,
  latestDonePerActivity,
  newestDueFirst,
  parseGroupActivity,
  supersededBatchIds,
  upcomingGroupEvents,
  type GroupActivity,
} from "@/lib/health/group-events";

// UPD-016 — the real `/health` page, replacing the `ModulePlaceholder` stub
// that spec 03 put here and nothing had replaced since.
//
// Amended 2026-10-04: the page shows ONLY group health events — records made
// through Bulk schedule (`health_records.batch_id is not null`). Anything done
// to a single goat, routine (deworming, dip wash, vaccination) or not, is NOT
// shown here: it stays on that goat's own card (feature 07's Health tab,
// unchanged), and its next due date stays visible on the dashboard's Due soon
// widget. Two tabs, one row design — every row says both what was done and
// what is next:
//
//   Upcoming — for each activity and group, its latest next due date,
//              soonest first. Overdue ones are at the top marked "Overdue";
//              ones due within 7 days are marked "Due soon". An event that a
//              newer one of the same activity for the same group has replaced
//              is superseded: it leaves this view and is never overdue.
//   Done     — for each activity, its most recent group event, however old.
//
// The Upcoming tab is not a second due-date implementation: it calls the same
// `dueSoon()` the dashboard's Due soon widget calls, and
// `upcomingGroupEvents()` only folds that output into one row per batch. The
// dashboard widget is unchanged.
//
// Each tab has an Archive holding the full list (older and superseded events
// included), newest first, filterable by activity.
//
// The goats in a group are never listed. A row names only the goats that were
// EXCLUDED from that bulk action ("Excluded: 021"), when there were any.
//
// View state lives in the URL (`?tab=`, `?view=archive`, `?activity=`) so it
// survives opening a goat from a row and coming back.

interface HealthPageSearchParams {
  tab?: string;
  view?: string;
  activity?: string;
}

const ACTIVITY_NOUNS: Record<GroupActivity, string> = {
  deworming: "deworming",
  dip_wash: "dip wash",
  vaccination: "vaccination",
};

/** The link from a tab's default view into its Archive. */
function ArchiveLink({ tab, label }: { tab: HealthTab; label: string }) {
  return (
    <Link
      href={`/health?tab=${tab}&view=archive`}
      className="tappable-inline self-start text-sm text-brand underline underline-offset-2 hover:text-brand/80"
    >
      {label}
    </Link>
  );
}

/** The Archive's header: the way back, and the activity filter. */
function ArchiveHeader({
  tab,
  backLabel,
  activity,
}: {
  tab: HealthTab;
  backLabel: string;
  activity: GroupActivity | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Link
        href={`/health?tab=${tab}`}
        className="tappable-inline self-start text-sm text-brand underline underline-offset-2 hover:text-brand/80"
      >
        ← {backLabel}
      </Link>
      <HealthArchiveFilter tab={tab} active={activity} />
    </div>
  );
}

export default async function HealthPage({
  searchParams,
}: {
  searchParams: Promise<HealthPageSearchParams>;
}) {
  const params = await searchParams;
  const tab = parseHealthTab(params.tab);
  const archive = params.view === "archive";
  const activity = parseGroupActivity(params.activity);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-copy-primary">Health</h1>
        {/*
          UPD-017 — the bulk entry point. An action in the page header, not a
          tab of its own: it creates records rather than showing content.
        */}
        <BulkScheduleAction />
      </div>

      <HealthTabs active={tab} />

      {tab === "done" ? (
        <DoneTab archive={archive} activity={activity} />
      ) : (
        <UpcomingTab archive={archive} activity={activity} />
      )}
    </div>
  );
}

/**
 * UPD-017 — everything the bulk dialog needs, loaded on the server so the goat
 * ids it can offer are only ever ones RLS already returned for this owner
 * (spec Section 7). All four reads are `cache()`d.
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

/**
 * Shown instead of an empty list when the group-event read fails, so a database
 * that is missing the batch migration is not mistaken for "no group events".
 */
function GroupEventsUnavailable() {
  return (
    <p className="text-sm text-error">
      Group events could not be loaded. If a new health_record_batches
      migration has not been run in Supabase yet, run it and reload this page.
    </p>
  );
}

interface TabProps {
  archive: boolean;
  activity: GroupActivity | null;
}

async function UpcomingTab({ archive, activity }: TabProps) {
  // Both reads: the due records give the rows, and the full list of group
  // events is what says which of those rows a newer event has superseded.
  const [sourceRecords, batchRows, goats] = await Promise.all([
    listBatchDueHealthRecords(),
    listHealthBatches(),
    listHerdGoats(),
  ]);
  if (sourceRecords === null || batchRows === null) {
    return <GroupEventsUnavailable />;
  }

  // The shared computation — same function, same overdue handling and ordering
  // as the dashboard's Due soon widget. The window is left open-ended: every
  // group event with a next due date is considered, however far ahead. Folding
  // into rows happens afterwards and decides nothing about what is due.
  const all = upcomingGroupEvents(
    dueSoon(sourceRecords, { windowDays: Number.POSITIVE_INFINITY }),
  );
  const superseded = supersededBatchIds(doneGroupEvents(batchRows));
  const excludedByBatch = excludedGoatsByBatch(batchRows, goats);

  if (archive) {
    return (
      <div className="flex flex-col gap-4">
        <ArchiveHeader
          tab="upcoming"
          backLabel="Back to Upcoming"
          activity={activity}
        />
        <p className="text-sm text-copy-muted">
          Every group event with a next due date, newest first — including
          ones a newer event has replaced.
        </p>
        <HealthGroupEventList
          excludedByBatch={excludedByBatch}
          events={newestDueFirst(
            filterByActivity(flagSuperseded(all, superseded), activity),
          )}
          emptyMessage={
            activity
              ? `No group ${ACTIVITY_NOUNS[activity]} with a next due date.`
              : "No group events with a next due date."
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-copy-muted">
        What is next for each group. Anything overdue is at the top.
      </p>

      <HealthGroupEventList
        excludedByBatch={excludedByBatch}
        events={currentUpcoming(all, superseded)}
        emptyMessage="Nothing coming up for a group. A bulk schedule with a next due date shows up here. Anything logged for a single goat stays on that goat’s own card and the dashboard’s Due soon list."
      />

      <ArchiveLink tab="upcoming" label="Archive — all upcoming group events" />
    </div>
  );
}

async function DoneTab({ archive, activity }: TabProps) {
  const [rows, goats] = await Promise.all([
    listHealthBatches(),
    listHerdGoats(),
  ]);
  if (rows === null) return <GroupEventsUnavailable />;
  const all = doneGroupEvents(rows);
  const excludedByBatch = excludedGoatsByBatch(rows, goats);

  const capNote = rows.length === HEALTH_BATCH_LIST_LIMIT && (
    <p className="text-xs text-copy-muted">
      Showing the {HEALTH_BATCH_LIST_LIMIT} most recently recorded group events.
    </p>
  );

  if (archive) {
    return (
      <div className="flex flex-col gap-4">
        <ArchiveHeader tab="done" backLabel="Back to Done" activity={activity} />
        <p className="text-sm text-copy-muted">
          Every group event, newest first.
        </p>
        <HealthGroupEventList
          excludedByBatch={excludedByBatch}
          events={filterByActivity(all, activity)}
          emptyMessage={
            activity
              ? `No group ${ACTIVITY_NOUNS[activity]} recorded yet.`
              : "No group events yet. Use “Bulk schedule” to log a deworming, dip wash or vaccination for a whole group at once."
          }
        />
        {capNote}
      </div>
    );
  }

  const latest = latestDonePerActivity(all);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-copy-muted">
        The latest deworming, dip wash and vaccination done for a group. Older
        ones are in the Archive; each goat’s own card holds its full history.
      </p>

      <div className="flex flex-col gap-2">
        {latest.map(({ activity: kind, event }) =>
          event ? (
            <HealthGroupEventList
              key={kind}
              events={[event]}
              excludedByBatch={excludedByBatch}
              emptyMessage=""
            />
          ) : (
            <p
              key={kind}
              className="rounded-xl border border-dashed border-surface-border px-3 py-3 text-sm text-copy-muted"
            >
              No group {ACTIVITY_NOUNS[kind]} yet
            </p>
          ),
        )}
      </div>

      <ArchiveLink tab="done" label="Archive — all group events done" />
    </div>
  );
}
