"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CalendarCategory } from "@/lib/calendar/events";
import {
  LIST_WINDOW_DAYS,
  calendarHref,
  calendarRange,
  monthGrid,
  monthLabel,
  monthOf,
  parseCalendarState,
  shiftMonth,
  type CalendarEventView,
  type CalendarState,
  type CalendarViewMode,
} from "@/lib/calendar/view-state";
import { AgendaList } from "@/components/calendar/agenda-list";
import { CategoryFilter } from "@/components/calendar/category-filter";
import { DayDetail } from "@/components/calendar/day-detail";
import { MonthGrid } from "@/components/calendar/month-grid";

// Feature 13 — the calendar's interactive shell: header, filter chips, and the
// month grid with its day detail, or the list.
//
// All of its state is the URL (`?month=`, `?view=`, `?day=`, `?cats=`,
// `?past=`), read back through `useSearchParams`, so opening an event and
// coming back lands on the same month, day and filters. There is no
// `useState` to fall out of step with it.
//
// Two kinds of change:
//   - a different month, view or "Show past" needs different events, so those
//     are ordinary links and the server page fetches the new range;
//   - picking a day or toggling a category only changes what is shown from the
//     events already here, so it rewrites the URL in place
//     (`history.replaceState`, which the Next router keeps `useSearchParams`
//     in step with) — instant, no refetch, and no extra Back-button stops.
//
// Every control is built in here, inside the client component (ERR-001).

const VIEW_TABS: { view: CalendarViewMode; label: string }[] = [
  { view: "month", label: "Month" },
  { view: "list", label: "List" },
];

export function CalendarView({
  events,
  today,
}: {
  /** Every event in the fetched range, in date order. */
  events: CalendarEventView[];
  /** The server's "today", so server and client mark the same day. */
  today: string;
}) {
  const searchParams = useSearchParams();
  const state = parseCalendarState(
    (key) => searchParams.get(key) ?? undefined,
    today,
  );

  // No day in the URL: today, when the grid is showing this month.
  const selectedDay =
    state.day ?? (state.month === monthOf(today) ? today : null);

  const visible = events.filter((event) =>
    state.categories.includes(event.category),
  );

  const rewriteUrl = (next: CalendarState) => {
    window.history.replaceState(null, "", calendarHref(next));
  };

  const toggleCategory = (category: CalendarCategory) => {
    rewriteUrl({
      ...state,
      categories: state.categories.includes(category)
        ? state.categories.filter((c) => c !== category)
        : [...state.categories, category],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-surface-border">
        {VIEW_TABS.map(({ view, label }) => {
          const isActive = view === state.view;
          return (
            <Link
              key={view}
              href={calendarHref({ ...state, view })}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "tappable -mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand text-copy-primary"
                  : "border-transparent text-copy-muted hover:text-copy-secondary",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      <CategoryFilter active={state.categories} onToggle={toggleCategory} />

      {state.view === "month" ? (
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              aria-label="Previous month"
              render={
                <Link
                  href={calendarHref({
                    ...state,
                    month: shiftMonth(state.month, -1),
                    day: null,
                  })}
                />
              }
            >
              <ChevronLeft />
            </Button>
            <h2 className="min-w-0 flex-1 text-center text-base font-semibold text-copy-primary">
              {monthLabel(state.month)}
            </h2>
            <Button
              variant="outline"
              size="icon"
              nativeButton={false}
              aria-label="Next month"
              render={
                <Link
                  href={calendarHref({
                    ...state,
                    month: shiftMonth(state.month, 1),
                    day: null,
                  })}
                />
              }
            >
              <ChevronRight />
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  href={calendarHref({
                    ...state,
                    month: monthOf(today),
                    day: today,
                  })}
                />
              }
            >
              Today
            </Button>
          </div>

          <MonthGrid
            weeks={monthGrid(state.month)}
            month={state.month}
            today={today}
            selectedDay={selectedDay}
            events={visible}
            onSelectDay={(day) => rewriteUrl({ ...state, day })}
          />

          <DayDetail day={selectedDay} events={visible} />
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-copy-muted">
              {state.past
                ? `The last ${LIST_WINDOW_DAYS} days and the next ${LIST_WINDOW_DAYS}.`
                : `From today, the next ${LIST_WINDOW_DAYS} days.`}
            </p>
            <Link
              href={calendarHref({ ...state, past: !state.past })}
              className="tappable-inline text-sm text-brand underline underline-offset-2 hover:text-brand/80"
            >
              {state.past ? "Hide past" : "Show past"}
            </Link>
          </div>

          <AgendaList
            events={visible}
            from={calendarRange(state, today).from}
            today={today}
          />
        </>
      )}
    </div>
  );
}
