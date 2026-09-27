# 016 — Health Page Rename, Schedule Tab & Dip Wash Category

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-016`                                                          |
| Title             | Rename "Health History" → "Health" with a new Schedule tab; add Dip Wash as a due-date-tracked category |
| Status            | `in progress` — built 2026-09-27, awaiting the owner's hands-on test |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `07-health-records`; leaves `15-health-reference` unchanged        |
| Depends on        | `07` (inspect current schema first); `UPD-004` (preset pattern); `12`/`UPD-006` (`lib/dashboard/due-soon.ts`, reused not duplicated) |
| Schema impact     | additive — one new `health_record_type` enum value (`dip_wash`)    |
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
- That page has two tabs: **History** — a **new**, farm-wide aggregation of the health records that
  already exist per-goat (built by `07`), now shown together across the whole herd for the first time —
  and **Schedule** — a full, farm-wide list of everything with an upcoming due date (vaccination,
  deworming, dip wash, and checkup if it already tracks a next-due date), reusing the existing due-soon
  computation rather than rebuilding it, with a longer lookahead than the dashboard's 30-day preview.
- **"Health Reference" keeps its name and role unchanged** — confirmed still correct, since it's
  timeless guidance, not date-driven events.
- **Dip wash becomes a real, trackable category** with the same "date administered + next due date"
  pattern already used for vaccination and deworming.

## 4. Scope (in and out)

**In scope**
- Replace the `/health` stub with a real page for the first time, labeled "Health" in the sidebar; build
  the History/Schedule tab structure.
- Build the History tab as a **new, farm-wide aggregation** of health records that already exist per-goat
  (`07`'s data is correct and complete — this is a new query/view bringing them together across all
  goats, RLS-scoped, not a change to how records are created or stored per-goat).
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
- Any change to `15-health-reference.md`'s scope, naming, or structure.
- Inventing specific dip-wash product presets.

## 5. UX / interaction requirements

- Sidebar label is **"Health"** (the old "Health History" stub label is retired — it never held real
  content). Same route (`/health`), no new nav entry.
- That page is now tabbed: **History** (new — farm-wide, aggregated across every goat's existing health
  records) and **Schedule** (new).
- **History tab:** every health record across every goat, RLS-scoped, newest first — filterable by goat
  and/or record type if that's straightforward to add alongside the aggregation; a plain chronological
  list is the minimum bar.
- **Schedule tab:** a farm-wide list of upcoming due items — vaccination, deworming, dip wash, checkup —
  sorted soonest-first, each showing the goat (clickable, reuse the goat-link component), the type, and
  the due date. A lookahead-window control (e.g. 30/60/90 days) rather than a fixed 30-day cutoff, since
  this is the dedicated planning view, not a quick glance.
- **Dip wash** appears everywhere vaccination/deworming already do: as a record type option in the health
  record form (same date-given + next-due-date fields), in the History tab's record list, and in the new
  Schedule tab.
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
- No new table. Regenerate `types/database.types.ts` after the migration.

## 7. Safety and data integrity rules

- No RLS change — `dip_wash` rides on `health_records`' existing owner-scoped policy.
- The enum addition must not break existing rows or the record-type switch logic for the other types —
  confirm the form's conditional rendering still works correctly for illness/injury/treatment/checkup
  after adding this new branch.

## 8. Acceptance criteria

- [ ] The `/health` stub is replaced with a real page; sidebar shows "Health"; the page has History and
      Schedule tabs.
- [ ] History tab correctly aggregates real health records from every goat into one farm-wide,
      newest-first list — this is genuinely new, since no farm-wide view existed before.
- [ ] Schedule tab shows upcoming vaccination/deworming/dip-wash/checkup items farm-wide, with a
      selectable lookahead window, sourced from the same underlying logic as the dashboard's Due soon
      widget (not a duplicated implementation).
- [ ] Dip wash can be logged with a date given and a next due date, exactly like vaccination/deworming.
- [ ] Dip wash presets start empty with "+ Add new" available.
- [ ] "Health Reference" is completely unchanged.
- [ ] The dashboard's own Due soon widget still works exactly as before, now also surfacing dip wash.
- [ ] Each individual goat's own Health tab (built by `07`) is completely unaffected — this update adds a
      farm-wide view on top, it does not change per-goat record entry.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the
migration.

**Manual (user flow)** — open `/health` and confirm it's a real page (not the stub) showing every goat's
health records aggregated in the History tab; log a dip wash record with a next due date on a real goat
and confirm it appears there, in the new Schedule tab, and on the dashboard's Due soon widget within its
30-day window; change the Schedule tab's lookahead window and confirm the list updates correctly; confirm
existing vaccination/deworming/illness/injury/treatment/checkup records (already logged per-goat) all show
up correctly in the new aggregated History tab; confirm each goat's own Health tab still works exactly as
before.

## 10. Related spec files

- Renames/extends: the page built under `07-health-records.md`.
- Reuses, extended not duplicated: `lib/dashboard/due-soon.ts` (`12`/`UPD-006`).
- Explicitly unchanged: `context/feature-specs/15-health-reference.md`.

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

## 13. Resolution / final state

*(fill when done)*

## 14. Open questions (resolve, don't guess)

- **Dip-wash product names.** Left empty by design — the owner will add real products via "+ Add new" as
  used, the same pattern as the original drug list in `UPD-005`.
- **Schedule tab default lookahead.** Proposed 90 days as the default (vs. the dashboard's 30).
  **Confirmed by the owner 2026-09-27:** 90-day default, with a 30 / 60 / 90 selector. Longer windows
  (180 / 365) were offered and not taken — easy to add later, since the options are one array
  (`DUE_WINDOW_OPTIONS`) and `parseDueWindow` reads it.
- **History tab filters** (Section 5 left these optional — "a plain chronological list is the minimum
  bar"). **Confirmed by the owner 2026-09-27:** build both, goat and record type, held in the URL.
