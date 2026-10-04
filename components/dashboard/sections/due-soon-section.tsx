import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DueSoonList,
  type BreedingDueRow,
} from "@/components/dashboard/due-soon-list";
import { ApproveSeasonButton } from "@/components/breeding/approve-season-button";
import { listDashboardGoats, resolveBarnView } from "@/lib/dashboard/queries";
import {
  listBatchDueHealthRecords,
  listHealthBatches,
} from "@/lib/health/queries";
import {
  currentUpcoming,
  doneGroupEvents,
  supersededBatchIds,
  upcomingGroupEvents,
} from "@/lib/health/group-events";
import { loadBreedingPanel } from "@/lib/dashboard/breeding-panel";
import { DEFAULT_DUE_SOON_WINDOW_DAYS, dueSoon } from "@/lib/dashboard/due-soon";
import { computeBreedingReminders } from "@/lib/breeding/reminders";

const MS_PER_DAY = 86_400_000;

/** `YYYY-MM-DD` in local time — the format every date column in this app uses. */
function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Spec 17.3 (§5C) — what is due in the next
 * {@link DEFAULT_DUE_SOON_WINDOW_DAYS} days (plus anything overdue): group
 * health events, merged with feature 09's buck in/out reminders.
 *
 * UPD-019 — the health side shows GROUP events only (records made through Bulk
 * schedule, `batch_id is not null`), one row per group, exactly as the Health
 * page's Upcoming tab does. Nothing new is computed here: the same reads, the
 * same `dueSoon()`, and the same `lib/health/group-events.ts` helpers
 * (one row per batch, superseded events dropped) are reused — only the window
 * differs (30 days here, open-ended on the Health page). A single-goat record
 * no longer appears in this widget; it stays on that goat's own card.
 *
 * The health side is still barn-scoped, as it always was: with the dashboard's
 * barn filter on, a group event is shown if any of its goats are in that barn
 * and its count is of those goats. The breeding reminders are farm-wide,
 * exactly as before.
 */
export async function DueSoonSection({ barn }: { barn: string | undefined }) {
  const { barnId } = await resolveBarnView(barn);

  // Independent of each other. The barn's goats are only needed to scope the
  // due records when a barn filter is on.
  const [
    dueRecords,
    batchRows,
    barnGoats,
    { templates, occurrenceRows, bucks, bucklings, barns },
  ] = await Promise.all([
    listBatchDueHealthRecords(),
    listHealthBatches(),
    barnId !== undefined ? listDashboardGoats(barnId) : null,
    loadBreedingPanel(),
  ]);

  const barnGoatIds = barnGoats ? new Set(barnGoats.map((g) => g.id)) : null;
  const scopedRecords = (dueRecords ?? []).filter(
    (record) => !barnGoatIds || barnGoatIds.has(record.goatId),
  );

  // A group event that a newer one has replaced is not owed any more —
  // judged over every group event, not just the ones inside the window.
  const groupEvents = currentUpcoming(
    upcomingGroupEvents(
      dueSoon(scopedRecords, { windowDays: DEFAULT_DUE_SOON_WINDOW_DAYS }),
    ),
    supersededBatchIds(doneGroupEvents(batchRows ?? [])),
  );

  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const breedingDueItems: BreedingDueRow[] = computeBreedingReminders(
    templates,
    occurrenceRows,
    now,
  )
    .map((reminder, index) => {
      const dueMidnight = new Date(
        reminder.dueDate.getFullYear(),
        reminder.dueDate.getMonth(),
        reminder.dueDate.getDate(),
      ).getTime();
      const iso = toIso(reminder.dueDate);
      return {
        key: `${reminder.type}-${index}`,
        type: reminder.type,
        label: reminder.label,
        dueDate: iso,
        daysUntilDue: Math.round((dueMidnight - todayMidnight) / MS_PER_DAY),
        isEstimate: reminder.isEstimate,
        action:
          reminder.type === "introduce_males" && reminder.templateId != null ? (
            <ApproveSeasonButton
              templateId={reminder.templateId}
              suggestedStart={iso}
              bucks={bucks}
              bucklings={bucklings}
              barns={barns}
              templates={templates}
            />
          ) : undefined,
      };
    })
    .filter((item) => item.daysUntilDue <= DEFAULT_DUE_SOON_WINDOW_DAYS);

  return (
    <Card className="rounded-2xl min-w-0">
      <CardHeader className="px-3">
        <CardTitle>Due soon</CardTitle>
        <CardDescription>
          Group health events and breeding reminders due in the next{" "}
          {DEFAULT_DUE_SOON_WINDOW_DAYS} days.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3">
        <DueSoonList
          groupEvents={groupEvents}
          windowDays={DEFAULT_DUE_SOON_WINDOW_DAYS}
          breedingItems={breedingDueItems}
        />
      </CardContent>
    </Card>
  );
}
