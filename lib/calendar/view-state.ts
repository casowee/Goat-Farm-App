// Feature 13 — Calendar. What the `/calendar` URL says, and the plain date
// arithmetic the grid needs. Pure, and shared by the server page (which range to
// fetch) and the client view (what to show), so the two can never disagree
// about what a URL means.
//
// Days are ISO `YYYY-MM-DD` strings throughout, never `Date` objects: the
// server and the owner's phone are in different timezones, and a `Date` handed
// from one to the other can land on the day before. The arithmetic below runs
// in UTC for the same reason — it only ever counts whole days.

import {
  CALENDAR_CATEGORIES,
  type CalendarCategory,
  type CalendarEvent,
  type CalendarGoatRef,
} from "@/lib/calendar/events";

export type CalendarViewMode = "month" | "list";

/** How far the list view looks ahead — and back, with "Show past". */
export const LIST_WINDOW_DAYS = 90;

/**
 * How far back the list view looks for overdue items, which it always shows
 * at the top whether or not "Show past" is on.
 */
export const OVERDUE_LOOKBACK_DAYS = 365;

export interface CalendarState {
  /** `YYYY-MM` — the month the grid shows. */
  month: string;
  view: CalendarViewMode;
  /** The selected day, or null when none is. */
  day: string | null;
  categories: CalendarCategory[];
  /** List view only: also show the last {@link LIST_WINDOW_DAYS} days. */
  past: boolean;
}

/** A `CalendarEvent` with its dates as ISO days — safe to hand to the client. */
export interface CalendarEventView {
  id: string;
  category: CalendarCategory;
  title: string;
  subtitle?: string;
  day: string;
  /** Only for ranges — the expected kidding window. */
  endDay?: string;
  isEstimate?: boolean;
  status?: "done" | "due" | "overdue";
  href?: string;
  /** Several single goats folded into one entry — see `CalendarEvent.goats`. */
  goats?: CalendarGoatRef[];
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Column headings — the grid's week starts on Monday. */
export const WEEKDAY_HEADINGS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `YYYY-MM-DD` from a Date's local fields — the format every date column uses. */
export function toIsoDay(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toUtc(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date));
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A real `YYYY-MM-DD` day, or null. */
export function parseIsoDay(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return fromUtc(toUtc(value)) === value ? value : null;
}

export function addDays(day: string, days: number): string {
  const date = toUtc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtc(date);
}

export function monthOf(day: string): string {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
  return fromUtc(date).slice(0, 7);
}

/** `2026-10` → `October 2026`. */
export function monthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

/** `2026-10-08` → `Thu 8 October 2026`. */
export function formatDayLong(day: string): string {
  const date = toUtc(day);
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${date.getUTCDate()} ${
    MONTH_NAMES[date.getUTCMonth()]
  } ${date.getUTCFullYear()}`;
}

/**
 * The weeks the grid shows for a month, Monday first — whole weeks, so the
 * first and last rows carry a few days of the neighbouring months.
 */
export function monthGrid(month: string): string[][] {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  // getUTCDay(): Sunday = 0. Shift so Monday = 0.
  const lead = (toUtc(first).getUTCDay() + 6) % 7;
  const trail = 6 - ((toUtc(last).getUTCDay() + 6) % 7);

  const weeks: string[][] = [];
  let day = addDays(first, -lead);
  const end = addDays(last, trail);
  while (day <= end) {
    const week: string[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function parseMonth(value: string | undefined, today: string): string {
  return value && parseIsoDay(`${value}-01`) ? value : monthOf(today);
}

function parseCategories(value: string | undefined): CalendarCategory[] {
  if (value === undefined) return [...CALENDAR_CATEGORIES];
  const wanted = value.split(",");
  return CALENDAR_CATEGORIES.filter((category) => wanted.includes(category));
}

/** Read the URL. Anything missing or unrecognised falls back to the default. */
export function parseCalendarState(
  get: (key: string) => string | undefined,
  today: string,
): CalendarState {
  return {
    month: parseMonth(get("month"), today),
    view: get("view") === "list" ? "list" : "month",
    day: parseIsoDay(get("day")),
    categories: parseCategories(get("cats")),
    past: get("past") === "1",
  };
}

/** The URL for a state. Defaults are left out, so a plain link stays short. */
export function calendarHref(state: CalendarState): string {
  const params = new URLSearchParams();
  params.set("month", state.month);
  if (state.view === "list") params.set("view", "list");
  if (state.day) params.set("day", state.day);
  if (state.categories.length < CALENDAR_CATEGORIES.length) {
    params.set("cats", state.categories.join(",") || "none");
  }
  if (state.past) params.set("past", "1");
  return `/calendar?${params.toString()}`;
}

/**
 * The days a view needs events for: the month grid's visible weeks, or the
 * list's bounded window around today.
 */
export function calendarRange(
  state: Pick<CalendarState, "month" | "view" | "past">,
  today: string,
): { from: string; to: string } {
  if (state.view === "list") {
    return {
      from: state.past ? addDays(today, -LIST_WINDOW_DAYS) : today,
      to: addDays(today, LIST_WINDOW_DAYS),
    };
  }
  const weeks = monthGrid(state.month);
  return { from: weeks[0][0], to: weeks[weeks.length - 1][6] };
}

/**
 * The days to READ for a view. The list view reads further back than it
 * shows, so that overdue items can sit at the top with "Show past" off.
 */
export function calendarFetchRange(
  state: Pick<CalendarState, "month" | "view" | "past">,
  today: string,
): { from: string; to: string } {
  const shown = calendarRange(state, today);
  return state.view === "list"
    ? { from: addDays(today, -OVERDUE_LOOKBACK_DAYS), to: shown.to }
    : shown;
}

/**
 * Whether the list view shows an event for a range starting at `from`:
 * anything still running or still to come, plus everything overdue.
 */
export function isListed(event: CalendarEventView, from: string): boolean {
  return event.status === "overdue" || (event.endDay ?? event.day) >= from;
}

export function toEventView(event: CalendarEvent): CalendarEventView {
  return {
    id: event.id,
    category: event.category,
    title: event.title,
    subtitle: event.subtitle,
    day: toIsoDay(event.start),
    endDay: event.end ? toIsoDay(event.end) : undefined,
    isEstimate: event.isEstimate,
    status: event.status,
    href: event.href,
    goats: event.goats,
  };
}

/** Whether an event falls on a day — a range covers every day inside it. */
export function eventCoversDay(event: CalendarEventView, day: string): boolean {
  return event.endDay
    ? event.day <= day && day <= event.endDay
    : event.day === day;
}
