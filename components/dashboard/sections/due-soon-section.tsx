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
import {
  listDashboardGoats,
  listDueHealthRecords,
  resolveBarnView,
} from "@/lib/dashboard/queries";
import { loadBreedingPanel } from "@/lib/dashboard/breeding-panel";
import {
  DEFAULT_DUE_SOON_WINDOW_DAYS,
  dueSoon,
  type DueSoonSourceRecord,
} from "@/lib/dashboard/due-soon";
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
 * Spec 17.3 (§5C) — health reminders due in the next
 * {@link DEFAULT_DUE_SOON_WINDOW_DAYS} days, merged with feature 09's buck
 * in/out reminders.
 *
 * The heaviest card on the dashboard: it needs the barn-scoped goats, their due
 * health records, and the whole breeding panel. Before this spec that cost was
 * paid by every other card too, because nothing rendered until it finished. Now
 * the donuts are on screen while this one is still assembling.
 *
 * The health side is barn-scoped (via the goat ids); the breeding reminders are
 * farm-wide, exactly as before.
 */
export async function DueSoonSection({ barn }: { barn: string | undefined }) {
  const { barnId } = await resolveBarnView(barn);
  const goats = await listDashboardGoats(barnId);
  const goatById = new Map(goats.map((goat) => [goat.id, goat]));

  // Independent of each other: the health records need the goat ids resolved
  // above, the breeding panel needs nothing from here.
  const [healthRows, { templates, occurrenceRows, bucks, bucklings, barns }] =
    await Promise.all([
      listDueHealthRecords(goats.map((g) => g.id)),
      loadBreedingPanel(),
    ]);

  const dueSoonSource: DueSoonSourceRecord[] = healthRows.map((row) => {
    const goat = goatById.get(row.goat_id);
    return {
      goatId: row.goat_id,
      goatTag: goat?.tag ?? "",
      goatName: goat?.name ?? null,
      recordType: row.record_type,
      title: row.title,
      nextDueDate: row.next_due_date,
      status: row.status,
    };
  });
  const dueItems = dueSoon(dueSoonSource, {
    windowDays: DEFAULT_DUE_SOON_WINDOW_DAYS,
  });

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
          Vaccinations, deworming, checkups and breeding reminders due in the
          next {DEFAULT_DUE_SOON_WINDOW_DAYS} days.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3">
        <DueSoonList
          items={dueItems}
          windowDays={DEFAULT_DUE_SOON_WINDOW_DAYS}
          breedingItems={breedingDueItems}
        />
      </CardContent>
    </Card>
  );
}
