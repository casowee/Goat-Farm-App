import {
  formatDayLong,
  isListed,
  type CalendarEventView,
} from "@/lib/calendar/view-state";
import { EventRow } from "@/components/calendar/event-row";

// Feature 13 — the list view: a chronological agenda grouped by day, in the
// same row design as the day detail.

export function AgendaList({
  events,
  from,
  today,
}: {
  /** Already filtered by category, in date order. */
  events: CalendarEventView[];
  /** The first day the list shows (overdue items apart). */
  from: string;
  today: string;
}) {
  // The events arrive reaching further back than the list shows, so that
  // overdue items can be picked out whatever "Show past" says.
  const listed = events.filter((event) => isListed(event, from));
  if (listed.length === 0) {
    return (
      <p className="text-sm text-copy-muted">Nothing in this period.</p>
    );
  }

  // Overdue items sit at the top, longest overdue first, and nowhere else.
  const overdue = listed.filter((event) => event.status === "overdue");

  // A kidding window that began before the list does is still running, so it
  // is listed on the list's first day rather than dropped.
  const byDay = new Map<string, CalendarEventView[]>();
  for (const event of listed) {
    if (event.status === "overdue") continue;
    const day = event.day < from ? from : event.day;
    byDay.set(day, [...(byDay.get(day) ?? []), event]);
  }
  const days = [...byDay.keys()].sort();

  return (
    <div className="flex flex-col gap-4">
      {overdue.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-error">Overdue</h2>
          <ul className="flex flex-col gap-2">
            {overdue.map((event) => (
              <EventRow key={event.id} event={event} showDay />
            ))}
          </ul>
        </section>
      )}

      {days.map((day) => (
        <section key={day} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-copy-primary">
            {formatDayLong(day)}
            {day === today && (
              <span className="font-normal text-brand"> · Today</span>
            )}
          </h2>
          <ul className="flex flex-col gap-2">
            {(byDay.get(day) ?? []).map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
