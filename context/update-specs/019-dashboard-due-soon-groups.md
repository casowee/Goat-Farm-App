# 019 — Dashboard "Due soon" Shows Group Events Only

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-019`                                                          |
| Title             | Dashboard "Due soon" widget shows upcoming group health events only — one row per group, no goat tags |
| Status            | `done` — approved by the owner and built 2026-10-04; confirmed by the owner 2026-10-04 |
| Owner approved?   | yes (2026-10-04)                                                   |
| Feature spec(s)   | `12-dashboard-analytics`; touches the widget `09-breeding` extended |
| Depends on        | `UPD-016` (group events, `lib/health/group-events.ts`), `UPD-017` (Bulk schedule writes the batches), `UPD-006` (dashboard redesign) |
| Schema impact     | none                                                               |
| Created           | 2026-10-04                                                         |

---

## 1. Reason for update

The dashboard's Due soon widget lists every goat separately by tag. After a group deworming that means
one row per goat — 58 rows for one bulk action — which buries everything else on the card. The Health
page (`UPD-016`) already settled how routine group care should read: upcoming **group events** only, one
row per group, no goat tags. The widget should match it. Triggered by the finding recorded in `UPD-016`
§11 and left open in its §14.

## 2. Current behavior

The Due soon card (feature `12` / `UPD-006`, extended by feature `09`'s breeding reminders) is built by
`components/dashboard/sections/due-soon-section.tsx`. It reads every `health_records` row with a
`next_due_date` for the barn-filtered goats (`listDueHealthRecords`), runs the shared `dueSoon()` with a
30-day window (overdue included), and hands the per-goat result to `DueSoonList`, which renders **one row
per goat** — the goat's name or tag as a link, then "type · title" — with no grouping and no cap. Breeding
"bucks in / bucks out" reminders are merged into the same list.

## 3. Desired behavior

- The widget's health rows are **group events only** — records created through Bulk schedule
  (`batch_id is not null`) — one row per group, the same rows the Health page's Upcoming tab shows.
- **No goat tags anywhere in the widget.**
- Single-goat records (`batch_id is null`) no longer appear in the widget. They remain on each goat's own
  card and in the Calendar (spec `13`).
- Breeding reminders stay in the widget exactly as they are.
- The 30-day window stays (overdue always shown). A long list is cut to 5 with a "See all" link to the
  Health page's Upcoming tab.

## 4. Scope (in and out)

**In scope**
- The health side of the Due soon widget: its read, its rows, the 5-row cap and the "See all" link.
- Reusing `UPD-016`'s helpers in `lib/health/` for the batch grouping and for "latest non-superseded event
  per activity and group".

**Out of scope**
- Any new grouping or due-date logic — none is written; `dueSoon()` and `lib/health/group-events.ts` are
  reused as they are.
- The breeding reminders (males in / males out, feature `09`) — unchanged. They are farm-level, not goat
  tags.
- The Health page (`UPD-016`), the Calendar spec (`13`), and each goat's own Health tab — unchanged.
- The Bulk schedule dialog (`UPD-017`).
- Any schema change.

## 5. UX / interaction requirements

- **Health row content, same as the Health page:** "Deworming · Routine Deworming" plus the product if
  one was recorded; the group label with goat count (e.g. "Does · 58 goats"); and the next due date as a
  readable date ("8 Oct 2026").
- **Marks:** overdue rows at the top marked "Overdue"; rows due within 7 days marked "Due soon".
- **No goat tags** and no link to an individual goat in a health row.
- **Breeding reminder rows** look and behave exactly as before, including the "Approve season" action.
- **Window:** the existing 30 days ahead; overdue is always shown.
- **More than 5 rows:** show the first 5 and a **"See all"** link to the Health page's Upcoming tab
  (`/health?tab=upcoming`). See Section 11 for how the cap treats breeding reminders.
- Empty state unchanged: "Nothing due in the next 30 days."
- The card's description reads "Group health events and breeding reminders due in the next 30 days."

## 6. Domain / data / API requirements

- **Schema impact: none.** No migration, no generated-types change.
- The widget reads `listBatchDueHealthRecords()` and `listHealthBatches()` (`lib/health/queries.ts`, both
  from `UPD-016`), runs the shared `dueSoon()` with `DEFAULT_DUE_SOON_WINDOW_DAYS` (30), and folds the
  result with `upcomingGroupEvents()`, `supersededBatchIds()` and `currentUpcoming()` from
  `lib/health/group-events.ts`.
- No new pure logic and no new query. The dashboard's own per-goat `listDueHealthRecords()` is no longer
  used.

## 7. Safety and data integrity rules

- Read-only change; nothing is written.
- RLS is unchanged — both reads are owner-scoped exactly as on the Health page.
- No health record is hidden from the app: a single-goat record is still on its goat's own card.
- Must not break the breeding reminders or the dashboard's fetch parallelism (`UPD-011`).

## 8. Acceptance criteria

- [ ] After a group deworming, the widget shows it as ONE row ("Does · 58 goats") with its next due date.
- [ ] No goat tag appears anywhere in the widget.
- [ ] A health row shows the record type, title, product (if recorded), group label with goat count, and
      a readable next due date.
- [ ] An overdue group event is at the top marked "Overdue"; one due within 7 days is marked "Due soon".
- [ ] A group event that a newer one of the same activity for the same group has superseded does not
      appear.
- [ ] A single-goat next-due record no longer appears in the widget, but still appears on that goat's own
      card.
- [ ] Breeding reminders still appear in the widget, unchanged.
- [ ] Only events due within 30 days (or overdue) are shown.
- [ ] With more than 5 group rows, 5 are shown and "See all" opens the Health page's Upcoming tab.
- [ ] The Health page, the Calendar and each goat's own Health tab are unchanged.

## 9. Verification required — automatic and manual

**Automatic**
- `npm run build` passes; `npx tsc --noEmit` clean; lint at project baseline.

**Manual (user flow)** — on a real iPhone:
- The dashboard Due soon widget shows the group deworming as ONE row ("Does · 58 goats") with its next
  due date, and no goat tags anywhere in the widget.
- A single-goat next-due record no longer appears in the widget, but still appears on that goat's card.
- Breeding reminders still appear in the widget.
- With more than 5 rows, "See all" opens the Health page's Upcoming tab.

## 10. Related spec files

- `context/feature-specs/12-dashboard-analytics.md` — the dashboard and its Due soon widget.
- `context/update-specs/006-dashboard-redesign-and-herd-population.md` (`UPD-006`) — the dashboard
  redesign the widget sits in.
- `context/feature-specs/09-breeding.md` — the breeding reminders merged into the widget (unchanged).
- `context/update-specs/016-health-schedule-and-dip-wash.md` (`UPD-016`) — group events and the helpers
  reused here; this resolves the widget question left open in its §14.
- `context/update-specs/017-bulk-health-scheduling.md` (`UPD-017`) — Bulk schedule, which creates the
  batches.
- `context/feature-specs/13-calendar.md` — where single-goat due dates are shown farm-wide (unchanged by
  this spec).

## 11. Implementation note

Built 2026-10-04.

- **`components/dashboard/sections/due-soon-section.tsx`** — the health side now reads
  `listBatchDueHealthRecords()` + `listHealthBatches()` and computes
  `currentUpcoming(upcomingGroupEvents(dueSoon(records, { windowDays: 30 })), supersededBatchIds(doneGroupEvents(batches)))`.
  Every function in that line already existed; only the 30-day window differs from the Health page's
  open-ended one. Superseding is judged over **all** group events, not only those in the window, so an
  old overdue event that a newer one has replaced does not reappear here. The reads run in the same
  `Promise.all` as the breeding panel.
- **`components/dashboard/due-soon-list.tsx`** — health rows are built from `GroupEvent` instead of the
  per-goat `DueSoonItem`: no goat link, the group label and count as the second line, and the mark plus
  a readable date on the right. Breeding rows keep their exact previous markup and relative wording
  ("Due in 12 days"). `DUE_SOON_HEALTH_ROW_LIMIT = 5`.
- **`lib/dashboard/queries.ts`** — the per-goat `listDueHealthRecords()` is removed; nothing else used it.
- **Barn filter — kept as it was.** The health side of this widget has always been scoped to the
  dashboard's barn filter. That is preserved: with a barn selected, a group event is shown if any of its
  goats are in that barn, and its count is of those goats (so "Does · 20 goats" in one barn's view of a
  58-doe action). With "All barns" it is the whole group.
- **Decision — the 5-row cap applies to the group health rows; breeding reminders are never cut.** The
  instruction was "if more than 5 rows, show the first 5 and a See all link to the Health page's
  Upcoming tab". The Health page does not show breeding reminders, so a reminder cut from the widget
  would be reachable nowhere from "See all" — and the same instruction says to keep breeding reminders
  exactly as they are. So the widget shows the 5 soonest group events plus every breeding reminder, and
  "See all" appears when there are more than 5 group events. Flagged to the owner.
- **"See all" shows a superset.** The Health page's Upcoming tab has no 30-day limit and no barn filter,
  so it lists the hidden rows and also later ones.
- **Checkups** are single-goat records, so they no longer appear in the widget; the card description no
  longer mentions them.
- **Calendar (spec `13`) was still `in progress`** in a separate piece of work and was not touched (it is `done` as of 2026-10-04, so single-goat due dates are now on the Calendar too). Until
  it ships, a single-goat due date is visible on that goat's own card only. Flagged to the owner.

## 12. Verification evidence

**Automatic (2026-10-04):** `npx tsc --noEmit` clean; `npm run build` clean; `npm run lint` at project
baseline (the one pre-existing `hooks/use-mobile.ts` error and five pre-existing `_prev` warnings — none
in this update's files). No new pure logic was written, so there is nothing new to unit-check; the reused
helpers were unit-checked under `UPD-016`.

**Not verified here:** nothing was tested in a browser or on an iPhone — the app is auth-gated and this
environment has no sign-in and no device. The owner's four iPhone checks in Section 9 are all open.

**Owner confirmation (2026-10-04):** after the build was pushed, the owner asked for `UPD-019` to be marked done. That instruction is recorded as the owner's acceptance of the Section 9 checks; they were not performed from this environment.

## 13. Resolution / final state

`done` 2026-10-04. The dashboard's Due soon widget shows upcoming **group** health events only — one row per group, no goat tags, the same rows as the Health page's Upcoming tab — plus the unchanged breeding reminders. Single-goat due dates are on each goat's own card and on the Calendar (spec `13`). No migration. Shipped in commit `8d1b64f`.
