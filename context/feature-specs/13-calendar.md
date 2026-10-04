# 13 — Calendar

| Field       | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Phase       | 4 — Insight (built ahead of `14` to-dos, at the owner's request)               |
| Aspect      | Mostly front-end; read-only aggregation of existing data, no schema change      |
| Status      | `in progress` (started 2026-10-04; awaiting the owner's real-iPhone test)      |
| Depends on  | `07` health records, `UPD-016`/`UPD-017` (group events, batch grouping), `09` breeding (seasons, templates, kidding window, reminders), `UPD-012`/`UPD-013` (kidding events), `UPD-008` (`herd_events` departures) |
| Unblocks    | `14` to-dos (adds tasks and feeding schedule into this calendar later)         |

> **Agent:** before writing code, follow the Implementation Workflow in `ai-workflow-rules.md`. Inspect
> `types/database.types.ts` and the existing `lib` helpers listed in Section 3 before building anything.
> The calendar must **reuse** those helpers, never re-derive due dates, kidding windows, batch grouping
> or kidding events on its own. Also read `ERR-001` and `ui-context.md` (Form Length Standard,
> no-horizontal-scroll rule from `UPD-011`).

---

## 1. Goal

One farm-wide calendar showing every dated event already recorded in the app — past and upcoming — so
the owner can see at a glance what happened on a day and what's coming next. It is a **new page**,
reached from the **last (currently empty) slot of the iPhone bottom tab bar**, and from the sidebar on
desktop.

This spec builds the calendar as a **read-only view** over existing data. Creating tasks and the feeding
schedule from the calendar is spec `14`'s job.

## 2. Scope

**In scope**

- A `/calendar` page: month view (default) and a list view, with day detail.
- One shared, pure function that collects events from the existing data sources (Section 3) into a
  single dated list.
- Category filter (Health, Breeding, Births, Herd).
- Navigation placement: the empty last slot of the mobile bottom tab bar, plus a sidebar entry.
- Every event links to where it lives (goat card, Health page, Breeding page).

**Out of scope**

- Creating or editing events from the calendar. Tasks and the feeding schedule come with spec `14`.
- Push notifications (no service-worker push infrastructure exists for this).
- Illness, injury, one-off treatment and checkup records. These stay on each goat's own card, matching
  the rule settled in `UPD-016`.
- A week view (see open questions).
- Any schema change.

## 3. Event sources (reuse existing helpers only)

| Category  | Event                                              | Source / helper to reuse                                           |
| --------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| Health    | Group event done (deworming, dip wash, vaccination) | `health_record_batches` + batch grouping helper from `UPD-016`     |
| Health    | Next due date (group events)                        | Same `UPD-016` helpers, including the "superseded" rule (a superseded event never shows as due) |
| Health    | Next due date (single-goat routine records)         | Existing `dueSoon()` (`lib/dashboard/due-soon.ts`), grouped per day by type + title |
| Breeding  | Males in / males out (logged seasons)               | `breeding_season_occurrences` + `breeding_season_bucks` (`09`)    |
| Breeding  | Upcoming season start (estimate, from templates)    | `computeBreedingReminders()` (`09`), marked as estimate           |
| Breeding  | Expected kidding window (a date range)              | `computeKiddingWindow()` (`09`)                                   |
| Births    | Kids born (per dam per day, litter size)            | `computeKiddingEvents()` (`UPD-012`) + `labelLitterSize()` (`UPD-014`) |
| Herd      | Sale, death, stolen                                 | `herd_events` (written by `recordGoatDeparture`, `UPD-008`)        |

Build **`lib/calendar/events.ts`**:

```ts
export type CalendarCategory = 'health' | 'breeding' | 'births' | 'herd'

export interface CalendarEvent {
  id: string                 // stable, unique across sources (e.g. "batch-12-due")
  category: CalendarCategory
  title: string              // e.g. "Deworming · Routine Deworming"
  subtitle?: string          // e.g. "Does · 58 goats", "Twins · dam MJ02"
  start: Date
  end?: Date                 // only for ranges (expected kidding window)
  isEstimate?: boolean       // breeding estimates, shown as such
  status?: 'done' | 'due' | 'overdue'
  href: string               // where tapping the event goes
}

export function buildCalendarEvents(
  sources: CalendarSources,   // already-fetched rows for the visible range
  rangeStart: Date,
  rangeEnd: Date,
  now: Date,
): CalendarEvent[]
```

- Pure function, no Supabase or React import. It only **combines** the outputs of the existing helpers;
  it must not contain its own due-date, kidding-window or grouping logic.
- This is the "single function gathering due dates across tables" described in
  `architecture-context.md` (Calendar and reminders), so spec `14` can add tasks into it later.
- **Groups, not tag lists:** a group health event is one calendar entry ("Deworming · Does · 58 goats").
  Several single-goat routine items due on the same day with the same type and title collapse into one
  entry ("Vaccination · 3 goats"). A single goat may show its tag (as a goat link), since that's the only
  way to identify it.

## 4. UX / interaction requirements

- **Navigation:** add "Calendar" (lucide `CalendarDays`) to the **last, currently empty slot of the
  mobile bottom tab bar**, matching the existing tab style exactly. Add the same entry to the desktop
  sidebar via `lib/nav.ts`. Confirm there's no leftover calendar stub route; if one exists, replace it.
- **Header:** month and year, previous/next month buttons, a "Today" button, and a Month/List toggle.
- **Month view (default):** a 7-column grid that fits iPhone width with **no horizontal scrolling**.
  Each day shows up to 3 small colored dots by category (Health, Breeding, Births, Herd), with a "+N"
  when there are more. Today is clearly marked. The expected kidding window shows as a subtle shaded
  band across its days, not as dots.
- **Day detail:** tapping a day shows that day's events in a list below the grid (not a modal), grouped
  by category. Each row: title, subtitle, a "Done", "Due", "Overdue" or "Estimate" label where relevant,
  and it links to its `href`.
- **List view:** a chronological agenda from today forward (with a "Show past" option), grouped by day,
  same row design.
- **Category filter:** four toggle chips (Health, Breeding, Births, Herd), all on by default. Applies to
  both views.
- State (month, view, selected day, filters) lives in the URL, so returning from a goat card keeps the
  owner's place.
- Tokens only, radius scale, dark theme, readable dates via the app's existing formatting. Build any
  trigger inside client components (`ERR-001`).

## 5. Data and performance

- **No migration.** Read-only queries, all RLS-scoped.
- Fetch only what the visible range needs (the shown month plus a small margin; for the list view, a
  bounded window such as the next 90 days, extended by "Show past" or scrolling). Don't load the whole
  farm history on every visit.
- Run the source queries in parallel (`Promise.all`), consistent with the dashboard performance work.
- **No new npm dependency.** `architecture-context.md` names `react-big-calendar`, but its month grid is
  cramped on iPhone and adds download weight. Build the lightweight custom grid above instead, and update
  `architecture-context.md` (Stack table and Calendar section) to record this decision.

## 6. Files this unit touches

```
lib/calendar/events.ts                  # buildCalendarEvents() — combines existing helpers only
app/(app)/calendar/page.tsx             # Server Component: fetches the visible range, builds events
components/calendar/month-grid.tsx      # 7-column grid, dots, kidding-window band (client)
components/calendar/day-detail.tsx      # selected day's event list
components/calendar/agenda-list.tsx     # list view
components/calendar/category-filter.tsx # four toggle chips
lib/nav.ts                              # sidebar entry
(bottom tab bar component)              # fill the empty last slot with Calendar
architecture-context.md                 # record the custom-grid decision (replaces react-big-calendar)
```

Do not edit `components/ui/*`.

## 7. Verification (must pass before 13 is `done`)

Build and types: `npm run build` passes; `tsc` clean; no new dependency in `package.json`.

Click-through, on a real iPhone:

1. Calendar appears in the last slot of the bottom tab bar and opens `/calendar`. Desktop sidebar has it too.
2. The month grid fits the screen with no horizontal scroll; today is marked; dots match the categories.
3. The "Does · 58 goats" deworming shows on 2 Sep 2026 as done and on 8 Oct 2026 as due (or overdue),
   as ONE entry, not 58.
4. A logged breeding season shows males in/out; an upcoming template season shows as an estimate; the
   expected kidding window shows as a shaded band.
5. A recent litter shows on its birth date with the litter-size label (e.g. "Twins · dam MJ02").
6. A death or sale shows on its date.
7. Illness/injury/treatment records do NOT appear.
8. Tapping any event opens the right place; coming back keeps the month, view and filters.
9. Filters hide and show categories correctly in both views.
10. No console errors or hydration warnings.

## 8. Roadmap & progress updates — the agent must do these

**On starting 13:** set feature **13** to `in progress` in `feature-specs-roadmap.md` (At a glance +
section) and `progress-tracker.md`. Note it's built ahead of `14`, and that `14` will add tasks and the
feeding schedule into `buildCalendarEvents()`.

**On completing 13** (verified on iPhone): set it to `done`, record it in `progress-tracker.md` (Completed
+ dated Session Notes), and confirm `architecture-context.md` reflects the custom-grid decision.

## 9. Open questions (resolve, don't guess)

- **Week view.** Left out for iPhone simplicity (month + list cover the need). Confirm, or add later.
- **Single-goat routine due dates.** Included (grouped per day) so nothing due is missed. Confirm, or
  limit the calendar to group events only, like the Health page.
- **Kidding window display.** A shaded band across the days. Confirm it reads clearly on iPhone, or
  switch to start/end markers only.
- **"Add" from a day.** Tapping a day could later offer "Add task" (spec `14`) or open Bulk schedule with
  that date pre-filled. Not built now.

## 10. Implementation notes / decisions (2026-10-04)

**Section 9, as built** — each settled by the user's build instructions; all cheap to change after testing:

- **Week view:** not built. Month + list only.
- **Single-goat routine due dates:** included, grouped per day by type + title.
- **Kidding window:** a shaded band across its days, with a one-line legend under the grid. The day detail
  of any day inside the band lists the window with its dates. To be confirmed on a real iPhone.
- **"Add" from a day:** not built.

**Decisions made while building** (one-line reason each):

- **"Routine" means deworming, dip wash and vaccination** — the same three activities the Health page
  treats as routine. A single-goat *checkup* due date is therefore not shown, in line with Section 2
  leaving checkup records out.
- **Several single goats in one entry link to the goats list.** The entry reads "Vaccination · CDT" /
  "3 goats" and cannot name the goats (no tag lists). Since `UPD-019` the dashboard no longer lists
  single-goat due dates either, so there is no page that shows those goats together. **Open for the
  user:** keep it this way, or let the day detail name the goats of a single-goat entry.
  **→ Changed the same day — see Amendment 1 below: the entry now expands to show the goats, and the
  link to the goats list is gone.**
- **An open season (bucks still in) has no window end**, so it shows one "Expected kidding begins" entry
  marked Estimate instead of a band. The band appears once the season has an end date.
  `computeKiddingWindow()` returns no end in that case and the calendar does not invent one.
- **A season's estimated end** (from its template length) shows as an Estimate; a logged end date shows as
  "Males out" and is not repeated as a reminder.
- **Births need a recorded dam.** Litters come from `computeKiddingEvents()`, which is per dam; a kid with
  no dam recorded is not on the calendar.
- **"Stolen"** is a `herd_events` row of type `other_removal` with a goat (how `UPD-008` writes it). A
  goat-less "other removal" / "other addition" is a headcount correction and is not shown.
- **Dots are one per event**, coloured by category, up to 3 then "+N". The kidding window is the band, not
  a dot.
- **Week starts on Monday.**
- **List view:** from today, the next 90 days; "Show past" adds the last 90. An overdue item is in the
  past, so it appears in the list only with "Show past" on (it is always visible in the month view, and
  group ones on the Health page).
  **→ Changed the same day — see Amendment 2 below: overdue items are always at the top of the list.**
- **Group health events and breeding seasons are read whole**, not by range: whether a due date is
  superseded, and where a kidding window falls, depend on rows outside the visible month. Everything else
  is read for the visible range only.
- **Day and filter changes rewrite the URL in place** (no refetch, no extra Back-button stops); month,
  view and "Show past" are ordinary links. Coming back with the browser's Back / swipe keeps the place.
  The goat card's own "Back to Goats" button still goes to the goats list.
  **→ Changed the same day — see Amendment 3 below: the goat card's Back button returns to where the user
  came from.**
- **Files beyond Section 6:** `lib/calendar/view-state.ts` (URL state + day arithmetic),
  `lib/calendar/queries.ts` (the reads), `components/calendar/calendar-view.tsx` (the client shell and
  header), `components/calendar/event-row.tsx` (the shared row), `app/(app)/calendar/loading.tsx`
  (skeleton, per spec 17.3). The tab bar is filled through `components/nav/tab-config.ts`;
  `bottom-tab-bar.tsx` is unchanged.

**Verification so far:** `npx tsc --noEmit`, `npm run build` and lint clean; `package.json` unchanged;
`buildCalendarEvents()` run against sample data. **Not tested in a browser or on an iPhone** — Section 7's
click-through is outstanding and is the user's.

### Amendments requested before the user's test (2026-10-04)

Three fixes asked for by the user after reading the notes above, built the same day. Each replaces the
decision marked "→ Changed" above.

**Amendment 1 — a grouped single-goat entry expands to show its goats.**

- An entry that folds several single goats together ("Vaccination · CDT" / "3 goats") is no longer a link.
  Tapping it expands the row to show those goats as goat links (the shared `GoatLink`), in tag order;
  tapping again closes it. **Collapsed by default — no tag list is on screen until tapped.**
- The link to the general goats list is removed. An entry for exactly one goat still links straight to
  that goat's card, as before.
- Pattern: the chevron + `aria-expanded` expander the Doe Performance list uses. (The Health page's own
  "Show goats" expander was removed in `UPD-016`'s sixth round and was never committed, so the surviving
  expandable row in the app is the one reused.)
- Works the same in the day detail and the list view, since both use one row (`event-row.tsx`).
- Contract change: `CalendarEvent` gained an optional `goats` list, set only on these entries, and
  `href` became optional (absent when the entry expands instead of linking). Section 3's interface
  sketch predates this.

**Amendment 2 — overdue items are always at the top of the List view.**

- The List view opens with an **"Overdue"** section above everything else, each row marked "Overdue"
  (red border, red label) and saying "Was due 1 Aug 2026". Longest overdue first. It shows whether
  "Show past" is on or off, and respects the category chips.
- "Show past" still controls every other past event (things done, litters, departures, seasons).
- An overdue item appears only in the Overdue section, not a second time under its own day.
- **How far back:** the list reads the last 365 days for overdue items (`OVERDUE_LOOKBACK_DAYS` in
  `lib/calendar/view-state.ts`). A bound is needed because the read is by date range; a year is long
  enough for any routine activity. One constant to change.
- **Worth knowing while testing:** "overdue" comes straight from the shared `dueSoon()`. A group event
  stops being overdue once a newer one for the same group replaces it (`UPD-016`'s superseded rule).
  **A single-goat record has no such rule** — its next due date stays overdue even after a newer
  vaccination is logged on that goat's card, until the old record's next due date is cleared. This is
  how the dashboard treated them before `UPD-019`; the calendar adds no rule of its own. If old
  single-goat due dates clutter the Overdue section, a "replaced by a newer record" rule for single
  goats belongs in the shared helper, as its own update spec.

**Amendment 3 — the goat card's Back button returns to where the user came from.**

- The button now reads "Back" and steps back through the browser's history, so the previous page comes
  back exactly as it was left: the Calendar on the same month, view, day and filters; the Health page on
  its tab; Breeding; Doe Performance; another goat's card — with scroll position restored.
- **Fallback:** when there is no in-app page behind the card (opened straight from a link, or the page
  was reloaded) it is an ordinary link to the goats list.
- **Approach, and why not `UPD-008`'s.** `UPD-008` put a `?from=duplicates` marker on the link and had
  the goat page map it to a return route. That does not stretch to "anywhere": every link to a goat in
  the app would have to carry its page's full state, and the Calendar's day and filter choices change
  in place after its links are rendered. So the general case uses history instead:
  `components/nav/in-app-history.tsx` (mounted once in the signed-in layout) notes when the user has
  moved from one in-app page to another, and `components/goats/goat-back-button.tsx` calls
  `router.back()` only then.
- **`UPD-008`'s marker is kept** as the fallback: a goat opened with `?from=duplicates` and no history
  falls back to the duplicates view, and the redirect after removing a goat still uses it. Nothing in
  the duplicates flow changed.
- No linking page was changed; every goat link in the app gets this behavior.

**Verification of the amendments:** `npx tsc --noEmit`, `npm run build` and lint clean. The list-view
logic was run against sample data: an overdue single-goat item from two months back is listed with
"Show past" off, a past sale appears only with it on, and three goats due the same day come out as one
entry carrying K1, K2, K3 and no link. **Not tested in a browser or on an iPhone.** Added to the user's
click-through:

11. In the day detail, tap a "… · 3 goats" entry: it expands to goat links; nothing is listed before the tap.
12. List view with "Show past" off: overdue items are at the top under "Overdue".
13. Open a goat from the Calendar, Health, Breeding and Doe Performance pages in turn; "Back" returns to
    each, and to the same month / day / filters on the Calendar. Open a goat's address directly: "Back"
    goes to the goats list.
