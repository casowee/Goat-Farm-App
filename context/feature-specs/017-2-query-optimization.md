# Spec 17.2 — Supabase Query Optimization

**Phase:** 6 · **Spec:** 17 — Loading speed · **Status:** `in-progress` (started 2026-09-27)
**Depends on:** Spec 02 (auth, RLS), Specs 04–12 (all data modules)
**Recommended after:** 17.1 is verified, so before/after timings for each spec stay separate
**Followed by:** 17.3 Skeleton screens

---

## 1. Goal

Every screen should fetch **only the data it shows, in as few round-trips as possible, with no waiting on one query before starting the next**. Screens with long histories should load the most recent records first instead of everything the farm has ever recorded.

17.1 makes the app *open* fast. This spec makes the *data* behind each screen arrive fast, including when moving between pages.

## 2. Current state (agent must audit before coding)

The agent must build a **query inventory** before changing anything. For every route under `app/`, and for any shared data helpers, record:

| Route / file | Table(s) | Columns selected | Filters | Limit / range | Sequential or parallel | Also fetched elsewhere on same page? |
|---|---|---|---|---|---|---|

The agent must also report:
- Every use of `.select('*')` or `.select()` with no column list
- Every place where rows are fetched and then counted, filtered, or summed in JavaScript
- Every loop or `.map()` that runs a query per item (N+1)
- Every server component with two or more `await`ed queries that don't depend on each other (waterfalls)
- Which screens compute from **full history**: doe performance, top performers, impossible-interval flag, UPD-012 reproductive flagging, and dashboard charts (newborn kids, herd population timeline)
- How SQL changes (indexes, policies) have been applied so far in this project: migration files, SQL editor, or both
- Current indexes and RLS policy definitions for the tables in §3, via a read-only SQL query the user runs, or from existing migration files

This inventory goes into the spec's Implementation Notes.

## 3. Tables in scope

`goat_records`, `barns`, `health_history`, `medicine_records`, `breeding_history`, `weight_history`, `vaccinations`, `deworming`, `sales_purchases`, `health_condition_presets`, `herd_events`, `inventory_items`

## 4. Scope

**In scope**
- A. Explicit column lists on every query
- B. Parallelizing independent queries
- C. Removing N+1 queries using PostgREST embedded selects
- D. Database-side counting for totals and dashboard numbers
- E. Pagination ("Show more") on long history lists
- F. Deduplicating repeated fetches within one request
- G. Indexes on foreign-key and owner columns
- H. RLS policy performance rewrite

**Out of scope**
- Server-side data caching (`'use cache'`, `unstable_cache`, revalidation tags). Data is personal and freshness matters; this may be revisited in a later spec.
- New features, new screens, or visual redesign beyond the "Show more" control
- Schema changes beyond indexes and policy rewrites (no new columns or tables, no data changes)
- Skeleton screens (17.3)

## 5. Changes

### A. Explicit columns
Replace every `select('*')` with the columns the screen actually renders or needs. Anything a shared utility or component depends on must stay in the list:
- `formatAge()` needs the birth date (and death/sale date where the component uses it)
- `goat-link.tsx` needs the goat id plus whatever it displays (tag/name)
- Status must be selected wherever herd totals or active/inactive filtering happens

Edit forms may still select all editable fields. The target is list and summary views.

### B. Parallel queries
Where a server component awaits independent queries one after another, run them together with `Promise.all`. A query that needs an earlier result stays sequential.

### C. No N+1 queries
Replace per-row lookups (for example, fetching each goat's mother tag inside a loop) with embedded selects in the parent query, e.g. `select('id, tag, mother:goat_records!mother_id(id, tag)')`. The agent must use the real foreign-key names from the generated types.

### D. Database-side counting
Totals must not come from fetching rows and taking `.length`. Use `select('id', { count: 'exact', head: true })` with the same filters.

**Domain rule:** any herd total must exclude sold, deceased, and stolen goats. When a count moves to the database, it must apply exactly the same status filter as before. If the existing logic is spread across helpers, the agent must stop and show the user before changing it.

Where a chart needs full history (population timeline, newborn kids), keep fetching all rows but select only the columns the chart uses.

### E. Pagination on long histories
Goat-detail history tabs (health, medicine, vaccinations, deworming, weight, breeding) and any long standalone list:
- Load the **20 most recent** records, ordered newest first
- A full-width **Show more** button at the bottom (thumb-reachable) loads the next 20 using `.range()`
- The button disappears when no records remain
- The record count shown in a tab header (if any) must remain the **total** count, via a head-only count query

**Must not be paginated:** anything that computes from full history (see §2), including doe performance, top performers, the impossible-interval flag, UPD-012 flagging, and dashboard charts. These keep full data with trimmed columns.

The "Show more" pattern should be built once as a shared component and reused, following the Spec 04 template approach.

### F. Request-level deduplication
If the same data is fetched by both a layout and a page, or by two components in one render, wrap the fetch helper in React `cache()` so it runs once per request.

### G. Indexes
Postgres does not index foreign keys automatically. Add, where missing:
- `goat_id` (or equivalent FK) on every history table
- `owner_id` on every owner-scoped table (used by every RLS check)
- Composite `(goat_id, <date column> desc)` on history tables that are listed newest first
- `mother_id` / `father_id` on `goat_records`, and `barn_id`

All statements use `create index if not exists`. Exact column names come from the audit, not from this spec.

### H. RLS policy rewrite
Supabase evaluates `auth.uid()` once per row unless it's wrapped in a subquery. Rewrite owner-scoped policies from:
```sql
auth.uid() = owner_id
```
to:
```sql
(select auth.uid()) = owner_id
```
Rules:
- Idempotent: `DROP POLICY IF EXISTS` before every `CREATE POLICY`
- Same policy names, same commands (select/insert/update/delete), same logic; only the `auth.uid()` wrapping changes
- One SQL file covering G and H, applied the same way previous SQL in this project was applied

## 6. Dashboard steps (user)

1. Before any change, run the agent's read-only audit SQL (current indexes and policies) in the SQL editor and paste the results back to the agent:
   https://supabase.com/dashboard/project/tfzzvtizokakcmwmvmhu/sql/new
2. Check the Performance Advisor and note existing warnings (especially unindexed foreign keys and `auth_rls_initplan`):
   https://supabase.com/dashboard/project/tfzzvtizokakcmwmvmhu/advisors/performance
3. After the agent writes the index/policy SQL file, run it in the SQL editor (same link as step 1), unless the audit shows this project applies SQL through migrations instead.
4. Re-check the Performance Advisor and confirm those warnings are gone for the §3 tables.

## 7. Verification

**Baseline first:** before deploying, time these screens three times each on the installed PWA (tap → content fully shown). Use the dashboard, the goats list, the goat detail of the goat with the longest health history, and the breeding page. Record the times in Implementation Notes.

| # | Test | Expected |
|---|---|---|
| V1 | `next build` passes with no type or lint errors | ✅ |
| V2 | Dashboard herd totals and every donut/chart match pre-change values exactly | Identical |
| V3 | Mark a test goat as sold | Dashboard total drops by one, same as before this spec |
| V4 | Goat detail with long history: health tab | Shows 20 newest; tab count shows the full total |
| V5 | Tap Show more until it disappears | All records shown; total matches pre-change count |
| V6 | Doe performance tab, top performers, impossible-interval flag, UPD-012 flags | Same results as before |
| V7 | Every goat reference in lists | Still a working `goat-link` to the right goat |
| V8 | Ages everywhere | Unchanged, still via `formatAge()` |
| V9 | Add, edit, and delete one record in a history table | Works as before |
| V10 | Performance Advisor | No unindexed-FK or `auth_rls_initplan` warnings for §3 tables |
| V11 | Re-time the four baseline screens | Record after-timings next to baseline |

## 8. Risks

- **Wrong herd totals** if a count loses its status filter. Covered by D's domain-rule check, V2, and V3.
- **Broken analytics** if a full-history computation gets paginated. Covered by the §2 audit list and V6.
- **Missing columns** causing blank fields or broken links after trimming `select`. Covered by V7 and V8, plus TypeScript errors from generated types.
- **Policy rewrite lockout** if a policy is dropped and not recreated. Mitigated by idempotent SQL applied in one run; V9 confirms access.

## 9. Implementation Notes

_(Agent fills in: query inventory table, audit SQL results, list of changed queries per route, SQL file path, baseline vs. after timings, deviations.)_

---

### 9.1 Decisions taken (owner said "go" without pre-answering the audit questions)

Five things were ambiguous or would have changed what a screen displays. Each was
resolved toward the smallest, most reversible reading and is listed here so it can be
overridden after testing.

| # | Question | Decision taken |
|---|---|---|
| 1 | §3's table list names 7 legacy prototype tables no app code touches | Treated §3 as the **real** application tables. The legacy 8 (`goat_records`, `health_history`, `medicine_records`, `breeding_history`, `weight_history`, `vaccinations`, `deworming`, `sales_purchases`) are untouched — no indexes, no policy rewrite. Per spec 04 they still carry authenticated-only policies, so the `auth.uid()` rewrite does not apply to them. |
| 2 | §5E names medicine / vaccination / deworming tabs that don't exist | Those are `record_type` values inside the single `health_records` table, shown in one Health tab. "Show more" was applied to the **Health** and **Weight** tabs. Barn-move history and the Breeding tab's buck-season list were left unpaginated (short lists; the buck-season cards nest an edit dialog, so paginating them is a bigger change than this spec's scope). |
| 3 | The Weight tab needs full history (chart) *and* pagination (list) | Two queries: `listWeightPointsByGoat` keeps every row trimmed to `weighed_on, weight_kg` for the chart; `listWeightsPageByGoat` returns 20 editable rows for the list. |
| 4 | §5E's "tab count must remain the total" — but no tab shows a count today | **No visible count was added**, since adding one changes what the screen displays. The head-only `count: 'exact', head: true` queries were still built (`countHealthRecordsByGoat`, `countWeightsByGoat`) and drive the "Show more" button's appear/disappear logic and its "(N more)" hint. Turning them into a visible tab count later is a one-line change. |
| 5 | Herd totals — move the count to the database? | **Left exactly as it was**, in `lib/dashboard/herd-composition.ts`. Every dashboard herd number is a *per-derived-stage* count, and stage comes from sex + date of birth + reproductive state in JavaScript. Counting it in SQL would mean duplicating that rule in the database — precisely the "wrong herd totals" risk in §8. The rows are needed anyway for the donuts and the sex ratio, so a head count would add a round-trip and save nothing. |

### 9.2 Query inventory (audit, before any change)

| Route / file | Table(s) | Columns | Filters | Limit | Seq/parallel | Duplicated on page? |
|---|---|---|---|---|---|---|
| `app/(app)/layout.tsx` | *(auth only)* | — | — | — | 1 await | — |
| `app/(app)/page.tsx` | `barns` | `id, name` | — | none | wave 1 of 2 (8 parallel) | — |
| ″ | `goats` | 7 cols | `barn_id` optional | none | wave 1 | **yes** — `goats` read twice (barn-scoped + farm-wide) |
| ″ | `inventory_items` | **`*`** | — | none | wave 1 | — |
| ″ | `goats` farm-wide | 9 cols | — | none | wave 1 | yes |
| ″ | `herd_events` | 2 cols | — | none | wave 1 | — |
| ″ | `breeding_season_occurrences` | 4 cols | — | none | wave 1 | — |
| ″ | `breeding_season_bucks` | 2 cols | — | none | wave 1 | — |
| ″ | `breeding_season_templates` | 4 cols | — | none | wave 1 | — |
| ″ | `weights` | 2 cols | `goat_id in (…)` | none | wave 2 | — |
| ″ | `health_records` | 5 cols | `next_due_date not null` | none | wave 2 | — |
| `goats/page.tsx` | `barns` | `id, name` | — | none | await 1 (gates early return) | — |
| ″ | `goats` + composition | 6 cols | — | none | await 2 | **yes** — a subset of await 3 |
| ″ | `goats` + barn + composition | **`*`** | — | none | await 3 | yes |
| ″ | `health_condition_presets` | **`*`** | — | none | await 4 | — |
| `goats/[id]/page.tsx` | `goats` + embeds | **`*`** | `id` | single | await 1 | — |
| ″ | `barns` | `id, name` | — | none | await 2 | **yes** — again in Breeding tab (buck path) |
| ″ | `goats` herd + composition | 10 cols | — | none | await 3 | **yes** — again in Breeding tab (doe path) |
| ″ | `goat_barn_moves` + 2 barn embeds | 3 cols | `goat_id` | none | await 4 | — |
| ″ | `health_records` | **`*`** | `goat_id` | **none — full history** | await 5 | — |
| ″ | `health_condition_presets` | **`*`** | — | none | await 6 | — |
| ″ | `inventory_items` | **`*`** | `type=medicine` | none | await 7 | — |
| ″ | `weights` | **`*`** | `goat_id` | **none — full history** | await 8 | — |
| ″ → `goat-breeding-tab.tsx` buck | `breeding_season_bucks` → 5 parallel → `goats` | explicit | `buck_id` | none | await 9 + 2 more waves | barns, goats |
| ″ doe | 4 tables incl. full `goats` | explicit | — | none | await 9 (4 parallel) | goats |
| `breeding/page.tsx` | 6 tables | explicit | — | none | 6 parallel ✅ | — |
| `breeding/doe-performance/page.tsx` | 4 tables | explicit | — | none | 4 parallel ✅ | — |
| ″ | `health_records` | **`*`** | `goat_id` | none | **N+1 — one query per flagged doe** | — |
| `breeding/top-performers/page.tsx` | `goats` | 8 cols | — | none | 1 await ✅ | — |
| `breeding/settings/page.tsx` | 3 tables | explicit | — | none | 3 parallel ✅ | — |
| `health/`, `weight/`, `sales/` pages | — | — | — | — | placeholders, no queries | — |

**(a) `select('*')` — 10 sites**, all removed: `barns/page.tsx`, `health/actions.ts` ×2,
`inventory/actions.ts` ×2, `inventory/page.tsx`, `page.tsx`, `weight/actions.ts`,
`goats/page.tsx`, `goats/[id]/page.tsx`. Honest sizing: the payload win is small —
`goats` is 23 columns of which the edit dialog needs 17, so trimming drops 5;
`health_records` drops 3 of 19. Worth doing for correctness and to stop future columns
joining the payload silently, but this is not where the time went.
`listInventoryItems` was also found to have **no callers** (dead code); it is now the
single reader used by both the `/inventory` page and the dashboard stock widget.

**(b) Counts/filters done in JavaScript:** inventory tab labels, the doe-performance
`activeDoeCount`, `computeHerdComposition`'s status filter, and the doe-performance
list's client-side `visible.length`. **None of them benefits from a database count** —
every one counts rows the page already has to fetch and render, so a `head: true`
query would add a round-trip. Recorded as an intentional non-change, with comments in
`inventory/page.tsx` and `doe-performance/page.tsx` saying so.

**(c) N+1 — 1 site:** `doe-performance/page.tsx` fired `listHealthRecordsByGoat` inside
`flagged.map()` — one `select('*')` per flagged doe.

**(d) Sequential independent awaits:** `goats/[id]/page.tsx` (9 waves, awaits 2–8
independent) and `goats/page.tsx` (4 waves, awaits 2–4 independent). The dashboard,
breeding, doe-performance and breeding-settings pages were already parallel (UPD-011).

**(e) Repeated fetches in one render:** the full goat herd twice on goat detail;
`barns` twice on the buck path; the goats list's picker query a subset of its main
query.

**(f) Full-history computations — confirmed NOT paginated:** `computeHerdComposition`,
`computeHerdTimeline`, `computeMonthlyWeightAverages`, `NewbornPeriodsChart`,
`dueSoon`, `computeDoePerformance` (kidding events from every goat's `dam_id` + DOB),
the impossible-interval flag, UPD-012 flagging, `computeTopPerformingDoes`,
`computeSeasonalTimeline` / `computeBreedingReminders`, the goat-detail
`WeightGrowthChart`, and the goats list's client-side search / duplicate detection
(UPD-008 §6 covers the whole herd).

**(g) Herd-total status filtering lives at** `lib/dashboard/herd-composition.ts:57`
(`goats.filter((goat) => goat.status === "active")`), used by the dashboard and the
breeding page, with the same rule repeated in `doe-performance/page.tsx`,
`lib/breeding/top-performers.ts` and `lib/breeding/eligible-males.ts`. All unchanged.

**(h) How SQL is applied in this project — both:** the agent writes a numbered file
into `supabase/migrations/` and the owner runs it in the Supabase SQL editor. There is
no CLI push; the agent has no database write access.

### 9.3 Changed queries per route

**Step 3 — explicit columns.** `barns/page.tsx` (`id, name, category, notes`);
`inventory/page.tsx` + dashboard (both via `listInventoryItems`, 7 columns);
`goats/page.tsx` and `goats/[id]/page.tsx` (`GOAT_LIST_COLUMNS` /
`GOAT_DETAIL_COLUMNS`, 16 columns + 2 embeds); `lib/health/queries.ts`
(`health_records` 15 columns, presets 4); `lib/weight/queries.ts` (5 columns).
`goat-form-dialog.tsx`, `goats-list.tsx` and `barn-form-dialog.tsx` row types became
explicit `Pick<>`s, so trimming a column an edit form needs is now a compile error
rather than a blank field. **Select strings must stay single literals** — the Supabase
client infers each row type from the literal, and splitting one across `+` silently
degrades the query to untyped `GenericStringError` (hit and fixed during this work).

**Step 4 — parallel queries.** `goats/[id]/page.tsx`: **9 sequential waves → 3**
(the goat row, then 10 independent reads together, then the Breeding tab, which
genuinely depends on the results). `goats/page.tsx`: 4 → 2 (the barns check still
gates an early return, so it stays first).

**Step 5 — N+1 removed.** New `listHealthRecordSummariesByGoats(goatIds)` does one
`in (…)` query and groups by goat in memory; `doe-performance/page.tsx` uses it.

**Step 6 — database-side counts.** Two new head-only counts
(`countHealthRecordsByGoat`, `countWeightsByGoat`) power the Show-more logic. No
existing on-screen number was moved to a database count — see decision 5 and note (b).

**Step 7 — Show more.** `lib/pagination.ts` (`HISTORY_PAGE_SIZE = 20`, `pageRange`,
`hasMoreRows`) and `components/ui/show-more.tsx` (`usePaginatedRows` hook +
`ShowMoreButton`, full-width `h-11`, design tokens only) built once and reused by the
Health and Weight tabs. Server actions `loadMoreHealthRecords` and `loadMoreWeights`
fetch each next page under the same RLS as the first. The button hides when no records
remain, and also if a page comes back short (a record deleted mid-session).
The weight delta ("+2.4 kg since last time") is resolved **server-side**: each page
reads one extra older row purely to seed the delta on its oldest visible row, so
paginating changes none of the numbers displayed.

**Step 8 — request dedupe.** React `cache()` on `listHerdGoats`, `listBarns`,
`listHealthConditionPresets`, `listMedicineItems`, `listInventoryItems`,
`listHealthRecordsByGoat`, `listWeightPointsByGoat`, `countHealthRecordsByGoat`,
`countWeightsByGoat`. `cache()` is request-scoped: nothing survives the request, so
this is **not** the server-side data caching §4 rules out. The goat-detail page's two
duplicate full-herd reads and two duplicate barn reads collapse to one each.

**Structural note.** Read helpers moved out of the three `"use server"` action files
into `lib/{health,weight,inventory,goats}/queries.ts`. Two reasons: every export from
a `"use server"` file becomes a callable POST endpoint, which a render-time read should
not be; and `cache()` needs a real module export to dedupe against. The action files
keep the mutations and re-export the row types, so existing importers are unaffected.

### 9.4 SQL file

`supabase/migrations/20260927000001_query_optimization_indexes_and_rls.sql` — one
transaction (`begin; … commit;`), fully idempotent. 20 `create index if not exists`
statements (goat parent links, every missing `owner_id`, the barn-move barn foreign
keys, and composite `(goat_id, <date> desc)` indexes on `health_records`, `weights` and
`goat_barn_moves`), then 17 `drop policy if exists` + `create policy` pairs rewriting
`auth.uid()` to `(select auth.uid())` with identical names, commands, `to` clauses and
predicates.

**`public.barns` is excluded from the policy section.** Its table and policy were
created directly in the SQL editor during spec 04, so no migration file records the
policy's exact name and body, and dropping a policy that cannot be reproduced verbatim
is the one way this file could cause the §8 lockout. Its indexes are added; its policy
rewrite is pending the audit query's output.

### 9.5 Audit SQL results

_(Not yet supplied — the read-only audit query was delivered but its output has not
been pasted back. The index statements are written `if not exists` so existing indexes
are skipped by Postgres regardless, and the policy rewrites were reconstructed from the
migration files rather than from live state. Paste the audit output to close this
section and to settle the `barns` policy.)_

### 9.6 Baseline vs. after timings

Measure three times each on the installed PWA, tap → content fully shown (§7).

| Screen | Baseline (3 runs) | After (3 runs) |
|---|---|---|
| Dashboard | | |
| Goats list | | |
| Goat detail (longest health history) | | |
| Breeding | | |

### 9.7 Deviations from the spec text

1. §3's table list is stale — see decision 1.
2. §5E's medicine / vaccination / deworming tabs do not exist — see decision 2.
3. §5D's database-side counting found no existing count worth moving — see note (b).
4. No visible tab count was added — see decision 4.
5. Herd totals were left in JavaScript — see decision 5.
6. The `public.barns` policy rewrite is deferred pending the audit output — see §9.4.

### 9.8 Verification status

- `npm run build` — passes, no type or lint errors.
- `npx tsc --noEmit` — clean.
- `npm run lint` — one pre-existing error in the untouched shadcn file
  `hooks/use-mobile.ts` plus 5 pre-existing `_prev` warnings; unchanged from baseline.
- `package.json` / `package-lock.json` — no diff, no new dependencies.
- No `select('*')` remains anywhere in `app/`, `lib/` or `components/`.
- **Outstanding:** the owner runs the SQL file, records baseline and after timings, and
  works through V1–V11 on the installed PWA. Spec stays `in-progress` until then.
