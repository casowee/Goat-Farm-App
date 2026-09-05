# 012 — Doe Reproductive Performance Tracking

| Field             | Value                                                              |
| ----------------- | ------------------------------------------------------------------ |
| ID                | `UPD-012`                                                          |
| Title             | Flag underperforming does (overdue, long interval, never-kidded) + owner-recorded investigation notes |
| Status            | `done` — core feature built + owner-tested 2026-09-05; goat-profile Breeding tab integration added and owner-confirmed working 2026-09-05 (migrations `20260905000005` + `20260905000006` applied) |
| Owner approved?   | yes                                                              |
| Feature spec(s)   | `05-goat-profiles`, `06-family-tree` (dam linkage), `07-health-records` (correlation view) |
| Depends on        | `05`, `06` (done); `07` (health records, reused for context — does not require `07` to be formally "done," just its table to exist). **Does NOT depend on `09`** — this reads only already-shipped goat/lineage data. |
| Schema impact     | additive — two new tables (`doe_performance_settings`, `doe_performance_notes`)|
| Created           | 2026-09                                                           |

---

## 1. Reason for update

A doe should typically kid roughly twice within a 12–13 month span. There's currently no way to see
which does are falling behind that rhythm — overdue since their last kidding, historically slow between
kiddings, or old enough to have kidded by now but never have. The owner wants to spot these does so they
can investigate why (age, a health issue, or something else) and keep a record of what they concluded.

## 2. Current behavior

`goats` already links kids to their dam (`dam_id`, from `06`), and `date_of_birth` records when each kid
was born. Nothing currently aggregates this into a per-doe kidding history or flags anything as overdue.

## 3. Desired behavior

- Every doe's **kidding events** are derived from her kids' birth dates (kids born the same day count as
  one event — twins/triplets). From this: **months since her last kidding** and her **average interval**
  between kiddings.
- A doe is flagged as **not performing well** if **either**: she's past the expected max interval since
  her last kidding, **or** her historical average interval is too long, **or** she's past breeding-eligible
  age and has **never** kidded.
- Flagged does appear in one place, each showing her age, kidding history, and **her recent health
  records** (reusing `07`'s data) so the owner can visually correlate a flag against something like a
  past illness — without the system inventing a diagnosis it can't actually know.
- The owner can **record their own conclusion** — a category (Age / Health issue / Buck issue / Other /
  Resolved) plus a free-text note — per doe, building a small investigation history over time.
- All thresholds (max interval, breeding-eligible age) are **owner-editable settings**, not hardcoded —
  consistent with how gestation length and other assumption-heavy numbers have been handled throughout
  this project.

## 4. Scope (in and out)

**In scope**
- `doe_performance_settings` (owner-editable thresholds) and `doe_performance_notes` (owner-recorded
  investigation history) tables.
- Pure `lib` functions deriving kidding events and the underperformance flag — nothing stored that can be
  computed, matching the project's convention (stage, kidding window, herd composition are all derived).
- A "Doe Performance" list showing flagged does with their history and health-record context.
- A per-doe note/category entry point from that list.

**Out of scope**
- Any automatic root-cause diagnosis (age vs. health vs. buck) — the system shows the data; the owner
  draws the conclusion and records it themselves. This is consistent with the health module's own
  non-diagnostic stance.
- Any dependency on or change to spec `09`'s breeding-season data — deliberately independent, so this
  can ship regardless of `09`'s status.
- Editing `goats` or `health_records` from this feature — this is a read/analysis + a small separate
  notes table, not a change to those modules.

## 5. UX / interaction requirements

- **Placement — a tab inside the Breeding page** (2026-09-05 amendment). The Breeding area has a
  route-backed tab strip (`components/breeding/breeding-tabs.tsx`): **Seasons** (`/breeding`) and **Doe
  Performance** (`/breeding/doe-performance`). Each tab is its own URL so it survives navigating into a
  record and back (the project's "navigable view state lives in the URL" convention). Settings stays a
  corner button, not a tab. There is **no** top-level nav entry for Doe Performance — the tab is the
  only entry point (same principle as spec 10's `/medicine` → `/inventory` cleanup).
- **Settings** (short form, reuse the Form Length Standard's simple-form pattern): **Max expected
  kidding interval** (months, default **13**), **Breeding-eligible age** (months, default **12** — "a
  doeling can have kids once she is older than a year"; owner-editable, and compared against a doe's
  **raw age from `date_of_birth`**, never her derived life-stage label — the two are independent
  concepts). Lives as a "Doe performance" section on `/breeding/settings`.
- **Doe Performance tab**: a total-count summary at the top ("*N* does currently flagged", plus "·
  showing *M*" when a search/filter narrows it); a **search** box (tag / name, case-insensitive —
  mirrors the goats-list search field set from `UPD-008`/`009`); a **sort** control (Most overdue first
  [default — never-kidded does sort to the top] / Most flags first / Oldest first / Tag A–Z); a
  **filter** by flag type (All / Overdue / Long average interval / Never kidded but eligible). One row
  per flagged doe. Only currently **active** does are considered (reuse the active-goat convention from
  `UPD-008`/`009`); a doe too young to be judged yet (raw age below the eligible age, zero kiddings) is
  simply excluded, not flagged.
- **Every duration reads in years + months** via `formatAge()` from `lib/goats/age.ts` (`UPD-009`) —
  the doe's age, months-since-last-kidding, and average interval between kiddings. None is ever shown as
  a bare raw month count, consistent with the rest of the app. A never-kidded doe's row is labelled
  unambiguously ("Age: 2y 8m" and "Kiddings: Never kidded" as two separate labelled values, never a
  bare number beside "never kidded"); a doe who has kidded shows "Age:" and "Last kidding: X ago
  (date)" as clearly separate labelled values.
- **Per-doe detail/expansion**: her full kidding event list, a short list of her recent `health_records`
  entries (reused, read-only — illness/injury/treatment history, not re-fetched or duplicated logic), and
  a **note entry**: category select (Age / Health issue / Buck issue / Other / Resolved) + optional free
  text. Notes accumulate as a small history, not a single overwritten field, so the owner can see how
  their thinking evolved.
- Tokens, rounded cards, mobile-first per `ui-context.md`.

## 6. Domain / data / API requirements

**Migrations** (additive, new files):

```sql
create table if not exists public.doe_performance_settings (
  id                              bigserial primary key,
  owner_id                        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  max_expected_interval_months    integer not null default 13,
  breeding_eligible_age_months    integer not null default 12,  -- amended 2026-09-05 (was 10)
  updated_at                      timestamptz not null default now(),
  unique (owner_id)
);

alter table public.doe_performance_settings enable row level security;
create policy "Owner manages own doe performance settings" on public.doe_performance_settings for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

do $$ begin
  create type doe_performance_category as enum ('age','health','buck_issue','other','resolved');
exception when duplicate_object then null;
end $$;

create table if not exists public.doe_performance_notes (
  id         bigserial primary key,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  doe_id     bigint not null references public.goats(id) on delete cascade,
  category   doe_performance_category not null,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists doe_performance_notes_doe_id_idx on public.doe_performance_notes (doe_id);

alter table public.doe_performance_notes enable row level security;
create policy "Owner manages own doe performance notes" on public.doe_performance_notes for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
```

`bigserial` ids, single `for all` RLS policy — standard convention, no global rows.

**`lib/breeding/doe-performance.ts`** — pure, no Supabase/React:

```ts
export interface KiddingEvent { date: Date; kidCount: number }

export function computeKiddingEvents(allGoats: GoatRow[], damId: number): KiddingEvent[]
// Group allGoats where dam_id === damId by date_of_birth into events, collapsing births within
// KIDDING_EVENT_GROUPING_DAYS (= 3, per §14) of a cluster anchor. Sorted ascending.

export interface DoePerformance {
  doeId: number
  doeLabel: string                 // tag, per project convention
  ageMonths: number                // reuse ageInMonths() from lib/goats/stage.ts
  kiddingEvents: KiddingEvent[]
  monthsSinceLastKidding: number | null   // null if never kidded
  averageIntervalMonths: number | null    // null if fewer than 2 events
  flags: ('overdue' | 'long_average_interval' | 'never_kidded_but_eligible')[]
}

export function computeDoePerformance(
  doe: GoatRow,
  allGoats: GoatRow[],
  settings: { maxExpectedIntervalMonths: number; breedingEligibleAgeMonths: number },
  now: Date,
): DoePerformance | null   // null if she doesn't apply yet (too young, zero kiddings)
```

Rules:
- Zero kidding events **and** `ageMonths < breedingEligibleAgeMonths` → return `null` (not yet
  applicable — don't flag a doeling who simply hasn't had the chance).
- Zero kidding events **and** `ageMonths >= breedingEligibleAgeMonths` → flag `'never_kidded_but_eligible'`.
- One or more events: `monthsSinceLastKidding` from the most recent event to `now`; flag `'overdue'` if
  it exceeds `maxExpectedIntervalMonths`.
- Two or more events: `averageIntervalMonths` across consecutive event dates; flag
  `'long_average_interval'` if it exceeds `maxExpectedIntervalMonths`.
- A doe with **any** flag is "not performing well" — flags can combine (e.g. overdue **and** a long
  historical average).

## 7. Safety and data integrity rules

- Standard owner-only RLS on both new tables — no novel access pattern.
- Nothing about `goats` or `health_records` is modified — this is additive, read-mostly, plus a small
  independent notes table.
- The performance flag itself is **never stored** — always recomputed live, so changing a setting
  (e.g. adjusting the eligible age) immediately reflects across every doe without a migration or backfill.

## 8. Acceptance criteria

- [ ] Settings for max interval and breeding-eligible age are editable and persist.
- [ ] A doe overdue since her last kidding is flagged; one with a fine last-kidding date but a long
      historical average is also flagged; a doe of eligible age with zero kiddings is flagged; a young
      doe with zero kiddings below the eligible age is **not** flagged (simply excluded).
- [ ] Each flagged doe's detail view shows her kidding history, age, and recent health records.
- [ ] The owner can add a category + note for a flagged doe, and see prior notes accumulate over time.
- [ ] Sold/deceased/stolen does never appear in this list.
- [ ] This feature functions correctly regardless of spec `09`'s status.

## 9. Verification required — automatic and manual

**Automatic** — `npm run build` passes; `tsc` clean; generated-types wiring re-confirmed after the
migrations.

**Manual (user flow)** — adjust the settings and confirm the flagged list changes accordingly; find a
real doe overdue on kidding and confirm she appears with correct numbers; find (or create test data for)
a doe with zero kiddings past the eligible age and confirm she's flagged; add a note with a category to a
flagged doe and confirm it's saved and displayed; confirm her recent health records show correctly if she
has any recorded.

## 10. Related spec files

- Extends: `context/feature-specs/05-goat-profiles.md`, `context/feature-specs/06-family-tree.md` (dam
  linkage), `context/feature-specs/07-health-records.md` (reused for correlation, read-only).
- Explicitly independent of: `context/feature-specs/09-breeding.md` — no dependency either direction.

## 11. Implementation note

- **Migrations:** `supabase/migrations/20260905000005_doe_performance_settings.sql` (one row per owner,
  `unique (owner_id)`, defaults 13 / **12** — see the 2026-09-05 amendment) and
  `20260905000006_doe_performance_notes.sql`
  (`doe_performance_category` enum guarded with `do $$ … duplicate_object`, `doe_id → goats(id) on
  delete cascade`, `created_at` index). Both `bigserial` id, `owner_id uuid default auth.uid()`, single
  `for all` owner RLS policy with `drop policy if exists` first — matches the breeding-table
  convention. Types hand-added to `types/database.types.ts` (stand-in; owner re-runs `npm run
  gen:types` after applying — `SUPABASE_ACCESS_TOKEN` is currently expired, see `progress-tracker.md`).
- **Pure logic:** `lib/breeding/doe-performance.ts` — `computeKiddingEvents(allGoats, damId)` clusters
  kids by `date_of_birth` within `KIDDING_EVENT_GROUPING_DAYS = 3` of a cluster anchor (earliest date);
  `computeDoePerformance(doe, allGoats, settings, now)` returns `null` only for zero kiddings + age
  below the eligible threshold, otherwise a `DoePerformance` with a (possibly empty) `flags` list.
  `ageInMonths()` from `lib/goats/stage.ts` is reused for both the doe's age and months-since-last-kidding
  — not re-implemented. `averageIntervalMonths` = span between first and last event / (events − 1),
  converted at 30.44 days/month, 1 dp. Flags use strict `>` ("exceeds"). Flags can combine. Sanity-checked
  against all four Section 8 cases plus a combined overdue+long-average and an on-rhythm doe (empty flags).
- **Server actions:** `app/(app)/breeding/doe-performance/actions.ts` — `upsertDoePerformanceSettings`
  (select-then-update/insert, one row per owner, ranges 1–36) and `addDoePerformanceNote` (validates the
  category enum + that the doe is one of the owner's goats; note text optional; insert only, never
  update — notes accumulate).
- **UI:** `app/(app)/breeding/doe-performance/page.tsx` (Server Component — computes flags live, filters
  to `sex = female` + `status = 'active'` + `flags.length > 0`, then reuses feature 07's
  `listHealthRecordsByGoat` per flagged doe for the 5 most recent records), `components/breeding/
  doe-performance-list.tsx` (client — expandable per-doe cards: flag chips, kidding history, recent
  health records read-only, accumulating notes list + a category-select/optional-text note form; expand
  state is local `useState`, no navigation away from the page), `components/breeding/
  doe-performance-settings-form.tsx` (two number inputs) added as a section on `/breeding/settings`, and
  a "Doe performance" link card on `/breeding`. Note-form category select uses the base-ui `Select`
  `name=` + controlled `value` pattern (per `health-record-form-dialog.tsx`), reset on a successful
  save. No cross-RSC-boundary trigger element (ERR-001 not applicable — no dialog; the note form is
  inline).
- `npm run build` + `npx tsc --noEmit` clean; `npm run lint` at project baseline (the pre-existing
  `use-mobile.ts` error + four `_prev` delete-dialog warnings only — no new issues).

### Amendment — 2026-09-05 (after the owner's real testing)

1. **Placement is now a tab inside Breeding, not a standalone page.** New
   `components/breeding/breeding-tabs.tsx` — a route-backed tab strip (**Seasons** `/breeding` /
   **Doe Performance** `/breeding/doe-performance`) rendered on both pages; each tab is its own URL
   (navigable-view-state-in-URL convention). The `/breeding` "Doe performance" link card was removed;
   the doe-performance page dropped its `TopBarBackButton` and now shows the shared "Breeding" heading +
   tab strip. No top-level nav entry was ever added, so there is no duplicate entry point to remove.
2. **Every duration renders via `formatAge()` from `lib/goats/age.ts`.** The doe's age,
   months-since-last-kidding, and average interval are all formatted years + months in the page's
   row-builder (`ageLabel` / `lastKiddingAgoLabel` / `averageIntervalLabel`); raw month counts are kept
   on the row only for client-side sorting, never displayed. The per-doe summary is now a `<dl>` of
   explicitly labelled values — "Age:", "Last kidding: X ago (date)", "Avg between kiddings:" — and a
   never-kidded doe shows "Kiddings: Never kidded" as a separate labelled line, removing the
   "32 mo old · never kidded" ambiguity.
3. **Breeding-eligible-age default bumped 10 → 12** in the migration and
   `DEFAULT_DOE_PERFORMANCE_SETTINGS`. **The eligibility check was already comparing raw age**
   (`ageInMonths(doe.date_of_birth)` in `computeDoePerformance`), never the derived stage label — there
   was **no stage-based bug**; only the default value needed changing. Verified: an 11-month
   Doeling-stage doe with zero kiddings is excluded under the default 12 but flagged when the setting is
   lowered to 10; a 13-month doe with zero kiddings is flagged under the default. Comments added to the
   lib, the migration, and the settings-form hint spelling out that eligible-age and life-stage are
   independent concepts.
4. **Search / sort / filter / count added to the tab** (`doe-performance-list.tsx`): a total-count
   line ("*N* does currently flagged" + "· showing *M*" when narrowed), a tag/name search box
   (case-insensitive, mirrors the goats-list field set), a flag-type filter (All / Overdue / Long
   average interval / Never kidded but eligible), and a sort control (Most overdue first [default,
   never-kidded does on top] / Most flags first / Oldest first / Tag A–Z). All client-side over the
   already-computed rows.

`npm run build` + `npx tsc --noEmit` clean after the amendment; `npm run lint` still at project
baseline (no new issues).

### Amendment 2 — 2026-09-05 (goat-profile Breeding tab integration, shared with Feature `09`)

The goat detail page's **Breeding tab** — a "coming soon" placeholder left from spec `05` — is now wired
to real data, differing by the goat's sex, **assembling already-built pieces from `09` and `012`, no new
domain logic**:

- **Doe:** her kidding performance, via `computeDoePerformance` + a new shared mapper
  `toDoePerformanceRow` (extracted from `/breeding/doe-performance/page.tsx` into
  `lib/breeding/doe-performance-row.ts` along with the `DoePerformanceRow` type + `RECENT_HEALTH_LIMIT`),
  rendered with the **same `DoeCard`** the Doe Performance tab uses (now exported, with a `defaultOpen`
  prop and a "Not currently flagged" affordance for the `flags: []` case). The card's own note form
  saves to `doe_performance_notes` exactly as on the tab — `addDoePerformanceNote` now also
  `revalidatePath('/goats/<id>')`. A too-young doe (`computeDoePerformance` → `null`) shows a plain
  non-alarming "nothing to show yet" note, never a false "never kidded" flag.
- **Buck:** his season history via `SeasonSummaryCard` — the Breeding page's per-season card markup,
  extracted into `components/breeding/season-summary-card.tsx` and now used by both the Breeding page
  (with edit/delete passed through a new `actions` slot) and here (read-only).
- **Wether:** "Not applicable". **Young buck with no season:** "not assigned to a season yet".
- New `components/goats/goat-breeding-tab.tsx` = `loadGoatBreedingTabData()` (fetch + compute at the
  goat page's top level, matching the other tabs) + a synchronous `GoatBreedingTab` renderer.

`npm run build` + `npx tsc --noEmit` clean; `npm run lint` at project baseline. Pure `toDoePerformanceRow`
re-checked (durations all `formatAge`-formatted, health/notes mapped, too-young → `null`). Owner
confirmed the goat-profile Breeding tab working 2026-09-05 — `UPD-012` is `done`. (Feature `09` stays
`in progress` on its own separate pending checklist, unrelated to this integration.)

## 12. Verification evidence

**Automatic (agent):**

- `npm run build` passes; `npx tsc --noEmit` clean (no `any`); `npm run lint` at the project baseline
  (the pre-existing `hooks/use-mobile.ts` error + the four `_prev` delete-dialog warnings only — no new
  issues in any UPD-012 file). Re-run clean after the 2026-09-05 amendment.
- Pure logic sanity-checked with throw-away scripts against every Section 8 case: an overdue doe
  (one kidding ~20 months ago) flags `overdue`; a doe with a fine last-kidding date but a ~31-month
  historical average flags `long_average_interval` **and not** `overdue` (flags combine only when each
  independently applies); a 13-month doe with zero kiddings flags `never_kidded_but_eligible`; an
  11-month doe with zero kiddings returns `null` (excluded) at the default eligible age 12, and flags
  `never_kidded_but_eligible` once the setting is lowered to 10 — confirming the check is on **raw age**
  (`ageInMonths(date_of_birth)`), never the derived life-stage label; an on-rhythm doe (kiddings 12
  months apart, last one 5 months ago) returns an object with an **empty** `flags` list and is filtered
  out of the list. Twins recorded a day apart collapse into one `KiddingEvent` with `kidCount: 2`.
- Generated-types wiring: the two new tables + the `doe_performance_category` enum are hand-added to
  `types/database.types.ts` as the stand-in (the same pattern every prior table used while
  `SUPABASE_ACCESS_TOKEN` is expired); `npm run gen:types` re-confirmation is a follow-up step, not a
  blocker.

**Manual (owner, in the running app) — ✅ confirmed working 2026-09-05.** The owner applied both
migrations and tested the feature hands-on: the Doe Performance tab inside Breeding, live re-flagging
when the thresholds change, an overdue doe and a never-kidded eligible-age doe both appearing with
correct year+month figures, adding categorised notes and seeing prior notes accumulate, recent health
records showing on a flagged doe, and sold/deceased/stolen does never appearing. Search, sort, filter
and the flagged-count summary all verified together.

The standing **cross-account RLS check** on `doe_performance_settings` and `doe_performance_notes` is
covered by the owner's existing second-test-user check (2026-08-29, re-usable for any new owner-scoped
table with the standard `for all` `auth.uid() = owner_id` policy) — both new tables use exactly that
policy shape and no novel access pattern.

## 13. Resolution / final state

`UPD-012` is **`done`** — core feature built and owner-tested 2026-09-05, and the goat-profile
Breeding-tab integration (Amendment 2) confirmed working by the owner the same day.

Doe reproductive performance tracking ships as a **tab inside the Breeding page** (`/breeding` "Seasons"
· `/breeding/doe-performance` "Doe Performance", route-backed strip in
`components/breeding/breeding-tabs.tsx`) — no top-level nav entry — plus a **Breeding tab on each goat's
detail page** (buck season history / doe kidding performance).

- **Schema:** two additive tables — `doe_performance_settings` (one row per owner; `max_expected_interval_months`
  default 13, `breeding_eligible_age_months` default **12**) and `doe_performance_notes`
  (`doe_performance_category` enum `age`/`health`/`buck_issue`/`other`/`resolved`; accumulating, never
  overwritten). Both `bigserial` id, single `for all` owner RLS. Migrations
  `20260905000005_doe_performance_settings.sql` and `20260905000006_doe_performance_notes.sql`, applied
  by the owner.
- **The underperformance flag is never stored** — `lib/breeding/doe-performance.ts` recomputes it live
  on every page load from the current settings, so a threshold change reflects across every doe with no
  backfill.
- **`computeDoePerformance` evaluates raw age**, independent of the Kid/Doeling/Doe stage label — the
  two are separate, separately-configurable concepts. There was never a stage-based bug; the 2026-09-05
  amendment only changed the default eligible age from 10 to 12.
- **Every duration renders via `formatAge()`** (`lib/goats/age.ts`) in years + months; raw month counts
  exist on the row model only for client-side sorting.
- **The Doe Performance tab** has a flagged-count summary, tag/name search, flag-type filter, a sort
  control (Most overdue first [default] / Most flags first / Oldest first / Tag A–Z), and expandable
  per-doe cards (kidding history, recent `health_records` via feature 07's own `listHealthRecordsByGoat`,
  and an accumulating category-plus-text note form).
- **Settings** are a "Doe performance" section on `/breeding/settings`.

Open follow-up (not blocking): re-run `npm run gen:types` once `SUPABASE_ACCESS_TOKEN` is refreshed to
replace the hand-added stand-in for the two tables — shared with Feature 09's identical pending step.

## 14. Open questions — resolved by the owner (2026-09-05)

- **Breeding-eligible age default.** First answered "keep 10 months" (2026-09-05), then **amended the
  same day to 12 months** ("a doeling can have kids once she is older than a year"). Shipped default is
  **12**. Still owner-editable, and compared against a doe's raw age, not her life-stage label.
- **Kidding-event grouping window.** ✅ **Confirmed — a ±3-day window**, not exact-same-day.
  `computeKiddingEvents` collapses kids whose birth dates fall within `KIDDING_EVENT_GROUPING_DAYS = 3`
  of a cluster's anchor (earliest) date into one kidding event, so twins/triplets entered a day or two
  apart (delayed registration) are still counted as a single kidding. A doe cannot physically kid twice
  within three days, so there is no risk of wrongly merging two real kiddings; the constant lives in one
  place in `lib/breeding/doe-performance.ts` for easy retuning.
