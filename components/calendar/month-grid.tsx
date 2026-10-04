"use client";

import { cn } from "@/lib/utils";
import {
  WEEKDAY_HEADINGS,
  eventCoversDay,
  formatDayLong,
  monthOf,
  type CalendarEventView,
} from "@/lib/calendar/view-state";
import { CATEGORY_DOT_CLASS } from "@/components/calendar/event-row";

// Feature 13 — the month grid. Seven equal columns that share the screen width
// (`grid-cols-7` + `min-w-0`), so it cannot scroll sideways on a phone however
// narrow. A lightweight custom grid in place of `react-big-calendar`, whose
// month view is cramped at iPhone width (architecture-context.md — Calendar).

/** A day shows at most this many dots; the rest become "+N". */
const MAX_DOTS = 3;

export function MonthGrid({
  weeks,
  month,
  today,
  selectedDay,
  events,
  onSelectDay,
}: {
  /** ISO days, Monday first — `monthGrid()`'s output. */
  weeks: string[][];
  month: string;
  today: string;
  selectedDay: string | null;
  /** Already filtered by category. */
  events: CalendarEventView[];
  onSelectDay: (day: string) => void;
}) {
  // A range (the expected kidding window) is drawn as a band, not as dots.
  const windows = events.filter((event) => event.endDay);
  const dated = events.filter((event) => !event.endDay);

  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-7 text-center text-xs text-copy-muted">
        {WEEKDAY_HEADINGS.map((heading) => (
          <span key={heading} className="min-w-0 py-1">
            {heading}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {weeks.flat().map((day, index) => {
          const dayEvents = dated.filter((event) => event.day === day);
          const inWindow = windows.some((event) => eventCoversDay(event, day));
          const column = index % 7;
          // Round the band off where it starts and ends, and at each row edge.
          const bandStarts =
            column === 0 || windows.some((event) => event.day === day);
          const bandEnds =
            column === 6 || windows.some((event) => event.endDay === day);
          const isToday = day === today;
          const isSelected = day === selectedDay;
          const count = dayEvents.length + (inWindow ? 1 : 0);

          return (
            <button
              key={day}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${formatDayLong(day)}${isToday ? ", today" : ""}, ${
                count === 0
                  ? "no events"
                  : `${count} event${count === 1 ? "" : "s"}`
              }`}
              onClick={() => onSelectDay(day)}
              className="tappable flex h-14 min-w-0 flex-col rounded-xl"
            >
              {inWindow && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 inset-y-1 bg-accent-dim",
                    bandStarts && "rounded-l-xl",
                    bandEnds && "rounded-r-xl",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative flex h-full w-full flex-col items-center gap-1 rounded-xl border pt-1.5",
                  isSelected ? "border-brand" : "border-transparent",
                  monthOf(day) !== month && "opacity-40",
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-sm",
                    isToday
                      ? "bg-brand font-semibold text-primary-foreground"
                      : "text-copy-primary",
                  )}
                >
                  {Number(day.slice(8))}
                </span>
                <span className="flex h-2 items-center gap-0.5">
                  {dayEvents.slice(0, MAX_DOTS).map((event) => (
                    <span
                      key={event.id}
                      className={cn(
                        "size-1.5 rounded-full",
                        CATEGORY_DOT_CLASS[event.category],
                      )}
                    />
                  ))}
                  {dayEvents.length > MAX_DOTS && (
                    <span className="text-[10px] leading-none text-copy-muted">
                      +{dayEvents.length - MAX_DOTS}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {windows.length > 0 && (
        <p className="flex items-center gap-2 pt-1 text-xs text-copy-muted">
          <span
            aria-hidden="true"
            className="h-3 w-5 shrink-0 rounded-md bg-accent-dim"
          />
          Shaded days: expected kidding window
        </p>
      )}
    </div>
  );
}
