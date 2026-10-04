# 016 — Health Page Rename, Schedule Tab & Dip Wash Category

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-016`                                                          |
| Title             | Rename "Health History" → "Health" with a new Schedule tab; add Dip Wash as a due-date-tracked category |
| Status            | `done` — built 2026-09-27, amended 2026-10-04 (see the Amendment section), **confirmed working by the owner on a real iPhone 2026-10-04** |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `07-health-records`; leaves `15-health-reference` unchanged        |
| Depends on        | `07` (inspect current schema first); `UPD-004` (preset pattern); `12`/`UPD-006` (`lib/dashboard/due-soon.ts`, reused not duplicated) |
| Schema impact     | additive — one new `health_record_type` enum value (`dip_wash`); 2026-10-04 amendment adds table `health_record_batches` + nullable `health_records.batch_id` (shared with `UPD-017`) |
| Created           | 2026-09                                                           |

---

## 1. Reason for update

The sidebar has "Health History" (a stub, never actually built — see Section 2) and "Health Reference"
(the real, built Doctor guide from `15`). There's no place for a third, genuinely different kind of
content: **what's coming up next** — vaccinations, deworming, and now dip wash, each with a due date.
Rather than add a third nav item, the owner wants this folded into the existing two destinations, and the
naming reconsidered now that "History" was never actually built as history in the first place.

## 2. Current behavior

The top-level `/health` route is still the original `module-placeholder.tsx` stub from spec `03`
("Coming soon — this module hasn't been built yet"). It was never replaced. **All real health record
data and CRUD already exist and work correctly — but only as a per-goat tab on each individual goat's own
detail page** (built by `07`). There is no farm-wide, aggregated view across all goats today — that's why
the sidebar's "Health History" has been sitting empty this whole time even though real health records
exist and are already used by the dashboard's Due soon widget, `UPD-004`'s presets, etc. The dashboard's
"Due soon" widget already computes upcoming vaccination/deworming/checkup due dates, but only as a short,
30-day-trimmed preview — there's no dedicated, full planning view either. There is no "dip wash" record
type at all; external parasite control has no way to be logged or scheduled.

## 3. Desired behavior

- **The `/health` stub is replaced with a real, built page for the first time**, labeled **"Health"**
  in the sidebar (not "Health History" — since it never actually existed as a history page, and it will
  hold both past and upcoming content from the start).
- That page has two tabs *(amended 2026-10-04 — originally History + Schedule)*: **Upcoming** — one row
  per group health event that has a next due date, soonest first, overdue at the top — and **Done** — one
  row per group health event already carried out, newest first. Both reuse the existing due-date logic
  rather than rebuilding it.
- **The page shows ONLY group events** *(rule confirmed by the owner 2026-10-04)* — records created
  through Bulk schedule (`health_records.batch_id is not null`, written by `UPD-017`). Anything done to a
  single goat, **routine (deworming, dip wash, vaccination) or not**, is **not** shown on the Health page.
  It stays on that goat's own card (its Health tab, built by `07`), and its next due date stays visible in
  the dashboard's Due soon widget.
- **Every group row shows both what was done and what is next** — date given and next due date together,
  in both tabs.
- **Each tab opens on a short current view**, with older events in an **Archive** *(2026-10-04, fourth and
  fifth rounds)*: Upcoming shows, for each activity and group, its latest next due date; Done shows each
  activity's most recent group event, however old.
- **A superseded group event does not stay overdue** *(2026-10-04, fifth round)*: once a newer group event
  of the same activity has been done for the same group, the older one leaves Upcoming and lives in the
  Archive.
- **Earlier bulk actions are backfilled into batches, once** *(owner-approved 2026-10-04, replacing the
  earlier "no backfill" rule)*, so bulk dewormings / dip washes / vaccinations done before
  `health_record_batches` existed appear on the Health page as group events too. The farm-wide History tab this spec first built was removed
  by the 2026-10-04 amendment.
- **"Health Reference" keeps its name and role unchanged** — confirmed still correct, since it's
  timeless guidance, not date-driven events.
- **Dip wash becomes a real, trackable category** with the same "date administered + next due date"
  pattern already used for vaccination and deworming.

## 4. Scope (in and out)

**In scope**
- Replace the `/health` stub with a real page for the first time, labeled "Health" in the sidebar; build
  the Upcoming / Done tab structure *(amended 2026-10-04)*.
- ~~Build the History tab as a new, farm-wide aggregation of health records.~~ **Removed by the
  2026-10-04 amendment:** the History tab, its aggregated all-goats query and its goat / type filters are
  taken out again.
- *(2026-10-04)* Both tabs show group events only — records with `batch_id = null` are not shown on the
  Health page.
- *(2026-10-04)* A pure grouping helper in `lib/health/` (no Supabase / React import) over the output of
  the shared `dueSoon()` — never a second due-date calculation. **Grouping is by `batch_id` only.**
- *(2026-10-04)* One row design shared by both tabs, with readable dates and "Overdue" / "Due soon" marks.
- *(2026-10-04)* The default view on each tab, and an Archive per tab (full list, newest first,
  filterable by activity).
- *(2026-10-04, fifth round)* Superseding, as a pure helper in `lib/health/`: "same group" = same base
  batch label, ignoring an exclusion suffix such as "(57 of 58)".
- *(2026-10-04, owner-approved)* **A one-off backfill** of earlier bulk actions into batches — dry run
  first, then a recorded SQL file the owner runs. See Section 6.
- *(2026-10-04)* The batch concept itself (table + `health_records.batch_id`), shared with `UPD-017`,
  which writes it.
- *(2026-10-04)* ~~A 30/60/90 lookahead selector~~ — built in the first pass, **removed**: group events
  are few enough to show them all.
- Build the Schedule tab by extending `lib/dashboard/due-soon.ts`'s existing computation (a longer/
  selectable lookahead window, not the dashboard's 30-day trim) — one shared function, not a second
  parallel implementation.
- Add `dip_wash` as a new `health_record_type` value, with the same due-date field pattern as
  vaccination/deworming in the health record form.
- Leave dip-wash presets empty, "+ Add new" available — real product names come from the owner as used,
  not invented here.

**Out of scope**
- Any change to the dashboard's own "Due soon" widget — it stays as a short preview; the new Schedule tab
  is the fuller, dedicated version of the same underlying data, not a replacement for the dashboard widget.
- Any change to `15-health-reference.md`'s scope, naming, or structure — including the Doctor condition
  page's "Your farm's history with this condition" section, which the 2026-10-04 amendment explicitly
  leaves alone.
- Any change to each goat's own Health tab — the per-goat history stays exactly as it is.
- ~~Backfilling existing records into batches — records created before the amendment stay ungrouped.~~
  **Replaced 2026-10-04:** the owner approved a one-off backfill (now in scope above). What stays out of
  scope is any *ongoing* or automatic grouping: after the one-off run, only Bulk schedule creates batches.
- Turning a single-goat record into a group. A set of matching records covering only one goat is not a
  group and is never touched by the backfill.
- *(2026-10-04)* Grouping or showing single-goat records (`batch_id = null`) on the Health page, even if
  several share the same date and product.
- *(2026-10-04)* Any change to `UPD-017`'s bulk schedule dialog (group filters, live count,
  exclude-by-typing-tag).
- Inventing specific dip-wash product presets.

## 5. UX / interaction requirements

- Sidebar label is **"Health"** (the old "Health History" stub label is retired — it never held real
  content). Same route (`/health`), no new nav entry.
- That page is tabbed: **Upcoming** (the default) and **Done** *(amended 2026-10-04; the original
  History and Schedule tabs are gone, and a stale `?tab=history` / `?tab=schedule` link falls back to
  Upcoming)*. Both tabs show group events only (`batch_id is not null`).
- **Row design — the same in both tabs** *(2026-10-04)*: every group row clearly shows BOTH what was done
  and what is next.
  - Line 1: record type · title (e.g. "Deworming · Routine Deworming") and the product (e.g. "Nilvasol
    1L") if one was recorded.
  - Line 2: "Done 2 Sep 2026 · Next due 8 Oct 2026" and the group label with goat count (e.g. "Does (57 of
    58)").
  - If no next due date was set: "Next due: not set".
  - Readable dates (e.g. "2 Sep 2026"), not raw ISO dates.
- **Activities** = deworming, dip wash, vaccination *(2026-10-04, fourth round)*.
- **Groups only, everywhere on the page** *(restated 2026-10-04, fifth round)*: both tabs and the Archive
  show only group events (`batch_id is not null`), each labelled with its group label exactly as it was
  created ("Does", "Kids · Barn 2", "Does (57 of 58)") plus the goat count. No goat tag in any row — no
  "1 goat · 021" style rows and no tag lists. Single-goat records appear nowhere on the page.
- **Superseded events** *(fifth round)*: an older group event is superseded once a newer group event of
  the same activity has been done for the same group. "Same group" = same base batch label, ignoring an
  exclusion suffix like "(57 of 58)". Superseded events do not appear in Upcoming and are never marked
  Overdue; they stay in the Archive.
- **Upcoming tab, default view** *(fifth round — replaces the fourth round's "one row per activity")*:
  for each activity and group, its latest non-superseded next due date. Overdue at the top marked
  **"Overdue"**; due within 7 days marked **"Due soon"**. No lookahead selector.
- **Done tab, default view** *(fifth round — replaces the fourth round's 30-day window)*: for each
  activity, its most recent group event, **however old**. Older ones go to the Archive. A line such as
  "No group deworming yet" appears only when an activity has never had a group event.
- **Archive:** an "Archive" link on each tab shows the full list (all upcoming / all done, including older
  events), newest first, filterable by activity. Same row design.
- **No goat tag lists on this page.** ~~A row may expand to show its goats, collapsed by default.~~
  *(Changed by the owner 2026-10-04, sixth round:)* the "Show goats" expander is removed. A row names
  **only the goats that were excluded** from that bulk action ("Excluded: 021"), and only when there
  were any.
- **Grouping is by `batch_id` only.** Single-goat records (`batch_id = null`) are not grouped and not
  shown, even if several share the same date and product.
- **Dip wash** appears everywhere vaccination/deworming already do: as a record type option in the health
  record form (same date-given + next-due-date fields), on the goat's own Health tab, on the dashboard's
  Due soon widget, and — when given as a bulk action — on the Health page's Upcoming / Done tabs.
- No change to `/doctor`'s pages or labeling.

## 6. Domain / data / API requirements

**Migration** (additive, standalone statement — adding a value to an existing enum has transaction
visibility quirks in Postgres, run it on its own, not combined with other DDL in the same file, same
caution as the earlier `goat_status` → `stolen` addition):

```sql
alter type health_record_type add value if not exists 'dip_wash';
```

- Extend the health record form's conditional field logic so `dip_wash` uses the same field set as
  `vaccination`/`deworming` (date given, next due date) rather than the treatment-course fields.
- Extend `lib/dashboard/due-soon.ts`'s function to accept a configurable lookahead window (defaulting to
  the dashboard's existing 30 days when called from there, and a longer default like 90 days when called
  from the new Schedule tab) and to include `dip_wash` alongside the record types it already covers.
  *(Amended 2026-10-04: the Schedule tab and its lookahead options are gone; the Upcoming tab calls the
  same function with an open-ended window.)*
- ~~No new table.~~ *(Amended 2026-10-04)* One new table, `health_record_batches` (`id`, `owner_id`,
  `label`, `created_at`), and a nullable `health_records.batch_id` FK to it (`on delete set null`) —
  standard conventions (bigserial id, `owner_id` default `auth.uid()`, single "for all" RLS policy).
  Written by `UPD-017`'s bulk action; read here. Records created one at a time keep `batch_id = null`.
  ~~No backfill.~~ *(Replaced 2026-10-04 — see the one-off backfill below.)*
- **One-off backfill (owner-approved 2026-10-04), dry run first:**
  - *Step A — dry run, read only.* Among `health_records` with `batch_id is null` and `record_type` in
    deworming / dip_wash / vaccination, a candidate group = records with the same record type + title +
    product + date given + next due date covering **2 or more different goats**. A set with only one goat
    is not a group and stays untouched. `created_at` is extra evidence: one bulk action's records were
    created together, so each candidate is reported as created within a few seconds or spread out.
    Proposed label: the shared stage or sex if all goats in the group share one ("Does", "Kids"),
    otherwise "N goats". The candidate list is reported to the owner, and nothing proceeds without
    approval.
  - *Step B — only after approval.* A one-off SQL file in `supabase/migrations/` creates one
    `health_record_batches` row per approved group and sets `batch_id` on its records. The owner runs it
    in the SQL editor. It must be safe to run twice: no duplicate batches, no change to records that
    already have a `batch_id`.
- The grouping helper is pure, in `lib/health/` (no Supabase / React import): it folds the **output** of
  `dueSoon()` into one row per batch and skips anything without a batch.
- Regenerate `types/database.types.ts` after each migration.

## 7. Safety and data integrity rules

- No RLS change for `dip_wash` — it rides on `health_records`' existing owner-scoped policy. The
  amendment's new `health_record_batches` table has RLS enabled with its own owner policy before anything
  reads or writes it.
- The enum addition must not break existing rows or the record-type switch logic for the other types —
  confirm the form's conditional rendering still works correctly for illness/injury/treatment/checkup
  after adding this new branch.

## 8. Acceptance criteria

- [ ] The `/health` stub is replaced with a real page; sidebar shows "Health"; the page has exactly two
      tabs, **Upcoming** and **Done** *(amended 2026-10-04)* — the History tab is gone.
- [ ] *(2026-10-04)* A bulk action shows as **one** row in Upcoming and **one** row in Done, each with
      both "Done …" and "Next due …" visible, the product, and the group label with its goat count; dates
      are readable ("2 Sep 2026").
- [ ] *(2026-10-04)* Upcoming is soonest first; an overdue group event is at the top marked "Overdue", and
      one due within 7 days is marked "Due soon". The due dates come from the same underlying logic as the
      dashboard's Due soon widget (not a duplicated implementation).
- [ ] *(2026-10-04)* A group event with no next due date reads "Next due: not set".
- [ ] *(2026-10-04, fifth round)* Upcoming's default view shows, for each activity and group, its latest
      non-superseded next due date; no goat tags in any row.
- [ ] *(2026-10-04, fifth round)* Done's default view shows each activity's most recent group event
      regardless of age; "No group … yet" only when the activity has never had one.
- [ ] *(2026-10-04, fifth round)* After a newer group event of the same activity is done for the same
      group, the older one leaves Upcoming, is not marked Overdue, and is found in the Archive.
- [ ] *(2026-10-04)* The Archive on each tab shows the full list, including older events, newest first,
      and can be filtered by activity.
- [ ] *(2026-10-04)* After the approved backfill is run, earlier bulk actions appear as single group rows
      with sensible labels; single-goat records were not turned into groups and still do not appear on
      the Health page; running the backfill a second time changes nothing.
- [ ] *(2026-10-04, sixth round)* No row lists the goats in its group and there is no "Show goats"
      expander; a row whose bulk action excluded goats shows "Excluded: …" with those goats' tags.
- [ ] *(2026-10-04)* A single-goat record — including a routine deworming, dip wash or vaccination — with
      a next due date does **not** appear on the Health page, **does** appear on that goat's card, and
      **does** appear in the dashboard's Due soon widget.
- [ ] Dip wash can be logged with a date given and a next due date, exactly like vaccination/deworming.
- [ ] Dip wash presets start empty with "+ Add new" available.
- [ ] "Health Reference" is completely unchanged.
- [ ] The dashboard's own Due soon widget still works exactly as before, now also surfacing dip wash.
- [ ] Each individual goat's own Health tab (built by `07`) is completely unaffected — this update adds a
      farm-wide view on top, it does not change per-goat record entry.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the
migration.

**Manual (user flow)** *(amended 2026-10-04; to be checked on a real iPhone)* — open `/health` and
confirm it's a real page (not the stub) with only the Upcoming and Done tabs; bulk-schedule a deworming
for a group and confirm it shows as ONE row in Upcoming and in Done, with both "Done …" and "Next due …"
visible, the product, and the group label; confirm a bulk event due within 7 days shows "Due soon", and an
overdue one shows "Overdue" at the top; confirm a single-goat deworming does NOT appear on the Health
page, but does appear on that goat's card and in the dashboard's Due soon widget; confirm each goat's own
Health tab still works exactly as before and `/doctor` is untouched. **After the backfill is approved and
run:** confirm earlier bulk actions now appear as single group rows with sensible labels; confirm
single-goat records were NOT turned into groups and still don't appear on the Health page; confirm
Archive shows the full lists, including older events. **Fifth round (backfill now run):** Upcoming
shows one row — Deworming · Routine Deworming · Nilvasol 1L, "Done 2 Sep 2026 · Next due 8 Oct 2026",
"Does · 58 goats" — with NO goat tags; Done shows that same deworming by default, not only in the
Archive; no single-goat record appears on either tab; bulk-schedule a test deworming for Does (and remove
it afterwards) and confirm the 2 Sep event leaves Upcoming and moves to the Archive while the new one is
the row shown in both tabs.

## 10. Related spec files

- Renames/extends: the page built under `07-health-records.md`.
- Reuses, extended not duplicated: `lib/dashboard/due-soon.ts` (`12`/`UPD-006`).
- Explicitly unchanged: `context/feature-specs/15-health-reference.md`.

## Amendment — 2026-10-04 (shared with `UPD-017`)

*(A fifth round followed the four described next: superseded events, Done's default without a 30-day
limit, and a reported goat-tag bug — see items 6a–6c below and Section 11.)*

*This amendment went through four rounds on the same day, each from the owner's testing: (1) tabs
"Schedule" / "Group actions" with ungrouped single-goat rows still listed and a 30/60/90 selector;
(2) group events only, in "Upcoming" / "Done" tabs; (3) the rule below confirmed for routine single-goat
records too, and one row design showing both what was done and what is next; (4) a one-row-per-activity
default view with an Archive, and an owner-approved one-off backfill of earlier bulk actions. What follows
is the final state; where the rounds differ, the latest wins.*

**Rule (confirmed by the owner):** the Health page shows ONLY group events — records created through Bulk
schedule (`batch_id is not null`). Anything done to a single goat, routine (deworming, dip wash,
vaccination) or not, is NOT shown on the Health page. It stays on that goat's own card, and its next due
date stays visible in the dashboard's Due soon widget.

1. **Batch concept** so a bulk action can be shown as one group event: table `health_record_batches` and
   nullable `health_records.batch_id` (migration `20261004000001_health_record_batches.sql`). `UPD-017`'s
   bulk action writes it; see that spec's amendment.
2. **The farm-wide History tab is removed** — the tab, its aggregated all-goats query and its filters.
3. **Two tabs, both group events only** (`batch_id is not null`), with the same row design: **Upcoming**
   (next due date, soonest first; overdue at the top marked "Overdue"; due within 7 days marked "Due
   soon"; no lookahead selector) and **Done** (all group events, newest date given first). No goat tag
   lists; a row may expand to show its goats, collapsed by default.
4. **Row design:** line 1 = record type · title, plus the product if recorded; line 2 = "Done 2 Sep 2026 ·
   Next due 8 Oct 2026" and the group label with goat count; "Next due: not set" when there is none;
   readable dates.
5. **Grouping is by `batch_id` only**, in a pure helper in `lib/health/` that reuses the existing
   due-date logic. Single-goat records are never grouped or shown, even if several share a date and
   product.
6. **Default view and Archive:** Upcoming opens on each activity's next group event plus every overdue
   one; Done opens on each activity's latest group event from the last 30 days, or "No group … in the
   last month". Each tab has an Archive with the full list, newest first, filterable by activity.
   - **6a (fifth round).** Upcoming's default is now "for each activity and group, its latest
     non-superseded next due date", not one row per activity.
   - **6b (fifth round).** Done's default is each activity's most recent group event however old; "No
     group … yet" only when there has never been one.
   - **6c (fifth round).** An older group event is superseded by a newer one of the same activity for the
     same group (same base label, exclusion suffix ignored); superseded events leave Upcoming, are never
     Overdue, and stay in the Archive.
7. **One-off backfill — approved by the owner 2026-10-04, replacing the earlier "no backfill" rule.**
   **Run by the owner 2026-10-04** (`20261004000002_backfill_health_record_batches.sql`, label "Does").
   Dry run first; a recorded, re-runnable SQL file only after the owner approves the candidate list.
   Only sets of 2 or more goats become groups.
8. **Must stay unchanged:** each goat's own Health tab (full history, all record types, including
   single-goat routine records); `UPD-017`'s bulk schedule dialog; `/doctor`, including "Your farm's
   history with this condition"; and the dashboard's Due soon widget, which must still show single-goat next-due items
   since those no longer appear on the Health page. The widget's behaviour after a large bulk action is
   reported in Section 11, not changed.

Sections 3–9 above were updated in place to match; the original History-tab wording is struck through or
marked "amended" rather than deleted. This amendment reverses two Section 14 decisions from 2026-09-27:
the History tab's goat / record-type filters (the tab is gone) and the Schedule tab's 30/60/90 lookahead
(the selector is gone).

## 11. Implementation note

Built 2026-09-27. Task 1 confirmed the correction this build was scoped on: `app/(app)/health/page.tsx`
was still `<ModulePlaceholder title="Health History" />` from spec `03`, with `loading.tsx` pointing at
`SkeletonModulePlaceholder`. The only real file at that route was `actions.ts` — the per-goat health
server actions, which live there by path convention but are called from each goat's detail page. So this
was a first build, not a rename.

**What changed**

- **Migration** — `supabase/migrations/20260927000003_health_record_type_dip_wash.sql`, one statement
  (`alter type health_record_type add value if not exists 'dip_wash'`), standalone for the same
  transaction-visibility reason as `20260830000001` (`goat_status` → `stolen`). Nothing in this update
  writes a `dip_wash` row from SQL, so unlike that precedent there is no follow-up migration.
  `types/database.types.ts` carries a hand-added `dip_wash` stand-in (appended last in both the union and
  the `Constants` array, which is where Postgres reports a value added by `ALTER TYPE`), pending the
  owner applying the migration and re-running `npm run gen:types`.
- **`lib/health/records.ts`** — `dip_wash` added to `HEALTH_RECORD_TYPES`, to `FOLLOW_UP_RECORD_TYPES`
  and to the label map ("Dip Wash"). That is the whole of Section 6's conditional-field requirement: the
  form, the server-side field validation and the due-date logic all read these constants, so **no change
  to `health-record-form-dialog.tsx` or `actions.ts`' field parsing was needed** — dip wash gets the
  date-given + next-due-date pair and is never offered the medication/course fields, because
  `isCourseType('dip_wash')` is false. Deliberately **not** given deworming's product combobox: Section 6
  specifies the vaccination/deworming *date* pattern, and vaccination has no product field either. Easy
  to add later if the owner wants to record which dip was used.
- **`lib/dashboard/due-soon.ts`** — extended, not duplicated. `dueSoon()` already accepted `windowDays`,
  so the extension is the Schedule tab's side of it: `SCHEDULE_DUE_WINDOW_DAYS = 90`,
  `DUE_WINDOW_OPTIONS = [30, 60, 90]` and `parseDueWindow()` (an unrecognised `?window=` falls back to
  90, so a hand-edited URL cannot select a window the selector cannot show). The function needed no
  change for `dip_wash`: it is type-agnostic, considering every record that carries a `next_due_date`.
  The dashboard's `DueSoonSection` is untouched and still passes `DEFAULT_DUE_SOON_WINDOW_DAYS` (30).
- **`lib/health/queries.ts`** — four new farm-wide reads, the first in the codebase not scoped by
  `goat_id`: `listFarmHealthRecordsPage` / `listFarmHealthRecordsFirstPage`, `countFarmHealthRecords`
  (head-only, so "Show more" disappears at the right moment) and `listFarmDueHealthRecords` (which maps
  rows into `dueSoon()`'s existing `DueSoonSourceRecord` shape rather than inventing one). The goat is
  embedded via `goats!inner(id, tag, name)`, so the whole page is one query — spec 17.2 §5C, the same
  shape the Doctor history read uses. RLS scopes all four exactly as every other read of this table.
- **`app/(app)/health/page.tsx`** — the real page, replacing the stub: an `h1` "Health", the tab bar,
  and one of two async sections. `loading.tsx` replaced the generic module-placeholder skeleton with a
  page-shaped one (title, tab bar, control row, list), still inside `SkeletonRegion` so the `LoadingDots`
  indicator stays visible.
- **New components** — `health-tabs.tsx` (two links; a plain server component, with the active tab
  passed in as a prop rather than read with `useSearchParams`, which keeps `loading.tsx` free of a
  search-param dependency a route-level fallback cannot satisfy), `farm-health-filters.tsx`,
  `farm-health-record-list.tsx`, `health-schedule-list.tsx`, `schedule-window-select.tsx`.
- **`lib/nav.ts`** — label "Health History" → "Health". Same route, no new nav entry.

**Deliberately unchanged:** each goat's own Health tab and `components/health/health-record-list.tsx`
(still the only place a record is created, edited or deleted — the farm-wide list is read-only and links
to the goat, so there is exactly one write path); the dashboard's Due soon widget; everything under
`/doctor` and feature `15`'s naming and structure.

**View state in the URL** (the project's standing convention): `?tab=history|schedule`, `?goat=`,
`?type=` and `?window=`, all read from the page's `searchParams` and pushed with `router.push`, so the
exact view survives tapping a goat and coming back. Switching tabs drops the other tab's params on
purpose — each tab owns its own view state.

### Amendment build — 2026-10-04

*(Describes the final state after all three rounds. Files that only existed between rounds —
`lib/health/group-due-items.ts`, `lib/health/batch-summary.ts`, `health-upcoming-list.tsx`,
`health-batch-list.tsx` — were folded into the two files named below and are not listed as removals.)*

**Removed:** `components/health/farm-health-filters.tsx`, `components/health/farm-health-record-list.tsx`,
`components/health/health-schedule-list.tsx`, `components/health/schedule-window-select.tsx`; the History
reads in `lib/health/queries.ts` (`listFarmHealthRecordsPage`, `listFarmHealthRecordsFirstPage`,
`countFarmHealthRecords`, `listFarmDueHealthRecords`, `FarmHealthFilters`, `FarmHealthRecord`); the
`loadMoreFarmHealthRecords` server action; and the lookahead-selector exports this spec had added to
`lib/dashboard/due-soon.ts` (`SCHEDULE_DUE_WINDOW_DAYS`, `DUE_WINDOW_OPTIONS`, `DueWindowOption`,
`parseDueWindow`). Nothing else imported any of them. The "What changed" notes above describing the
History and Schedule tabs are kept as the record of the first build.

**Changed / added**

- **Migration** — `supabase/migrations/20261004000001_health_record_batches.sql`: creates
  `health_record_batches` (bigserial id, `owner_id` default `auth.uid()`, `label`, `created_at`), enables
  RLS with one "for all" owner policy, adds nullable `health_records.batch_id` with an explicitly named FK
  (`on delete set null`), and indexes `owner_id` and (partially) `batch_id`. Additive and idempotent; no
  backfill. `types/database.types.ts` carries a hand-added stand-in for the table, the column and the
  relationship until the owner applies the migration and re-runs `npm run gen:types`.
- **`components/health/health-tabs.tsx`** — tabs are `upcoming` (default) and `done`; any other `?tab=`
  value, including an old `?tab=history` or `?tab=schedule` link, falls back to Upcoming.
- **`lib/dashboard/due-soon.ts`** — `dueSoon()`'s logic is untouched. Four optional pass-through fields
  (`product`, `dateOccurred`, `batchId`, `batchLabel`) were added to its source record and item; they are
  copied through and play no part in what is due or when. The dashboard's caller does not supply them and
  is unaffected.
- **`lib/health/group-events.ts`** (new, pure — imports types only) — one `GroupEvent` row shape for both
  tabs, and the two functions that build it:
  - `upcomingGroupEvents()` folds `dueSoon()`'s per-goat output into **one row per `batchId`**, skips any
    item without a batch, and sorts soonest first (so overdue is at the top). It sets the row's mark from
    `dueSoon()`'s own day count: negative → "Overdue"; 0–7 days (`GROUP_DUE_SOON_DAYS`) → "Due soon".
  - `doneGroupEvents()` builds one row per batch from the batch's records, newest date given first, and
    drops a batch with no records left.
  - Every record in a batch starts identical, but one can later be edited on its goat's own card. Each
    field of a row therefore takes the value most of the batch's records still share: a single corrected
    goat neither splits the row (grouping stays by batch only) nor rewrites it, and that goat is still
    counted in its group. Its own card shows its own dates. *(Round 2 split such a goat into its own row;
    round 3's "by `batch_id` only" replaced that.)*
  - `formatIsoDate` ("2 Sep 2026"), read off the ISO string so the server's timezone cannot shift a day.
- **`lib/health/queries.ts`** — `listBatchDueHealthRecords` (records with a next due date **and** a
  batch, with title, product, date given and the embedded batch label, mapped into `dueSoon()`'s input
  shape) and `listHealthBatches` (the 50 most recently created batches, each with its records and their
  goats in one query). The single-goat exclusion therefore holds twice: in the query and in the pure
  helper.
- **Upcoming tab** — `dueSoon()` is called with an open-ended window (`windowDays: Infinity`), which is
  how "show them all" is done without a second calculation; cancelled records are still dropped and the
  day counts still come from that one function.
- **`components/health/health-group-event-list.tsx`** (new) — the single row design both tabs render.
  Line 1: type badge, title, then the product when there is one, with the "Overdue" (red, plus a red row
  border) or "Due soon" (amber) mark at the right. Line 2: "Done 2 Sep 2026 · Next due 8 Oct 2026" — or
  "Next due: not set" — and "Does (57 of 58) · 57 goats", wrapping onto a second line on a narrow phone.
  The marks appear on Upcoming only; Done rows carry the same lines without them.
- **`components/health/group-goats-disclosure.tsx`** (new) — the optional "Show goats" expander both
  tabs share: a native `<details>`, closed by default, no client JavaScript.
- **`app/(app)/health/page.tsx`** and **`loading.tsx`** — two tabs; view state is now `?tab=` only.

**Deliberately unchanged:** each goat's own Health tab and `components/health/health-record-list.tsx`;
everything under `/doctor`, `components/doctor/`, `lib/doctor/`; the dashboard's Due soon widget and its
query (`components/dashboard/`, `lib/dashboard/queries.ts`), which still reads every record with a next
due date regardless of batch — so single-goat follow-ups keep appearing there.

**Fourth round — default view and Archive (built 2026-10-04).** All in the same pure file and the same
page; no new query.
- `lib/health/group-events.ts` gained `GROUP_ACTIVITIES` (deworming, dip wash, vaccination),
  `nextUpcomingPerActivity()` (keeps every overdue event, then the first not-overdue event per activity,
  preserving the soonest-first order), `recentDonePerActivity()` (per activity, the newest event whose
  date given is within `GROUP_DONE_RECENT_DAYS = 30` days, else `null`; always one entry per activity, in
  activity order), `filterByActivity()`, `newestDueFirst()` and `parseGroupActivity()`.
- `app/(app)/health/page.tsx` — each tab renders its default view, an "Archive — all …" link beneath it,
  and (with `?view=archive`) the full list with a "← Back to …" link. View state is `?tab=`,
  `?view=archive` and `?activity=`, all in the URL.
- `components/health/health-archive-filter.tsx` (new) — All / Deworming / Dip Wash / Vaccination as plain
  links; a server component, no client JavaScript.
- **"Newest first" in the Upcoming Archive** is read as the latest next due date at the top and the
  longest-overdue at the bottom. The Done Archive is newest date given first.
- **Upcoming's default view has no "nothing scheduled" line per activity** — the instruction asked for
  that line on Done only; an activity with nothing upcoming simply has no row.
- `HEALTH_BATCH_LIST_LIMIT` raised from 50 to 200 so the Done Archive really is the full list at this
  farm's scale; a note appears only if that cap is ever reached.

**Fourth round — one-off backfill: approved, dry run NOT yet run, nothing written.** The dry run needs to
read the owner's `health_records`, and this environment has only the public anon key and no sign-in — RLS
returns no rows — so it could not be run here. A read-only `select` implementing Step A exactly (the
five-field match, 2-or-more-goats rule, `created_at` spread, and the proposed label from the goats'
shared stage — worked out as of the date given, with the same age thresholds as `lib/goats/stage.ts` — or
shared sex, else "N goats") was handed to the owner to run in the Supabase SQL editor and report back.
**No backfill SQL file exists yet and no data has been changed**; Step B waits for the owner's approval of
the candidate list.

**Dry-run result (run by the owner, 2026-10-04) — one candidate group:** deworming · Routine Deworming ·
Nilvasol 1L · given 2026-09-02 · next due 2026-10-08 · 58 goats · proposed label "Does" · created
together (0 seconds apart). This is the example record from the third round: a bulk action done before
batches existed, which is why it had `batch_id = null` and was missing from the Health page.

**Step B file written:** `supabase/migrations/20261004000002_backfill_health_record_batches.sql`. It
converts exactly that one group (matched on the five fields, `batch_id is null`, 2 or more goats) into one
batch labelled "Does", with the batch's `created_at` taken from the records and `owner_id` set explicitly
(the SQL editor has no signed-in user for the `auth.uid()` default). Re-running it finds no ungrouped
match and changes nothing. It is not a general grouping statement — every other record is untouched.
**Not run from here and not tested against a database**; the owner runs it, and running it is the
approval. Expected effect: one "Due soon" row on Upcoming (due 8 Oct); on Done it is older than 30 days,
so the default view shows "No group deworming in the last month" and the event is in the Done Archive.

**Fifth round (built 2026-10-04) — after the owner ran the backfill.**
- **Reported bug: goat tags on Upcoming. Cause — not reproduced in the current code.** The two code paths
  the report describes did exist, in the **first round** of this amendment only: `groupDueItems` grouped
  non-batch records by type + product + due date, and `health-schedule-list.tsx` had a single-goat
  fallback that rendered a lone goat's tag as a link. Both were deleted in the second and third rounds
  (the files no longer exist). In the code as it stands, the only component on the Health page that
  renders a tag is `GroupGoatsDisclosure` — the "Show goats" expander, a native `<details>` closed by
  default — and both reads filter on `batch_id is not null`, with the pure helper skipping unbatched items
  a second time. No leftover path was found to remove. The most likely explanation for tags still being
  seen is a **stale copy of the page**: the service worker (`public/sw.js`, spec 17.1) serves a cached
  copy of a visited page first and refreshes it in the background, so the installed app can show a
  previous version of `/health` once before the new one arrives. This is an inference, not a confirmed
  cause — the page could not be viewed from this environment.
- **Superseding** — `lib/health/group-events.ts`: `baseGroupLabel()` strips a trailing "(N of M)";
  `supersededBatchIds()` takes every group event and returns those that are not the newest for their
  activity + base label (newest = latest date given; on the same date, the later-recorded batch);
  `currentUpcoming()` drops them from the default view; `flagSuperseded()` keeps them in the Upcoming
  Archive with the overdue / due-soon mark cleared and a muted "Replaced by a newer one" tag. The Upcoming
  tab now reads the batch list as well as the due records, because an event is superseded by what was
  done later whether or not that later event has a next due date.
- **Label-based matching — limits reported to the owner rather than guessed around:** (1) a partial
  action supersedes the whole group — "Does (3 of 58)" retires the earlier 58-doe event although 55 does
  were not treated again; (2) the same goats reached by different filters do not match — "Does" vs
  "Females" vs "All goats" are different labels; (3) a label is stored text, so renaming a barn means
  "Kids · Barn 2" no longer matches later "Kids · New name" events. Built exactly as specified; the
  owner decides whether (1) should require a full-group action.
- **Done default** — `latestDonePerActivity()` replaces the 30-day `recentDonePerActivity()`; the empty
  line reads "No group deworming yet".
- **Upcoming default** — `currentUpcoming()` replaces `nextUpcomingPerActivity()`.
- **No way to delete a group event in the app.** The owner's test plan says to bulk-schedule a test
  deworming and delete it afterwards; the app can only delete a record from each goat's own card, one
  goat at a time. Not built here (out of this instruction's scope) — reported to the owner with a SQL
  alternative.

**Sixth round (built 2026-10-04) — "Show goats" removed; excluded goats shown instead.** The owner
confirmed the page is good and asked for the expander to go, with a row naming only the goats excluded
from the group.
- `components/health/group-goats-disclosure.tsx` deleted. `health-group-event-list.tsx` renders a third
  line, "Excluded: 021 034" (each tag a `GoatLink`), only when the batch has excluded goats.
- A batch stored only its label, i.e. how many were excluded, not which. **New additive migration
  `20261004000003_health_record_batches_excluded_goats.sql`** adds
  `health_record_batches.excluded_goat_ids bigint[] not null default '{}'` (no RLS change; hand-added
  to `types/database.types.ts`). `UPD-017`'s dialog now submits the ids of its exclusion chips in one more
  hidden field (no visible change to the dialog), and `bulkCreateHealthRecords` stores them after
  re-reading them under RLS and dropping any id that is actually receiving a record.
- `excludedGoatsByBatch()` (pure, `lib/health/group-events.ts`) resolves the ids to goats from the
  already-cached herd list; an id whose goat no longer exists is skipped.
- **Batches created before this column exist with an empty list**, so they show no "Excluded" line even
  if their label says "(57 of 58)". The backfilled 2 Sep "Does" batch had no exclusions. Nothing is
  guessed for older batches.
- Until the migration is run, the page shows its red "could not be loaded" message and Bulk schedule
  fails, because both now use the new column.
- `tsc` / `build` clean, lint at baseline; not tested in a browser or on an iPhone.

### Final state as shipped (2026-10-04)

A summary of what is actually in the app, after all six amendment rounds. The round-by-round notes above
and below are kept as the record of how it got here; where they differ from this summary, this is what
shipped.

- **The Health page (`/health`, sidebar label "Health") shows group events only** — records created
  through Bulk schedule (`health_records.batch_id is not null`). Anything done to a single goat, routine
  or not, is not on this page; it stays on that goat's own card and its next due date stays on the
  dashboard's Due soon widget.
- **Two tabs, one row design.** Line 1: record type · title, plus the product if recorded. Line 2: "Done
  2 Sep 2026 · Next due 8 Oct 2026" (or "Next due: not set") and the group label with its goat count.
  Line 3, only when goats were left out of the action: "Excluded: 021".
  - **Upcoming** (default tab): for each activity and group, its latest non-superseded next due date,
    soonest first. Overdue at the top marked "Overdue"; due within 7 days marked "Due soon".
  - **Done**: each activity's (deworming, dip wash, vaccination) most recent group event, however old;
    "No group … yet" only when an activity has never had one.
  - **Archive** on each tab: the full list, newest first, filterable by activity, including older and
    superseded events.
- **Superseded events are never overdue.** A group event is superseded once a newer one of the same
  activity is done for the same group (same base label, an exclusion suffix like "(57 of 58)" ignored).
  It leaves Upcoming and stays in the Archive, flagged "Replaced by a newer one".
- **No goat tags.** No row lists the goats in its group and there is no expander. The only tags a row can
  show are the goats excluded from that bulk action.
- **One due-date calculation.** Upcoming calls the same `dueSoon()` as the dashboard widget
  (`lib/dashboard/due-soon.ts`, logic unchanged); `lib/health/group-events.ts` (pure) only folds its
  output into one row per batch and applies the superseding and default-view rules.
- **Dip wash** is a real record type with the date-given + next-due-date pair (the original 2026-09-27
  build, unchanged).
- **Migrations** (all applied by the owner): `20260927000003_health_record_type_dip_wash.sql`;
  `20261004000001_health_record_batches.sql` (batch table + `health_records.batch_id`);
  `20261004000002_backfill_health_record_batches.sql` (the owner-approved one-off backfill — it grouped
  the 58-goat Routine Deworming · Nilvasol 1L of 2 Sep 2026 as "Does");
  `20261004000003_health_record_batches_excluded_goats.sql` (`excluded_goat_ids` on the batch).
- **Files as shipped:** `app/(app)/health/page.tsx` + `loading.tsx`;
  `components/health/health-tabs.tsx`, `health-group-event-list.tsx`, `health-archive-filter.tsx`;
  `lib/health/group-events.ts`, `lib/health/batch-label.ts`; `listBatchDueHealthRecords` and
  `listHealthBatches` in `lib/health/queries.ts`. Removed along the way: the farm-wide History tab and
  its reads, the Schedule tab's 30/60/90 selector, and the "Show goats" expander.
- **Unchanged throughout:** each goat's own Health tab, everything under `/doctor`, and the dashboard's
  Due soon widget.

**Point 1 of the third round — the example record** ("Deworming · Routine Deworming · 2026-09-02 ·
Nilvasol 1L · Next due 2026-10-08" on a goat card, absent from the Health page). **Not confirmed against
the database**: this environment has only the public anon key and no sign-in, so RLS returns no rows and
the record's `batch_id` could not be read. What the code establishes: `batch_id` is written in exactly one
place, `bulkCreateHealthRecords` (`app/(app)/health/actions.ts`); `createHealthRecord` and
`updateHealthRecord` — the goat card's paths — never set it, and the migration backfills nothing. So a
record entered on a goat's card, or any record (bulk or not) created before the migration was applied,
has `batch_id = null`, and its absence from the Health page is the intended rule, not a bug. No code path
was found that would hide a record that does have a `batch_id`: the Upcoming read filters only on
"`next_due_date` and `batch_id` not null", and `dueSoon()` drops only cancelled records. The owner can
settle it with one query in the Supabase SQL editor:
`select id, title, date_occurred, medication_name, next_due_date, batch_id from health_records where
record_type = 'deworming' and date_occurred = '2026-09-02' and next_due_date = '2026-10-08';` — a null
`batch_id` confirms the single-goat case; a number there would be a bug to investigate.

**Dashboard "Due soon" widget — finding (reported, not changed).** Yes: after a bulk action on a large
group, the widget lists every goat as a separate row. `DueSoonSection` passes `dueSoon()`'s per-goat items
straight to `DueSoonList`, which renders one row per item with no grouping and no cap. So a bulk deworming
of 57 does produces 57 rows in the card — but only once the shared next due date is within the widget's
30-day window (or overdue); before that the card shows none of them. With the dashboard's barn filter on,
only that barn's goats are counted. If grouping is wanted there, `upcomingGroupEvents()` cannot be reused as it
stands — it deliberately drops single-goat items, which the widget must keep — so the widget would need
its own fold (batch rows collapsed, single-goat rows left as they are) and its query would need to select
`batch_id` and the batch label. Left for the owner's decision.

## 12. Verification evidence

**Automatic (done 2026-09-27):** `npx tsc --noEmit` clean; `npm run build` clean, with `/health` listed
as a dynamic route; `npm run lint` at project baseline (the one pre-existing `hooks/use-mobile.ts` error
and five pre-existing `_prev` warnings — none of this update's files appear). `package.json` /
`package-lock.json` diff empty. `git status` confirmed nothing under `app/(app)/doctor/`,
`components/doctor/`, `lib/doctor/` or `context/feature-specs/15-health-reference.md` was touched, so
feature `15` is unaffected by construction.

**Shared due-date logic, unit-checked** against a copy of `lib/dashboard/due-soon.ts` with a fixed `now`
of 2026-09-27 and six records (dip wash at +20 and +75 days, vaccination at +45, deworming 5 days
overdue, checkup at +200, and a cancelled dip wash at +10):

| Window                | Items returned                  |
| --------------------- | ------------------------------- |
| 30 (dashboard)        | overdue deworming, dip wash +20 |
| 60                    | + vaccination +45               |
| 90 (Schedule default) | + dip wash +75                  |

The overdue deworming sorts first with `daysUntilDue: -5`; the cancelled dip wash never appears; the
checkup at +200 is outside every offered window. `parseDueWindow` returned 30/60/90 for those values and
fell back to 90 for `"45"`, `""`, `"abc"` and `undefined`. This is one function serving both callers —
the windows nest, so the dashboard's 30-day preview can never disagree with the Schedule tab.

**Not verified here — the owner's hands-on test (Section 9):** the app is auth-gated, so the aggregated
History list against real records, logging a real dip wash, the filters, the window selector and the
dashboard widget still showing dip wash within 30 days all need the owner's click-through. The migration
must be applied first.

**Amendment — automatic (done 2026-10-04):** `npx tsc --noEmit` clean; `npm run build` clean with
`/health` still a dynamic route; `npm run lint` at project baseline (the one pre-existing
`hooks/use-mobile.ts` error and five pre-existing `_prev` warnings — none in this amendment's files).
`git status` shows nothing under `app/(app)/doctor/`, `components/doctor/`, `lib/doctor/`,
`components/dashboard/`, `lib/dashboard/queries.ts` or the per-goat `health-record-list.tsx` /
`health-record-form-dialog.tsx`.

**Amendment — pure logic, unit-checked** with a fixed date of 2026-10-04: a 57-goat batch "Does (57 of
58)" given 2 Sep and due 8 Oct, with one doe's date later edited to 20 Oct; a batch due 11 Oct (exactly 7
days); a batch due 12 Oct (8 days); a batch due Aug 2027 with no product; an overdue batch with one live
and one cancelled record; and two single-goat routine dewormings sharing the 57-goat batch's exact date
and product. Upcoming result: five rows in order — the overdue batch ("Overdue", 1 goat, cancelled record
dropped); "Routine Deworming · Nilvasol 1L | Done 2 Sep 2026 · Next due 8 Oct 2026 | Does (57 of 58)" as
**one** row of 57 goats marked "Due soon"; the 7-day batch marked "Due soon"; the 8-day batch unmarked;
the 2027 batch unmarked with no product. Neither single-goat record appears in any row or is merged into
the matching batch. The same `dueSoon()` called the dashboard's way (30 days) still returns both
single-goat items. Done: newest date given first, an empty batch dropped, a blank product treated as
none, a missing next due date kept as "not set", goats sorted by tag.

**Fourth round — automatic (2026-10-04):** `npx tsc --noEmit` and `npm run build` clean; lint at project
baseline. Default-view logic unit-checked: with two overdue dewormings, a dip wash due soon, two later
dewormings, a later dip wash and a vaccination, Upcoming's default keeps both overdue rows plus one row
each for dip wash, deworming and vaccination (5 of 7); the Upcoming Archive lists all 7 by latest due date
first; the activity filter returns only that activity. For Done with today = 4 Oct 2026: the newest
deworming and vaccination in the window are chosen, a dip wash done 31 days ago is excluded (so the "No
group dip wash in the last month" line shows) and one done exactly 30 days ago is included.

**Fifth round — automatic (2026-10-04):** `npx tsc --noEmit` and `npm run build` clean; lint at project
baseline. Unit-checked: base label ("Does (57 of 58)" → "Does"; "Kids · Barn 2 (3 of 10)" → "Kids · Barn
2"; "Barn (old)" unchanged). With the backfilled "Does" deworming of 2 Sep alone, nothing is superseded
and it is the Upcoming row and Done's deworming row. Adding a "Does (57 of 58)" deworming on 4 Oct
supersedes the 2 Sep one: it leaves the default Upcoming view, is flagged in the Archive with no Overdue
mark, and the new event is the row in both tabs. A "Kids" deworming and a "Does" dip wash are unaffected
(different group / different activity). Two same-day events for one group: the later batch wins.

**Amendment — not verified here:** nothing was tested in a browser or on an iPhone. The app is auth-gated
and this environment has no sign-in and no device, so the owner's real-iPhone checklist is still entirely
open. The migration must be applied first — until it is, the Upcoming and Done tabs read a table and a
column that do not exist yet and will show as empty.

**Owner's hands-on test — passed, 2026-10-04.** The owner tested on a real iPhone across the amendment
rounds and confirmed UPD-016 working: after running the backfill, the earlier bulk deworming appears as a
single group row ("Does", 58 goats) with both "Done …" and "Next due …" visible; the Done tab shows it by
default; no single-goat record appears on the page; after the fifth round the owner reported the page as
good, and after the sixth ("Show goats" removed, excluded goats shown) confirmed it working. This is the
verification gate for this spec — the agent's own checks were build, type check, lint and unit checks of
the pure helpers only, never a browser or device.

**Resolved along the way:** the third round's example record (Routine Deworming, 2 Sep 2026) was
confirmed by the dry run to be a bulk action done before batches existed — 58 does, created in the same
second, `batch_id` null — which is why it was missing from the Health page until the backfill. The goat
tags the owner reported on Upcoming were not reproducible in the code and did not recur; a stale cached
copy of the page remains the likeliest explanation, unconfirmed.

## 13. Resolution / final state

**`done` — confirmed by the owner on a real iPhone, 2026-10-04.**

The `/health` stub is replaced by a real page showing **group health events only**: Upcoming and Done
tabs, the latest event per activity by default, an Archive for older ones, superseded events never
overdue, and no goat tags beyond the goats excluded from a bulk action. Dip wash is a trackable record
type. The owner-approved one-off backfill `20261004000002_backfill_health_record_batches.sql` grouped
the earlier 58-goat deworming as "Does". See "Final state as shipped" in Section 11 for the detail.

This differs from the spec's original Section 3 in two deliberate ways, both decided by the owner during
testing: there is no farm-wide History tab (a goat's own card is the place for its history), and there
is no Schedule tab listing every goat's due dates (the dashboard's Due soon widget covers single-goat
follow-ups).

**Carried forward, not blocking:** the two items left open in Section 14 — whether the dashboard's Due
soon widget should group a bulk action's goats into one row, and whether a partial bulk action should
supersede a whole group's event. `UPD-017` (the Bulk schedule dialog that writes these batches) is still
`in progress` on its own owner test.

## 14. Open questions (resolve, don't guess)

- **Dip-wash product names.** Left empty by design — the owner will add real products via "+ Add new" as
  used, the same pattern as the original drug list in `UPD-005`.
- **Schedule tab default lookahead.** Proposed 90 days as the default (vs. the dashboard's 30).
  **Confirmed by the owner 2026-09-27:** 90-day default, with a 30 / 60 / 90 selector. Longer windows
  (180 / 365) were offered and not taken — easy to add later, since the options are one array
  (`DUE_WINDOW_OPTIONS`) and `parseDueWindow` reads it.
  **Superseded 2026-10-04:** the lookahead selector was removed by the amendment; the Upcoming tab shows
  every group event with a next due date.
- **History tab filters** (Section 5 left these optional — "a plain chronological list is the minimum
  bar"). **Confirmed by the owner 2026-09-27:** build both, goat and record type, held in the URL.
  **Superseded 2026-10-04:** the History tab and its filters were removed by the amendment.
- **Backfill candidate list** *(opened 2026-10-04)*. The dry run returned one group (58 does, Routine
  Deworming, 2 Sep 2026). **Resolved 2026-10-04:** the owner ran
  `20261004000002_backfill_health_record_batches.sql` with the label "Does".
- **Should a partial bulk action supersede the whole group's event?** *(opened 2026-10-04, still open —
  not blocking.)* As built and accepted, "Does (3 of 58)" supersedes an earlier whole-"Does" event,
  because the exclusion suffix is ignored when matching groups. Two other limits of label matching are
  recorded in Section 11. Revisit as a new update spec if it causes trouble in use.
- **Dashboard Due soon widget after a bulk action** *(opened 2026-10-04; **taken up by `UPD-019`**,
  `019-dashboard-due-soon-groups.md`, the same day — the widget now shows group events only)*. It lists every goat of a bulk
  action as a separate row once the due date is inside its 30-day window (finding in Section 11). The
  amendment deliberately does not change it; the owner decides whether it should be grouped too.
