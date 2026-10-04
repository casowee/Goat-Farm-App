import {
  CALENDAR_CATEGORIES,
  CALENDAR_CATEGORY_LABELS,
} from "@/lib/calendar/events";
import {
  eventCoversDay,
  formatDayLong,
  type CalendarEventView,
} from "@/lib/calendar/view-state";
import { EventRow } from "@/components/calendar/event-row";

// Feature 13 — the selected day's events, listed below the grid (not a modal)
// and grouped by category. A day inside the expected kidding window lists the
// window too, since the band on the grid cannot say what it is.

export function DayDetail({
  day,
  events,
}: {
  day: string | null;
  /** Already filtered by category. */
  events: CalendarEventView[];
}) {
  if (!day) {
    return (
      <p className="text-sm text-copy-muted">
        Tap a day to see what is on it.
      </p>
    );
  }

  const dayEvents = events.filter((event) => eventCoversDay(event, day));

  return (
    <section className="flex flex-col gap-3" aria-live="polite">
      <h2 className="text-sm font-semibold text-copy-primary">
        {formatDayLong(day)}
      </h2>

      {dayEvents.length === 0 ? (
        <p className="text-sm text-copy-muted">Nothing on this day.</p>
      ) : (
        CALENDAR_CATEGORIES.map((category) => {
          const rows = dayEvents.filter((event) => event.category === category);
          if (rows.length === 0) return null;
          return (
            <div key={category} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-copy-muted">
                {CALENDAR_CATEGORY_LABELS[category]}
              </h3>
              <ul className="flex flex-col gap-2">
                {rows.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}
