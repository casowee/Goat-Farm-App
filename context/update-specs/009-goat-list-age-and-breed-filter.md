# 009 — Goat List: Age Instead of Status, Active-by-Default, Breed Filter

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-009`                                                          |
| Title             | Replace Status column with Age; default list to Active; add Status and Breed filters |
| Status            | `done` — built + owner-verified in the running app 2026-08-30      |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `05-goat-profiles`                                                |
| Depends on        | `UPD-008` (search/filter/reasoned-removal, done); `06-family-tree` (breed composition — confirm final shape before building the breed filter) |
| Schema impact     | none expected — read/filter only; confirm during Task 1           |
| Created           | 2026-08                                                           |

---

## 1. Reason for update

Now that `UPD-008` gives goats a real status history (Sold/Death/Stolen preserve the record rather than
deleting it), showing "Status" as a bare column on the everyday goats list adds little — the owner's
working list is really about the **current, active herd**. Age is far more useful to see at a glance day
to day. But status must remain reachable, not disappear — it's history, not deleted data.

## 2. Current behavior

The goats list shows a Status column (Active/Sold/Deceased/Stolen) on every row, no Age column, and no
Breed filter. All goats (any status) appear together with no default scoping.

## 3. Desired behavior

- The **Status column is removed** from the list; an **Age column** takes its place.
- The list **defaults to showing Active goats only** — this is a display default, not a data
  restriction; nothing is hidden permanently.
- A new **Status filter** (default: Active) lets the owner deliberately switch to Sold / Death / Stolen /
  All when they want to see historical goats — preserving exactly what `UPD-008` was for.
- A new **Breed filter** is added alongside the existing Sex/Stage/Barn/Search filters from `UPD-008`.

## 4. Scope (in and out)

**In scope**
- Remove the Status column from the goats list; add an Age column.
- Default the list's Status filter to **Active**; add Sold/Death/Stolen/All as explicit alternatives.
- Add a Breed filter, built against whatever the actual current breed schema is (see Task 1).
- Extend `filterGoats()` (`UPD-008`) with `status` and `breed` dimensions rather than writing a parallel
  filter function.
- **Fix herd-count/composition logic to be active-only, unconditionally.** Testing surfaced that a sold
  goat was still counted in the dashboard's Total Goats figure and composition breakdown
  (`lib/dashboard/herd-composition.ts`, from spec `12`/`UPD-006`). This must count **active goats only**,
  regardless of any filter state anywhere in the app — it's the same "what counts as the active herd"
  principle this update is built around, even though the affected code lives in the dashboard module,
  not the goats list module. Fix it at the source, not as a display-layer patch.

**Out of scope**
- Any change to the goat detail page, which can continue to show status explicitly.
- Any change to `UPD-008`'s reasoned-removal flow itself — this only changes how the **list** surfaces
  and filters the result.
- Any schema change, unless Task 1 finds a genuine gap (e.g. filtering a composition table needs a join
  the current query doesn't do) — note it if so, but don't assume one is needed.

## 5. Task 1 — Confirm the current breed schema before building the filter (do this first)

`06-family-tree.md`'s Task 7 proposed migrating breed from the two-column model to a multi-breed
composition (a child table or JSON), but left the final shape as an open question. **Inspect
`types/database.types.ts` directly** to determine what actually exists now — a single `breed` column, the
two-column primary/secondary model, or a `goat_breed_composition` child table — and build the filter
against the real shape, not an assumption. Note what you find in Implementation Note.

## 6. UX / interaction requirements

- **List columns:** replace Status with **Age** (e.g. "5 months", "1y 4m" — pick a clear, simple format;
  see open questions). Keep everything else in the row as-is.
- **Filters row:** Search, Sex, Stage, **Breed** (new), Barn, **Status** (new, default **Active**) — all
  combine (AND), consistent with `UPD-008`'s existing filter behavior.
- **Breed filter options** should be derived from the breeds actually present in the owner's data (not a
  hardcoded list), so an "Other"-typed custom breed still shows up as a real filter option.
- If a goat is a cross (per whatever composition shape Task 1 finds), it should match the Breed filter
  for **either** component breed, not only its primary — e.g. a Boer/Somali cross should appear when
  filtering by "Boer" or by "Somali" (confirm — see open questions).
- Switching the Status filter to Sold/Death/Stolen/All must correctly reveal those goats without a page
  reload delay beyond what the existing filters already have (this stays client-side over the
  already-fetched, RLS-scoped goat list, same as the rest of `UPD-008`'s filters — no new query pattern).

**Amendment — 2026-08-30 (added during testing): Age-column sort toggle.**

- The **Age column header itself is a sort toggle** — a small clickable arrow icon beside the word
  "Age", not a new control in the filter bar. Clicking it cycles: no sort → **oldest → youngest** →
  **youngest → oldest** → no sort. A chevron shows the current direction (down = oldest first, up =
  youngest first, a faint up/down chevron when unsorted).
- This is a **sort, not a filter** — it only reorders the currently-visible rows and hides nothing.
- The sort is applied **on top of** whatever Search / Sex / Stage / Breed / Barn / Status filters are
  active (it reorders the filtered result, never the full list), and it sorts on the **numeric age in
  months** (`ageInMonths()`), never on the formatted `"1y 4m"` label.
- No phone equivalent of a table header exists, so the same toggle is surfaced once above the phone
  card list (it is the *same* control rendered responsively, not a second control elsewhere) — the
  owner commonly works from a phone and must still be able to reorder by age.
- Stays entirely client-side over the already-fetched list, same as every other `UPD-009` control.

## 7. Domain / data / API requirements

- `lib/goats/age.ts` — `formatAge(months: number): string`, built on the existing `ageInMonths()` from
  `lib/goats/stage.ts` (reuse, don't duplicate the age calculation).
- Extend `lib/goats/search.ts`'s `filterGoats()` (from `UPD-008`) to accept:
  ```ts
  status?: GoatStatus | 'all'   // default applied by the UI layer as 'active', not hardcoded inside this pure function
  breed?: string                // matches any component breed if the goat is a cross
  ```
  Keep it pure — no Supabase/React import, consistent with every other `lib` function in this project.
- No migration expected. If Task 1 reveals the breed filter genuinely needs a join (e.g. a composition
  child table not already included in the list page's fetch), extend that query — but this is a read
  change, not a schema change.

## 8. Safety and data integrity rules

- **This is a display/filter default, not a data or access change.** Sold/Death/Stolen goats remain
  fully present, fully queryable, and fully visible via the Status filter — the point of `UPD-008` (never
  silently lose history) must not be undermined by this update. If anything in this change makes a
  non-active goat harder to find than intended, that's a regression, not an acceptable trade-off.
- No RLS change; no new tables.

## 9. Acceptance criteria

- [ ] Status column is gone from the list; Age column shows correctly for a range of ages (a young kid,
      an adult).
- [ ] The list defaults to Active goats only.
- [ ] The Status filter correctly reveals Sold/Death/Stolen goats, and "All" shows everything.
- [ ] The Breed filter's options reflect actual data (including any custom "Other" breed present), and a
      crossbred goat matches on either component breed.
- [ ] All filters (search, sex, stage, breed, barn, status) combine correctly together.
- [ ] No regression to `UPD-008`'s duplicate-detection or reasoned-removal flows.
- [ ] The dashboard's Total Goats count and composition/donut breakdown count **active goats only**,
      unconditionally — confirmed independent of whatever Status filter is currently selected on the
      goats list page (the two are separate, and the dashboard count must never include departed goats).

**Amendment — 2026-08-30 (added during testing): Age-column sort toggle.**

- [ ] The Age column header has a sort toggle (a small arrow icon). Clicking it cycles unsorted →
      oldest-first → youngest-first → unsorted, with a chevron indicating the current direction.
- [ ] Toggling the sort **reorders** the visible list by real age (months) and drops no rows — a young
      kid and an old doe swap ends correctly in both directions, and `"11 months"` sorts as younger
      than `"1y 0m"` (i.e. it is not sorted as text).
- [ ] The sort respects the active filters — with Status = All and a Breed filter set, only the
      matching goats are shown, and they are the ones being reordered.
- [ ] The toggle is reachable and works on a phone (surfaced above the card list), not desktop-only.

## 10. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean.

**Manual (user flow)** — confirm the default list shows only active goats with an Age column, no Status
column. Mark a goat Sold via the existing removal flow, confirm it disappears from the default view, then
confirm it reappears when the Status filter is set to Sold or All. Filter by a breed that a crossbred
goat carries as its secondary component and confirm it still matches. Combine several filters at once and
confirm the result is correct. **Separately, confirm the dashboard's Total Goats figure and composition
donut immediately drop by one the moment a goat is marked Sold/Deceased/Stolen** — this must hold true
regardless of what the goats list page's own Status filter happens to be set to at the time.

## 11. Related spec files

- Extends: `context/feature-specs/05-goat-profiles.md`, `context/update-specs/008-goat-search-filter-duplicate-and-reasoned-removal.md` (`filterGoats()` is extended, not replaced).
- Depends on the actual outcome of: `context/feature-specs/06-family-tree.md` Task 7 (breed composition shape) — confirm via Task 1 above rather than assuming.

## 12. Implementation note

**Task 1 — breed schema shape (confirmed by inspecting `types/database.types.ts`, not assumed).**
Breed is stored as the **`goat_breed_composition` child table** — one row per breed component of a goat:
`{ id, owner_id, goat_id, breed: text, pct: numeric(6,3), created_at }`, FK `goat_id` → `goats(id)`
`on delete cascade`, its own `for all` owner RLS policy. Plus a **denormalised `goats.breed`** text
column kept as a "primary breed" (highest-share) label for quick display. This is the
`06-family-tree.md` Task 7 outcome — the child table was chosen there over a JSON column and over the
old two-column (`breed` + `breed_secondary` + `breed_primary_pct`) model, which was dropped in
migration `20260828000003`. **No extra join was needed:** `app/(app)/goats/page.tsx` already embeds
`breed_composition:goat_breed_composition(breed, pct)` in the list query, so the Breed filter runs
client-side over data already fetched. No migration, no schema change for `UPD-009`.

**Age-format wording (open question 1 — confirmed by the owner).** `lib/goats/age.ts` `formatAge(months)`:
under a year → `"5 months"` / `"1 month"`; a year or more → `"1y 4m"`, or `"2y"` when the remainder is
0. The age *calculation* is not duplicated — the list computes whole months once via the existing
`ageInMonths()` from `lib/goats/stage.ts` and passes the number in. The wordier `formatAge(dateOfBirth)`
local to the goat **detail** page (`"1 year, 4 months old"`) was deliberately left untouched — a
different, verbose phrasing, and the detail page is out of `UPD-009`'s scope.

**`filterGoats()` extension (`lib/goats/search.ts`).** `GoatFilters` gained `status?: GoatStatus | 'all'`
and `breed?: string`; `FilterableGoat` gained `status: string` and an optional `breed_composition`.
`GoatStatus` is a local union (`'active' | 'sold' | 'deceased' | 'stolen'`), matching how `stage.ts`
keeps `GoatSex`/`GoatStage` local so the module stays free of the generated Supabase types. Status is an
exact `goat.status` match unless `'all'`/omitted; the `'active'` default is applied by the UI layer,
never hardcoded in the pure function.

**Crossbred breed matching (open question 2 — confirmed).** The Breed filter matches when **any** one of
a goat's `goat_breed_composition` rows equals the chosen breed, so a Boer/Somali cross appears under
"Boer" or under "Somali (Galla)", not only its primary.

**Status default (open question 3 — confirmed).** The list's Status filter defaults to **Active**
(`Active` / `Sold` / `Deceased` / `Stolen` / `All statuses`). Sold/Deceased/Stolen goats are never
hidden as data — they are one filter click away, preserving the point of `UPD-008`.

**Age-column sort toggle (2026-08-30 amendment — see §6/§8).** `AgeSort` state (`'none' | 'desc' | 'asc'`)
in `components/goats/goats-list.tsx`; the `visibleGoats` memo sorts the *filtered* result on
`ageInMonths()` (never the label). The `AgeSortToggle` chevron button lives in the Age `<TableHead>` and
once above the phone card list.

**Task 6 (dashboard active-only herd count).** Already fixed under the `UPD-008` amendment —
`computeHerdComposition` (`lib/dashboard/herd-composition.ts`) filters `status = 'active'` before
counting `total`, every per-stage count, the sex split and the buck-to-doe ratio; the dashboard passes
it the full, unfiltered goat set, so it is structurally independent of the `/goats` list's Status
filter. Re-verified for `UPD-009`, no further code change.

## 13. Verification evidence

**Automatic.** `npm run build` passes; `npx tsc --noEmit` clean; `npm run lint` at the project baseline
(the pre-existing `_prev` warnings + the `use-mobile.ts` error — none in `UPD-009` files).

**Unit checks (exact component code path).** `formatAge` across `0/1/5/11/12/16/24/37` months →
`0 months, 1 month, 5 months, 11 months, 1y, 1y 4m, 2y, 3y 1m`. `filterGoats` +
sort-on-`ageInMonths`: default `active` hides a `sold` goat; `status:'all'` shows it; `status:'sold'`
isolates it; a breed carried only as a cross's second component still matches; combined
`active` + breed narrows correctly; `desc`/`asc` reorder by real months in the right direction, drop no
rows, and place the historical goat at its correct age position when Status = All.

**Manual (owner, running app, 2026-08-30).** The owner confirmed: the default `/goats` list shows
Active goats only with an Age column and no Status column; marking a goat Sold drops it from the default
view and it reappears under Status = Sold / All; the Breed filter reflects real data (including a
crossbred match on a secondary component); combined filters behave; the dashboard Total / composition
donut drop by one on a Sold regardless of the list's Status filter; no regression to `UPD-008`'s
duplicate-detection or reasoned-removal flows; and the Age-column sort toggle reorders the list
correctly in both directions by real age.

**Not done by the agent:** a full authenticated browser click-through — the app is auth-gated end to
end and this environment had no working browser-automation setup (an env-gated auth-bypass harness was
started, hit the single-instance `next dev` lock against the owner's own running server, and was fully
reverted, `git`-confirmed). The owner's hands-on test above is the real verification, per the
owner-tests-each-spec rule.

## 14. Resolution / final state

`UPD-009` is `done` (built + owner-verified in the running app, 2026-08-30). Read/filter only — **no
migration, no schema change, no RLS change**.

Shipped: `lib/goats/age.ts` (`formatAge`); `lib/goats/search.ts` `filterGoats()` extended with `status`
and `breed` dimensions (`GoatFilters` + `FilterableGoat` widened, new local `GoatStatus` union);
`components/goats/goats-list.tsx` — Status column replaced with an Age column (desktop table + phone
card), new Breed select (options derived from breeds actually present in the data) and Status select
(default **Active**), plus the Age-column sort toggle (`AgeSort` state + `visibleGoats` memo +
`AgeSortToggle`). Task 6's dashboard active-only count was already in place from the `UPD-008` amendment
and was re-verified, not re-changed.

All three §15 open questions were confirmed by the owner as built (age wording `"5 months"` / `"1y 4m"`;
crossbred breed filter matches either component; Status defaults to Active). No follow-ups outstanding.

## 15. Open questions — resolved by the owner (2026-08-30)

- **Age format wording.** ✅ **Confirmed as proposed** — `"5 months"` under a year, `"1y 4m"` (or `"2y"`
  on an exact year) from a year up. `lib/goats/age.ts` `formatAge(months)`.
- **Crossbred breed-filter matching.** ✅ **Confirmed — match either component breed.** A Boer/Somali
  cross appears under "Boer" or "Somali (Galla)", not primary-only.
- **Status filter default.** ✅ **Confirmed — default to Active.** Sold/Deceased/Stolen goats stay fully
  present and are one filter click away (`Sold` / `Deceased` / `Stolen` / `All statuses`).
