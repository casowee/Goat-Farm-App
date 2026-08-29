# 08 — Weight Records

| Field       | Value                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Phase       | 2 — Core records                                                              |
| Aspect      | Both (schema + RLS + server actions + UI + first chart)                       |
| Status      | `in progress` — ⏸ **PAUSED at the owner's request (2026-08-29)**. Code complete, migration applied, `npm run gen:types` re-run, `tsc` + build clean; **awaiting the owner's hands-on test in the running app** before `done`. The owner chose to build **10 — inventory** first — **no further work on 08** (no polish, no re-verification) until the owner reports their test results. |
| Depends on  | 05 — goat-profiles (done), 06 — family-tree (done)                            |
| Unblocks    | 12 — dashboard-analytics (herd weight-growth charts reuse this data and `lib/weight/`) |

> **Agent:** before writing code, follow the Implementation Workflow in `ai-workflow-rules.md`:
> 1. Read this **feature spec**.
> 2. Check **approved update specs** — the current shape of `goats` is `05 + UPD-001 + UPD-002 + UPD-003`,
>    but this feature adds a *new* table and does not change `goats`.
> 3. Check **error specs** — `ERR-001` (resolved): never pass a client-component element as a `trigger`
>    prop across the server→client boundary into a base-ui `render` slot; build triggers inside the
>    client component.
> 4. Then implement, and pass the Verification Checklist (Section 10) before marking this `done`.
> Also read `architecture-context.md`, `code-standards.md`, and `ui-context.md`.

---

## 1. Overview

Weight Records track a goat's weight over time and show it as a growth curve on the goat profile. This
is the project's **first chart**, so it also establishes the Recharts setup (client component, design
tokens, responsive container, phone-width behaviour) that the analytics dashboard (Spec 12) will build
on.

It is an organizational tool only — it records and displays weights, it does not advise on target
weights, feed rations, or health.

## 2. Goals

- Log a dated weight entry against a specific goat.
- Show a goat's weight history as a chronological list and as a growth-curve line chart.
- Follow the Barns/Health module RLS + CRUD pattern.
- Establish the reusable Recharts chart conventions for the rest of the project.

## 3. Non-Goals (deferred)

- **Herd-wide weight analytics** (average daily gain across the herd, weight-by-stage, etc.) → Spec 12.
- **Target / expected-weight curves or breed growth standards** — recorded points only, no projection.
- **Automatic weight capture from a scale integration** — manual entry only.
- **Bulk weigh-in** (recording 20 goats in one session) — single-goat entry only for v1.
- Reconciling or importing the legacy pre-spec `weight_history` table (see Section 2 note below).

## 4. Match what's actually built

- **IDs are `bigserial` (bigint), not uuid.** `goat_id` is a `bigint` FK to `public.goats(id)`.
- **RLS is a single `for all` owner policy** — `using (auth.uid() = owner_id)` +
  `with check (auth.uid() = owner_id)`, created with `drop policy if exists "<name>" on <table>;` before
  `create policy` (the project's standard convention, as used in `20260829000001_health_records.sql`).
- **`owner_id uuid not null default auth.uid()`** — never set from application code; the column default
  stamps it and RLS scopes every later read/write.
- **Legacy table:** the project has a pre-spec `weight_history` table (keyed on `goat_records.tag_number`,
  columns `record_date` / `weight` / `weight_change` / `notes`, old authenticated-only RLS). It does
  **not** collide with the new `weights` name. Leave it untouched — same approach 07 took with the legacy
  health tables. Legacy-table cleanup remains a separate future job.
- **Migrations are run by the owner** in the Supabase SQL editor; the agent writes the file and then runs
  `npm run gen:types` once the owner confirms it is applied. After a `gen:types` failure the script's
  `>` redirect truncates `types/database.types.ts` — check the file size and re-run.
- **Goats are labelled by `tag`**, falling back to `name` only when a tag is somehow absent
  (`goat.name ?? goat.tag` is the display label elsewhere; weight views live under a single goat so this
  matters only if a global list is ever added).

## 5. Data Model

```sql
create table if not exists public.weights (
  id          bigserial primary key,
  owner_id    uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  goat_id     bigint not null references public.goats (id) on delete cascade,

  weighed_on  date   not null default current_date,
  weight_kg   numeric(6,2) not null check (weight_kg > 0),
  notes       text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists weights_goat_id_idx on public.weights (goat_id);
create index if not exists weights_owner_id_idx on public.weights (owner_id);
```

### RLS

```sql
alter table public.weights enable row level security;

drop policy if exists "weights_owner_policy" on public.weights;
create policy "weights_owner_policy" on public.weights
  for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
```

**Unit:** stored in **kilograms** as `weight_kg` (`numeric(6,2)`, so 0.01–9999.99 kg covers a newborn kid
to any adult). The unit is fixed farm-wide for v1 — see Section 9 Q1. The UI labels the field and axis
"kg" so there is no ambiguity. `numeric` matches the `breed_primary_pct` / `cost` precedent for anything
needing decimals.

## 6. Business Rules

- `weight_kg` is **required** and must be `> 0`. Validate server-side (mirror the DB `check`) so the
  owner gets a friendly message, not a raw Postgres error.
- `weighed_on` defaults to today; a future date is rejected (a weight can't be recorded before it's
  taken). A very old date is allowed (back-filling history).
- `notes` is optional free text.
- Duplicate dates are **allowed** (two weigh-ins on the same day, e.g. before/after a vet visit) — do not
  enforce uniqueness. The chart plots every point in date order.
- Deleting a goat cascade-deletes its weights (`on delete cascade`).

## 7. Server Actions

`app/(app)/weight/actions.ts`, following the Barns/Health action pattern:

- `createWeight(formData)` — validates, inserts `{ ...fields, goat_id }` (never sets `owner_id`),
  `revalidatePath('/goats/<id>')` and `revalidatePath('/weight')`.
- `updateWeight(id, formData)` — validates, `update().eq('id', id)`, revalidates.
- `deleteWeight(id, goatId)` — `delete().eq('id', id)`, revalidates.
- `listWeightsByGoat(goatId)` — returns the goat's rows **oldest-first** (`weighed_on asc, id asc`) so
  the chart and the "change since last" column read naturally; the list view reverses it for display.

A pure helper module `lib/weight/weights.ts` (no React, no Supabase) holds:

- `type WeightPoint = { weighed_on: string; weight_kg: number }`
- `formatKg(n: number): string` — trims trailing zeros (`12.5`, not `12.50`; `12`, not `12.00`).
- `weightDeltas(points: WeightPoint[])` — given oldest-first points, returns each point with the change
  vs. the previous entry (`null` for the first), for the "since last weigh-in" column. Pure and
  unit-testable; Spec 12 can reuse it for average-daily-gain.

## 8. UI/UX

**Goat profile → Weight tab** (`app/(app)/goats/[id]/page.tsx`, currently a "coming soon" placeholder):

- A card headed "Weight" with an **"Add weight" button** (the form dialog).
- **Growth curve:** a Recharts `LineChart` of `weight_kg` (Y) over `weighed_on` (X), newest data on the
  right. Show dots on each point; a single point still renders (just a dot). Y-axis labelled "kg".
  Hidden when there are no entries (show a short empty-state line instead).
- **History list** below the chart, **newest-first**: date, weight (`formatKg` + " kg"), the change since
  the previous weigh-in (▲/▼ + delta, muted when it's the first entry), notes, and Edit / Delete.
- Desktop-first; at phone width the chart shrinks to full width (Recharts `ResponsiveContainer`) and the
  list stacks. Use design tokens for every colour (axis, grid, line, dot) — no raw hex, no default
  Recharts palette. Pull the line colour from `--accent-primary` (warm sand) via a CSS variable read,
  or pass the token's computed value; grid/axis from the border/muted tokens.

**Add/Edit dialog** (`components/weight/weight-form-dialog.tsx`): the same dialog-form pattern as
Barns — **not** a wizard (see Section 8a). Fields: `weighed_on` (date, default today), `weight_kg`
(number, `step="0.01"`, `inputMode="decimal"`, required), `notes` (textarea). Trigger button built
inside the client component (per `ERR-001`).

### 8a. Form Length check (required before the verification gate)

Per the **Forms — Length & Multi-Step Standard** in `ui-context.md`: the add/edit form has **3 controls**
(date, weight, notes), one topic, nothing optional-and-skippable. It is **well under** the ~6–7 threshold,
so a **single continuous form in the dialog is correct** — a wizard would be over-engineering here.
Re-checked at phone width: three short fields fit with no oppressive scroll. (Contrast with 07, whose
illness/treatment path genuinely needed the wizard.)

## 9. Open Questions for Ismail

Resolve, don't guess. If the owner declines to pre-decide, the agent resolves each toward the smallest,
most reversible, convention-consistent choice and records it in Section 11.

1. **Weight unit — kilograms or pounds?** This spec assumes **kg** farm-wide (`weight_kg`), labelled in
   the UI. If the owner weighs in pounds, the cleaner v1 option is still one fixed unit — just `weight_lb`
   instead — rather than a per-entry unit selector. A per-entry or per-farm unit *setting* is a later
   enhancement. Which unit?
2. **Does the Weight tab show any summary figure now** (e.g. "current weight", "gain since birth", or
   "average daily gain")? Or just the chart + list, with all derived weight analytics deferred to
   Spec 12? This spec builds only the chart + list unless told otherwise; `lib/weight/weights.ts` already
   exposes the delta helper if a small "since last weigh-in" figure is wanted.
3. **Should `goats` carry a denormalised `current_weight`** (latest entry, for the goats list/table and
   the dashboard without a join) — mirroring how `goats.breed` is kept as a denormalised label — or is a
   subquery/join fine when those views need it? Adds a column + a write on every weight change if yes.

## 10. Verification Checklist

Automatic (agent) — passing:
- [x] `npm run build` passes; `tsc --noEmit` clean, no `any`.
- [x] Migration applied by the owner (2026-08-29); `npm run gen:types` re-run and matches the stand-in.

Manual (owner, in the running app) — **pending the owner's own hands-on test**:
- [ ] Can add a weight entry to a goat; it appears in the list and as a point on the chart.
- [ ] Adding a second, later, heavier entry draws an upward line between the two points.
- [ ] A future `weighed_on` date is rejected with a friendly message.
- [ ] Zero or negative weight is rejected (server-side, matching the DB check).
- [ ] Editing an entry updates both the list and the chart; deleting removes it from both.
- [ ] The history list is newest-first and shows the change vs. the previous weigh-in.
- [ ] The chart is readable at iPhone width (≈390px) and uses design tokens — no default Recharts colours,
      no console errors or hydration warnings on first paint.
- [x] RLS: a second test user cannot see the first user's weight entries. **✅ confirmed by the owner
      2026-08-29** — logged in as a second test user, saw a completely empty farm (manual owner-performed
      check, not automated). The rest of this manual checklist is still pending.

## 11. Implementation Notes / Decisions

**Section 9 open questions — resolved by the owner 2026-08-29:**

| # | Question | Decision |
|---|----------|----------|
| 1 | Weight unit | **Kilograms.** Stored as `weight_kg numeric(6,2)`, UI labelled "kg" throughout. No per-entry unit. |
| 2 | Summary figure on the Weight tab | **No.** Chart + newest-first history list only; each row shows its change vs. the previous weigh-in. All derived / herd weight analytics stay with Spec 12. |
| 3 | Denormalised `goats.current_weight` | **No.** Weights live only in the `weights` table; Spec 12 joins/subqueries when it needs a current weight. Nothing extra to keep in sync. |

Net effect: the spec is built exactly as written in Sections 5–8.

### Build decisions

- **Chart library:** Recharts (`npm i recharts`), per `architecture-context.md`. `components/weight/weight-growth-chart.tsx` is a `"use client"` component (Recharts needs the DOM). `ResponsiveContainer` for phone width. Colours come from the design tokens via CSS custom properties (`var(--accent-primary)` for the line/dots, `var(--border-default)` / `var(--text-muted)` for grid/axis) read in the component — no raw hex, no default Recharts palette.
- **`listWeightsByGoat` returns oldest-first** (chart order); the history list reverses for newest-first display.
- Migration `supabase/migrations/20260829000002_weights.sql`; hand-added `weights` stand-in in `types/database.types.ts` until `npm run gen:types` runs against the applied migration.

## 12. Roadmap & progress updates — the agent must do these

**On starting 08:** set feature **08** to `in progress` in the "At a glance" table and the
`### 08 — weight-records` header of `feature-specs-roadmap.md` (move the `◀ next` marker off it), set this
spec's Status header to `in progress`, and update `progress-tracker.md` (Current Goal / In Progress)
before writing code.

**On completing 08** (build passes and owner-verified): set **08** to `done` in both roadmap places,
move `◀ next` to **09**, set this spec's Status to `done`, and record the work in `progress-tracker.md`
(Completed entry + dated Session Notes). Update the roadmap and progress tracker in the **same commit** as
the code. Never move on to 09 while 08 is still `in progress`.
