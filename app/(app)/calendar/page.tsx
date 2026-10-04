import { CalendarView } from "@/components/calendar/calendar-view";
import { buildCalendarEvents } from "@/lib/calendar/events";
import { loadCalendarSources } from "@/lib/calendar/queries";
import {
  calendarFetchRange,
  parseCalendarState,
  toEventView,
  toIsoDay,
} from "@/lib/calendar/view-state";
import { parseDateOnly } from "@/lib/breeding/season";

// Feature 13 — the farm-wide calendar. A read-only view over what the app
// already records: group health events done and their next due dates,
// single-goat routine due dates, breeding seasons and estimates, the expected
// kidding window, litters, and sales / deaths / stolen goats. Illness, injury,
// treatment and checkup records are deliberately absent — they live on each
// goat's own card (the rule settled in UPD-016).
//
// Nothing is created or edited here; tasks and the feeding schedule arrive
// with spec 14, as one more source for `buildCalendarEvents()`.
//
// The page fetches only the range the URL asks for — the shown month's weeks,
// or the list's bounded window — and hands the client view plain ISO days.

type CalendarSearchParams = { [key: string]: string | string[] | undefined };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<CalendarSearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();
  const today = toIsoDay(now);

  const state = parseCalendarState((key) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  }, today);
  // The list view reads further back than it shows, for its overdue items.
  const range = calendarFetchRange(state, today);

  const { sources, groupEventsLoaded } = await loadCalendarSources(
    range.from,
    range.to,
  );

  const events = buildCalendarEvents(
    sources,
    parseDateOnly(range.from) ?? now,
    parseDateOnly(range.to) ?? now,
    now,
  ).map(toEventView);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <h1 className="text-xl font-semibold text-copy-primary">Calendar</h1>

      {!groupEventsLoaded && (
        <p className="text-sm text-error">
          Group health events could not be loaded, so they are missing from
          the calendar. Reload the page to try again.
        </p>
      )}

      <CalendarView events={events} today={today} />
    </div>
  );
}
