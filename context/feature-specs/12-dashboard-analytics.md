# 12 — Dashboard & Analytics

| Field       | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Phase       | 4 — Insight                                                                    |
| Aspect      | Both (mostly read-side aggregation + charts — no new owned-data tables expected) |
| Status      | `done` (2026-08-29 — built ahead of 09/11 at the owner's request; `npm run build` + `tsc` clean; owner tested it in the running app and confirmed it works. Sales widget is a "coming soon" placeholder until 11 exists. Owner has minor refinements in mind — an update spec will follow.) |
| Depends on  | 05/06 (goats + stage, done), 07 (health records, built — owner testing pending), 08 (weight records, built — owner testing pending), 10 (inventory, done) |
| Unblocks    | none directly; 13 — calendar reuses the same due-date query this spec writes  |

> **Agent:** before writing code, follow the Implementation Workflow in `ai-workflow-rules.md`. Read this
> spec, then inspect `types/database.types.ts` for the **actual current shape** of `goats`, whatever
> table(s) spec 07 built for health records, `weights` from spec 08, and `inventory_items` from `UPD-005`.
> **Do not assume column names from `architecture-context.md`'s original data-model sketch** — that
> sketch predates the real 07 build and may be stale (see Task 1). Also read
> `context/error-specs/001-goat-dialog-trigger-hydration.md` and `ui-context.md`.

---

## 1. Goal

Give the owner a **dashboard** (the app's home page) summarizing the herd at a glance: composition by
stage, buck-to-doe ratio, a weight-growth trend, upcoming vaccinations/deworming, and current stock
levels — with a barn filter, "all barns" as the default, matching `project-overview.md`'s description of
what the owner sees immediately after signing in.

This spec deliberately **builds on what already exists** rather than waiting for everything in
`project-overview.md`'s full analytics list — `09` (breeding) and `11` (sales) aren't built yet, so their
widgets are explicitly out of scope here (Section 4).

## 2. Important — reconcile stale documentation first (Task 1)

`architecture-context.md`'s original data model sketch lists separate `vaccinations` and `dewormings`
tables. **Confirm what spec 07 actually built** — based on how `UPD-004`/`UPD-005` referenced a single
`health_record_type` enum (`vaccination`, `deworming`, `treatment`, `illness`, `injury`, `checkup`,
`surgery`) with a `next_due_date`-style column, it's likely 07 unified these into **one `health_records`
table with a `record_type` column**, not separate tables. **Verify this from the generated types, not
from the stale sketch.** If confirmed, update `architecture-context.md`'s data-model section to reflect
reality — this matters because **spec 13 (calendar) will need the same due-date query** this spec writes,
and it should be built against accurate documentation, not the original sketch.

## 3. What already exists (reuse, don't rebuild)

- `lib/goats/stage.ts` → `deriveGoatStage()` — reuse for stage counts, don't re-derive stage logic here.
- `lib/inventory/stock.ts` → `isLowStock()` — reuse for the stock-levels widget.
- `goats.sex`, `goats.barn_id` — for buck/doe counts and the barn filter.
- Whatever table spec 07 built (health records) — for the due-soon widget, once Task 1 confirms its shape.
- `weights` (spec 08) — for the weight-growth widget.
- `inventory_items` (`UPD-005`, extended by `10`) — for the stock-levels widget.

## 4. Scope

**In scope for 12**

- **Herd composition** — counts by stage (Doe, Doeling, Buck, Buckling, Wether, Kid), total males vs
  females, and the **buck-to-doe ratio** (adult Buck count : adult Doe count — see open questions).
- **Weight growth** — a farm-wide trend (e.g. average recorded weight per month across all goats),
  Recharts line chart. This is a herd-level view; the owner already has a per-goat chart from spec 08.
- **Vaccinations/deworming due soon** — a list of upcoming due dates within a window (default 30 days —
  confirm), farm-wide, sorted soonest-first.
- **Stock levels** — a summary tile/list of low-stock or zero-stock inventory items, reusing
  `isLowStock()`.
- **Barn filter** — applies to herd composition, weight growth, and the due-soon list (all goat-scoped);
  does **not** apply to the stock-levels widget (inventory isn't barn-scoped). Default: all barns.
- The dashboard is the app's **home page** (`/`) — the app-shell step (`03`) already stubbed this route.

**Out of scope for 12 — explicitly deferred**

- **Sales over time** — spec `11` doesn't exist yet. Do not build this widget. Either omit it entirely
  from the layout, or add a clearly-labeled disabled/"coming soon" placeholder tile — pick whichever is
  simpler and note the choice; don't block on this.
- **Breeding-pattern analytics** — spec `09` is deferred; nothing here depends on it (buck-to-doe ratio
  only needs `goats.sex`, not a breeding record).
- Any change to spec 07/08/10's own screens or data — this spec only reads their tables.

## 5. Task 2 — Herd composition & buck-to-doe ratio

**File:** `lib/dashboard/herd-composition.ts` — pure function(s) over an in-memory list of goats (reuse
`deriveGoatStage`):

```ts
export interface HerdComposition {
  byStage: Record<GoatStage, number>
  totalMale: number
  totalFemale: number
  buckToDoeRatio: { bucks: number; does: number } // adult-stage only — see open question
}

export function computeHerdComposition(goats: GoatRow[], now?: Date): HerdComposition
```

Keep it pure and portable (no Supabase/React), consistent with every other domain function in this
project. Render as a small set of cards/badges + a simple stage-breakdown chart on the dashboard page.

## 6. Task 3 — Weight growth (farm-wide)

Query `weights` (RLS-scoped) grouped by month, compute an average across all recorded weights per month,
and render as a Recharts line chart (`components/dashboard/weight-trend-chart.tsx`, client component —
charts need interactivity/client rendering per `code-standards.md`). Respect the barn filter by joining
through `goats.barn_id`.

## 7. Task 4 — Vaccinations/deworming due soon

**File:** `lib/dashboard/due-soon.ts` — pure function taking the relevant health records and a window
(default 30 days) and returning a sorted list of `{ goatId, goatTag, recordType, dueDate }`. Query the
actual table/columns confirmed in Task 1. Render as a simple list on the dashboard
(`components/dashboard/due-soon-list.tsx`), respecting the barn filter. **This function should be
reusable by spec 13 (calendar)** — keep it free of any dashboard-specific rendering concerns.

## 8. Task 5 — Stock levels

A small tile/list showing inventory items where `isLowStock()` is true (or quantity is 0), reusing the
existing helper from spec 10 — no new logic, just surfacing it on the dashboard.
(`components/dashboard/stock-levels-widget.tsx`.) Not barn-filtered.

## 9. Task 6 — Barn filter + page assembly

**File:** `app/(app)/page.tsx` (Server Component; the dashboard *is* the home page). A small client
`components/dashboard/barn-filter.tsx` (same pattern as the goats list's barn filter) sets `?barn=<id>`,
default all barns. The page composes the widgets from Tasks 2–5, passing the filtered goat/weight/health
data down. Dark-desert theme, responsive per `ui-context.md` — widgets stack to a single column on phone.

Build any dialog/trigger here (if any) per `ERR-001`'s preventive rule.

## 10. Files this unit touches

```
lib/dashboard/herd-composition.ts        # computeHerdComposition()
lib/dashboard/due-soon.ts                 # dueSoon() — reusable by spec 13
app/(app)/page.tsx                        # dashboard home page (Server Component)
components/dashboard/barn-filter.tsx      # barn filter (client)
components/dashboard/weight-trend-chart.tsx   # Recharts line (client)
components/dashboard/due-soon-list.tsx        # due-soon list
components/dashboard/stock-levels-widget.tsx  # low-stock tile/list
architecture-context.md                   # reconcile the health-records data-model description (Task 1) if stale
```

No new migration expected. No edits to `components/ui/*`.

## 11. Verification (must pass before 12 is `done`)

Build & types: `npm run build` passes; `tsc` clean.

Click-through:

1. Dashboard loads at `/` with herd composition counts matching what's actually in `/goats`.
2. Buck-to-doe ratio looks correct for the current herd.
3. Weight-growth chart renders and updates when the barn filter changes.
4. Due-soon list shows any health records with an upcoming due date within the window, correctly sorted,
   and updates with the barn filter.
5. Stock-levels widget correctly reflects `/inventory`'s low-stock items and is **not** affected by the
   barn filter.
6. No Sales widget is shown (or a clearly-labeled placeholder is, if that's the choice made) — nothing
   broken by its absence.
7. Dark theme, phone width (widgets stack to one column), no console errors or hydration warnings.

## 12. Roadmap & progress updates — the agent must do these

**On starting 12:** set feature **12** to `in progress` in `feature-specs-roadmap.md` (At a glance +
section) and `progress-tracker.md` (Current / In Progress). Note explicitly that this is being built
ahead of `09` and `11` at the owner's request, and that the Sales widget is deferred until `11` exists.

**On completing 12** (build passes and verified): set feature **12** to `done`, record it in
`progress-tracker.md` (Completed + dated Session Notes), and if Task 1 required updating
`architecture-context.md`, note that change explicitly. Leave the `◀ next` marker reflecting the real
outstanding order — `08` (awaiting the owner's test), `09`, and `11` remain open; don't imply `13` is
automatically next.

## 13. Open questions (resolve, don't guess)

- **Buck-to-doe ratio scope.** This spec counts adult Buck/Doe stages only (excluding Bucklings/Doelings/
  Wethers/Kids), matching "for breeding planning" in `project-overview.md`. Confirm.
- **Due-soon window.** Default 30 days — confirm, or make it configurable later.
- **Weight-growth metric.** Farm-wide monthly average across all goats — confirm this is useful, or if a
  different aggregate (e.g. median, or per-stage breakdown) would serve better.
- **Sales placeholder vs. omit.** Pick whichever is simpler; note the choice made.
- **07's actual schema.** If Task 1 finds the real table/column names differ from what's assumed here,
  adapt Tasks 4/7 accordingly and note the actual shape in Implementation Note.

---

## 14. Implementation Notes & Decisions (2026-08-29)

**Task 1 — health-records schema (confirmed from `types/database.types.ts`).** Spec 07 built **one
`health_records` table** with a `record_type` enum column (`vaccination` / `illness` / `treatment` /
`deworming` / `checkup` / `injury` / `surgery`), a `status` enum, a `next_due_date` column, a `title`,
`goat_id` → `goats`, and `owner_id`. It is *not* the original sketch's separate `vaccinations` /
`dewormings` tables — the tables of those names in the database are untouched legacy prototype tables
keyed on `goat_records.tag_number` and are unrelated. `architecture-context.md`'s Data Model section was
updated to describe `health_records` (and to point the "derived calendar events" note at
`health_records.next_due_date`), so spec 13 builds against accurate docs. The due-soon query filters
`next_due_date is not null` and excludes only `status = 'cancelled'` (a `completed` follow-up event is
the normal case for vaccination/deworming/checkup and must still count).

**Owner's Section 13 answers (2026-08-29):**
- Buck-to-doe ratio → **adult Buck/Doe stages only** (`byStage.Buck : byStage.Doe`).
- Due-soon window → **30 days** (`DEFAULT_DUE_SOON_WINDOW_DAYS`; `dueSoon()` takes it as a parameter, so
  spec 13 or a later setting can override it without touching the function).
- Weight-growth metric → **farm-wide monthly average across all goats** (`computeMonthlyWeightAverages`).
- Sales widget → **a clearly-labelled "coming soon" placeholder tile** (not omitted) — an inert dashed
  tile in `app/(app)/page.tsx`, no `lib`/query code, to be replaced when spec 11 ships.

**Other decisions:**
- **`dueSoon()` includes overdue items by default** (`includeOverdue: true`) — an overdue vaccination is
  exactly what a dashboard should surface; the list styles negative day-counts in the error colour and
  labels them "N days overdue". Spec 13 can pass `includeOverdue: false` if its calendar only wants
  forward-looking events.
- **Herd composition counts goats of every `status`** (active / sold / deceased), matching `/goats`
  which is likewise not status-filtered — so Verification item 1 ("counts matching what's actually in
  `/goats`") holds. If the owner would rather the dashboard count only `active` goats, that's a
  one-line `.eq("status", "active")` on the goat query plus the same filter in the weight/due-soon
  scoping — flagged here so it's a known, cheap change.
  - **Amendment 2026-08-30 (via `UPD-008`, owner request after testing):** the owner confirmed a sold /
    deceased / stolen goat is **not** part of the current herd, so `computeHerdComposition` in
    `lib/dashboard/herd-composition.ts` now filters to `status = 'active'` internally before counting —
    `total`, every per-stage count, the sex split and the buck-to-doe ratio are all active-only,
    unconditionally (a correctness rule of the count, not a display filter). `HerdCompositionGoat`
    gained a `status` field. The weight-growth and due-soon widgets still scope to the full
    barn-filtered goat set (a sold goat's history is still valid data); only the composition counts
    changed. The herd-population *timeline* (`computeHerdTimeline`, `UPD-006`) is event-driven and
    unchanged. See `context/update-specs/008-*.md` §11.
- **Barn-filter scoping** is done by fetching the (barn-filtered) goat id list once and scoping the
  `weights` and `health_records` queries with `.in("goat_id", ids)`, rather than a PostgREST embedded
  filter — simpler and unambiguous for a single-owner dataset.
- **New pure modules:** `lib/dashboard/herd-composition.ts`, `lib/dashboard/due-soon.ts`,
  `lib/dashboard/weight-trend.ts` — all React/Supabase-free, consistent with every other `lib/` domain
  module. `herd-composition` delegates all stage logic to `deriveGoatStage()`; the stock widget reuses
  `isLowStock()` / `isOutOfStock()` verbatim.
- **No migration, no `components/ui/*` changes.** `ERR-001` does not apply — the dashboard has no
  dialog/trigger and passes only plain serialisable data into its two client components
  (`BarnFilter`, `WeightTrendChart`).
