# Feature Specs Roadmap

The order to build in — one spec per unit, following the build phases in `project-overview.md`.
The numbers encode the order. Each spec is written in full detail just before it is built, not all at once.

Order is driven by **dependencies** (what must exist first), not by the exact numbers — some units can flex.

---

## How this roadmap works

### Aspect — which side of the app a unit touches

| Aspect         | Meaning                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| **Front-end**  | UI only — pages, layout, components, client interactivity. No schema, RLS, or data-layer change.          |
| **Back-end**   | Schema / migrations, RLS policies, data access, server actions & route handlers, and shared logic in `lib`. |
| **Both**       | A vertical slice — the same unit touches data/back-end **and** UI to be verifiable end to end.             |

The **Notes** column carries the finer detail used for debugging and file-finding — e.g. `schema/RLS`, `server action`, `lib logic`, `storage`, `UI`.

### Status

| Status        | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `done`        | Built, `npm run build` passes, and verified.                |
| `in progress` | Currently being built.                                      |
| `planned`     | Not started; spec written just before it is built.          |

### Sub-features

A feature is split into sub-features **only when it is too big to build and verify in one go**.
The agent (or owner) decides this **at build time**, using the split rules in `ai-workflow-rules.md` — split if a unit would combine UI + schema, auth/RLS + feature logic, unrelated modules, or anything that can't be verified end to end quickly.
Small features stay a single row. Sub-feature tables below are filled in for finished work (from what actually shipped) and **proposed** for the next big feature; later features are expanded when their spec is written.

### Agent rule (must follow)

> Whenever a feature or sub-feature is completed, **update its Status here to `done` in the same step**, and mirror the detail into `progress-tracker.md`. If a feature is split during the build, add its sub-feature rows here at that point. This file must always match reality, not intent.

---

## At a glance

| Phase | #   | Feature                     | Aspect     | Status        |
| ----- | --- | --------------------------- | ---------- | ------------- |
| 1     | 00  | project-setup               | Both       | `done`        |
| 1     | 01  | design-system               | Front-end  | `done`        |
| 1     | 02  | auth-and-login              | Both       | `done`        |
| 1     | 03  | app-shell                   | Front-end  | `done`        |
| 1     | 04  | barns                       | Both       | `done` *      |
| 1     | 05  | goat-profiles               | Both       | `done` **     |
| 1     | 05a | goat-origin-and-breed       | Both       | `done`        |
| 2     | 06  | family-tree                 | Both       | `done` ***    |
| 2     | 07  | health-records              | Both       | `in progress` **** |
| 2     | 08  | weight-records              | Both       | `in progress` ◀ — **paused** (built; awaiting owner's manual test — no further work until confirmed) |
| 2     | 09  | breeding-and-inbreeding     | Both       | `in progress` ◀ — **resumed at owner's request 2026-09-05**, built ahead of `11` (out of roadmap order, consistent with how `10`/`12` were sequenced earlier). Scope is seasonal/farm-wide breeding only; the batch inbreeding check is **deferred to a future update spec** (Section 6 of the spec keeps the design) |
| 3     | 10  | inventory                   | Both       | `done` ***** — built **ahead of 08/09 at the owner's request** (out of normal roadmap order) and confirmed working by the owner in the running app (2026-08-29) |
| 3     | 11  | sales-and-purchases         | Both       | `planned`     |
| 4     | 12  | dashboard-analytics         | Both       | `done` ****** — built **ahead of 09 and 11 at the owner's request** (out of roadmap order) and confirmed working by the owner in the running app (2026-08-29); Sales widget deferred to a "coming soon" placeholder until 11 exists |
| 4     | 13  | calendar                    | Both       | `planned`     |
| 5     | 14  | todos-reminders             | Both       | `planned`     |
| 5     | 15  | health-reference (Doctor)   | Front-end  | `planned`     |
| 5     | 16  | reports-pdf                 | Both       | `planned`     |

`*` Barns code is complete and verified. **Cross-account RLS: confirmed (2026-08-29)** — see the cross-cutting note below.
`**` Goat profiles core (schema, stage logic, CRUD, list/filter, form, detail page) is complete and verified; photo upload was deferred to its own follow-up increment per the owner. **Cross-account RLS: confirmed (2026-08-29)** — see the cross-cutting note below.
`***` Family tree (parents/pedigree, multi-breed composition, parent-based breed computation, barn-move history) is complete, browser-verified, and **tested and confirmed working by the owner in the running app (2026-08-28)**. **Cross-account RLS on `goat_breed_composition` / `goat_barn_moves`: confirmed (2026-08-29)** — see the cross-cutting note below. Minor UX refinements to family-tree / breed composition may follow later.
`****` Health records (one `health_records` table, CRUD server actions, 3-step add/edit wizard, goat-profile Health tab) is **code-complete**: migration applied by the owner, types regenerated for real (`npm run gen:types`), `npm run build` + `tsc` clean. All three Section 9 open questions resolved by the owner (defer global page, plain-number doses/day, no cost roll-up). The **cross-account RLS** part of the Section 10 checklist is **confirmed (2026-08-29)** — see the cross-cutting note below; **the rest of the owner's own hands-on test of the Section 10 checklist is still outstanding** before 07 is `done`.
`*****` Inventory (feed support + `/inventory` list page, Medicine/Feed tabs, add/edit/delete dialog, low-stock badges, `lib/inventory/stock.ts`) was built **ahead of 08/09 at the owner's request** and **tested and confirmed working by the owner in the running app (2026-08-29)**.
`******` Dashboard & Analytics (`/` home page: herd composition + adult buck-to-doe ratio, farm-wide monthly weight-growth chart, health follow-ups due-soon list, low-stock widget, barn filter) was built **ahead of 09/11 at the owner's request** and **tested and confirmed working by the owner in the running app (2026-08-29)**. No migration (read-side only). New pure modules `lib/dashboard/{herd-composition,due-soon,weight-trend}.ts` — `dueSoon()` is written to be reused by spec 13's calendar. Task 1 updated `architecture-context.md`'s Data Model to describe the real `health_records` table. Sales-over-time widget is a labelled "coming soon" placeholder until 11 ships. Owner has minor refinements in mind — an update spec will follow. Task 1 (schema reconcile) was a no-op — `inventory_items` already matched `UPD-005`, no migration. Nav cleanup shipped with it: `/medicine` stub → `/inventory`; the `/vaccinations` and `/deworming` stubs were removed (spec 07 made those record types per-goat). **Expected to need refinement once real stock data is collected through farm use** (quantities, thresholds, units) — flagged in `progress-tracker.md`, no update spec filed yet. The `◀ next` marker stays on 08/09.

> **Cross-account RLS check — confirmed 2026-08-29 (manual, owner-performed).** The owner created a second
> test user, logged in as them, and confirmed a completely empty farm — none of the primary account's
> goats, barns, health records, weight records, or inventory items were visible. This resolves the
> standing "owner-only, needs their real credentials" RLS-isolation item for **every owner-scoped table
> built so far**: `barns`, `goats`, `goat_barn_moves`, `goat_breed_composition`, `health_records`,
> `weights`, `health_condition_presets`, `inventory_items`. Not an automated test — a manual check by the
> owner in the running app. Future owner-scoped tables (09 `breeding_settings` / `breeding_season_occurrences` /
> `breeding_season_bucks` / `breeding_season_templates` [shipped 2026-09-05], 11 `sales_purchases`, …)
> still need their own confirmation as they ship.

---

## Phase 1 — Foundation

### 00 — project-setup · Both · `done`
Scaffold Next.js + TypeScript + Tailwind and the folder structure. *(built manually before the spec workflow.)*

| Sub-feature                                             | Aspect    | Status | Notes                                         |
| ------------------------------------------------------- | --------- | ------ | --------------------------------------------- |
| Next.js 16 + TypeScript + Tailwind scaffold             | Front-end | `done` | App Router, Node 20+                           |
| Folder structure (`app`, `components`, `lib`, `types`, `supabase`) | Both | `done` | boundaries per `architecture-context.md`      |
| Supabase browser/server clients                         | Back-end  | `done` | actually landed in **02**; noted here for scope |

---

### 01 — design-system · Front-end · `done`
Desert tokens, fonts, shadcn primitives, `cn()`, and a style-check page.

| Sub-feature                                        | Aspect    | Status | Notes                                              |
| -------------------------------------------------- | --------- | ------ | -------------------------------------------------- |
| Desert palette tokens in `globals.css`             | Front-end | `done` | `@theme inline`; `bg-base` as scoped `@utility`    |
| shadcn/ui init + base primitives                   | Front-end | `done` | Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea; `@base-ui/react` composition |
| Geist Sans / Mono via `next/font`                  | Front-end | `done` | applied as CSS vars on `<html>`                    |
| `cn()` in `lib/utils.ts`                           | Front-end | `done` | —                                                  |
| `/style-check` demo page                           | Front-end | `done` | verified in a real browser                         |

---

### 02 — auth-and-login · Both · `done`
Supabase email/password, protected routes, sign in/out, branded login page.

| Sub-feature                                          | Aspect    | Status | Notes                                                     |
| ---------------------------------------------------- | --------- | ------ | --------------------------------------------------------- |
| Supabase SSR clients (`client.ts`, `server.ts`)      | Back-end  | `done` | `@supabase/ssr` pattern                                   |
| Session refresh + route protection                   | Back-end  | `done` | `proxy.ts` (Next 16 renamed `middleware`→`proxy`) + `lib/supabase/middleware.ts` |
| `login()` server action + `signOut()`               | Back-end  | `done` | `app/login/actions.ts`, `lib/actions/auth.ts`            |
| Branded login page                                   | Front-end | `done` | client comp, `useActionState`/`useFormStatus`, logo placeholder |
| `(app)/` route group + server-side auth guard        | Both      | `done` | defense in depth alongside proxy                          |
| RLS SQL + owner account creation                     | Back-end  | `done` | run by the owner in the Supabase dashboard               |

---

### 03 — app-shell · Front-end · `done`
Sidebar + top-bar layout, responsive drawer, empty module routes.

| Sub-feature                                     | Aspect    | Status | Notes                                                  |
| ----------------------------------------------- | --------- | ------ | ------------------------------------------------------ |
| shadcn `sidebar` block + deps                   | Front-end | `done` | pulled Separator, Skeleton, Tooltip, Sheet, `use-mobile` |
| Nav config `lib/nav.ts`                         | Front-end | `done` | single source of nav items                             |
| `app-sidebar.tsx`                               | Front-end | `done` | active route, footer sign-out, closes drawer on mobile tap |
| `top-bar.tsx`                                   | Front-end | `done` | `SidebarTrigger` + page title, sticky                  |
| Stub pages for 9 routes                         | Front-end | `done` | shared `module-placeholder.tsx`                        |

---

### 04 — barns · Both · `done` *
First real CRUD module — the pattern every later module copies. Built before goats, since a goat needs a barn.

| Sub-feature                                         | Aspect    | Status        | Notes                                              |
| --------------------------------------------------- | --------- | ------------- | -------------------------------------------------- |
| `barns` table + RLS + `owner_id` default            | Back-end  | `done`        | owner ran the SQL; RLS via `auth.uid()`            |
| Generated DB types (`gen:types` script)             | Back-end  | `done`        | `npx supabase gen types …`; covers all 9 tables    |
| Barns nav entry                                     | Front-end | `done`        | added to existing `lib/nav.ts`                     |
| List page (RLS-scoped, empty state)                 | Front-end | `done`        | Server Component                                   |
| `create/update/deleteBarn` server actions           | Back-end  | `done`        | each `revalidatePath('/barns')`                    |
| `barn-form-dialog` (add/edit reuse)                 | Front-end | `done`        | `useActionState`/`useFormStatus`                   |
| `delete-barn-dialog` (confirm)                      | Front-end | `done`        | —                                                  |
| Owner cross-account RLS test                        | —         | `done`        | confirmed manually by the owner 2026-08-29 (2nd test user sees an empty farm) |
| Owner authenticated CRUD walk-through               | —         | `in progress` | **owner only** — needs their real login            |

---

### 05 — goat-profiles · Both · `done` (photo upload deferred to a follow-up)
Goats table + CRUD; barn assignment at registration; sex, DOB, reproductive state; derived stage; photo upload; list, detail, and barn filter.
**Depends on:** 04.
This one is clearly too big for a single pass — proposed split below (confirm when the spec is written):

| Sub-feature (proposed)                                      | Aspect    | Status    | Notes                                                        |
| ----------------------------------------------------------- | --------- | --------- | ------------------------------------------------------------ |
| `goats` table + RLS + `owner_id`                            | Back-end  | `done`    | schema/RLS; `bigserial` id + single "owner full access" policy to match barns; `tag` required / `name` optional per owner |
| Goat CRUD server actions                                    | Back-end  | `done`    | `app/(app)/goats/actions.ts`, mirrors the barns action pattern |
| Barn assignment at registration                             | Both      | `done`    | required in the form; validated server-side against the owner's barns; `barn_id` stays nullable in DB |
| Derived stage function in `lib`                             | Back-end  | `done`    | pure `lib` logic (Doe/Doeling/Buck/Buckling/Wether/Kid); thresholds confirmed with owner: kidMax 6mo, youngStockMax 12mo |
| Photo upload to Supabase Storage                            | Both      | `planned` | store only the URL on the goat record; deferred to its own follow-up increment per the owner (confirmed 2026-08-26) — goats are fully usable without it |
| Goats list page + barn filter                               | Front-end | `done`    | table → stacked cards on phone; `?barn=` query param          |
| Goat add/edit form dialog                                   | Front-end | `done`    | reuse the barns dialog pattern; conditional reproductive-state field for males |
| Goat detail page (profile + history section stubs)          | Front-end | `done`    | history tabs filled by later modules                         |

---

### 05a — goat-origin-and-breed · Both · `done`
Follow-up to 05: breed as a dropdown with an "Other" option, purebred-vs-crossbred breed composition (primary/secondary breed + numeric percentage for grading-up), and origin (born here / purchased) with a conditional purchase date. **Depends on:** 05 (already `done`, already applied — this adds a new additive migration, does not touch 05's).

| Sub-feature                                                 | Aspect    | Status    | Notes                                                        |
| ------------------------------------------------------------ | --------- | --------- | ------------------------------------------------------------ |
| Additive migration: `origin`, `purchase_date`, `breed_secondary`, `breed_primary_pct` + check constraints | Back-end  | `done`    | `supabase/migrations/20260826000002_goat_origin_breed.sql`; `origin` as enum to match `sex`/`status`; types regenerated |
| `lib/goats/breeds.ts` (breed list, grading steps, `BreedComposition` helpers) | Back-end  | `done`    | pure, portable, no React |
| Goat form: breed dropdown + Other, purebred/cross toggle, composition fields | Front-end | `done`    | `components/goats/goat-form-dialog.tsx` |
| Goat form: origin select + conditional purchase date         | Front-end | `done`    | same file |
| Server-action validation (composition + origin/purchase-date rules) | Back-end  | `done`    | `app/(app)/goats/actions.ts` |
| List/detail pages show formatted breed + origin               | Front-end | `done`    | `formatBreed()`; added an Origin column/line to both |

**Follow-ups shipped as separate specs (not new roadmap rows):** `context/update-specs/002-goat-form-and-breed-cross.md` (`UPD-002`, `done`) restructured the goat form around an origin segmented control and replaced the purebred/crossbred toggle + percentage picker with a unified breed dropdown (`Crossed…` computed via `crossOfPureBreeds()`); `context/error-specs/001-goat-dialog-trigger-hydration.md` (`ERR-001`, `Resolved`) fixed a dialog-trigger hydration mismatch in the same file and the equivalent pattern in `barn-form-dialog.tsx` and the goat detail page; `context/update-specs/003-goat-form-multistep-wizard.md` (`UPD-003`, `done`) converted the goat form into a 4-step wizard (Identity & Origin → Breed & Housing → Parents [skippable] → Notes & Review) and established the reusable, goat-agnostic stepper pattern in `components/forms/` (`use-wizard-steps.ts`, `step-indicator.tsx`, `wizard-nav.tsx`) — no schema change, one write on final Save — which `07` and `09` should reuse per the "Forms — Length & Multi-Step Standard" now in `ui-context.md`. `context/update-specs/008-goat-search-filter-duplicate-and-reasoned-removal.md` (`UPD-008`, **`in progress`** — built 2026-08-30, awaiting the owner's hands-on test) adds goats-list search + Sex/Stage/Barn filters (`lib/goats/search.ts`, `lib/goats/tag.ts`, client `components/goats/goats-list.tsx`; the old `searchParams` barn filter + `barn-filter.tsx` are gone), a non-blocking duplicate-tag warning on the goat form + a "show possible duplicates" toggle, and a reason-based removal dialog (`components/goats/remove-goat-dialog.tsx`, replacing `delete-goat-dialog.tsx`) where only "Wrong registration" hard-deletes — Sold/Death/Stolen preserve the row via the new shared `record_goat_departure` RPC (two additive migrations: `20260830000001_goat_status_stolen.sql`, `20260830000002_record_goat_departure.sql`), which also becomes the single Sale/Death path for `UPD-006`'s `createHerdEvent`. `context/update-specs/009-goat-list-age-and-breed-filter.md` (`UPD-009`, **`done`** — built + owner-verified in the running app 2026-08-30) then builds on `UPD-008`: the goats list swaps its Status column for an **Age** column (`lib/goats/age.ts` `formatAge`), defaults to showing **Active** goats only, and adds **Breed** + **Status** filters (options derived from real data) alongside Search / Sex / Stage / Barn — `filterGoats()` is extended with `status` + `breed` dimensions, not replaced. The Age column header is itself a sort toggle (unsorted → oldest-first → youngest-first, sorting on numeric `ageInMonths`, applied on top of the active filters). Read/filter only, no migration. Task 1 confirmed breed lives in the `goat_breed_composition` child table (already embedded in the list query). Also re-verified `UPD-008`'s active-only dashboard herd count. `context/update-specs/010-newborn-temp-tag.md` (`UPD-010`, **`done`** — built + owner-verified in the running app 2026-08-30) extends 05 / 06 and reuses the `UPD-003` wizard: an "Add newborn kid" action on a doe's own detail page launches the wizard with Dam + Origin locked and the Tag step replaced by an auto-generated `{dam_tag}-K{n}` preview (`lib/goats/temp-tag.ts`, collision-checked via `normalizeTag()` equivalence; the server regenerates it as the authority), marking the record `is_temp_tag = true` (one additive migration, `20260830000003_goat_is_temp_tag.sql`, applied by the owner + types regenerated). A "Temp" badge (`components/goats/temp-tag-badge.tsx`) shows wherever the tag appears; the doe's profile gains a lifetime "Total kids" count (direct RLS-scoped count query); the edit form gains a "Temporary tag ⇄ Permanent tag" one-way promote toggle; and `UPD-008`'s duplicate-tag warning + review now exclude `is_temp_tag` goats. `06`'s parent-based breed computation is offered (never auto-applied) once an in-system sire with a recorded breed is also picked. Section 14 open questions confirmed by the owner: general Add Goat wizard stays out of scope; `{dam_tag}-K{n}` format kept.

---

## Phase 2 — Core records

### 06 — family-tree · Both · `done`
Sire/dam links (in-app or external by name), ancestry / pedigree view, multi-breed composition, parent-based breed computation, and barn-move history. **Depends on:** 05. Built in four verifiable increments (per the 06 spec, Section 4):

| Sub-feature                                                     | Aspect              | Status | Notes                                                                 |
| -------------------------------------------------------------- | ------------------- | ------ | -------------------------------------------------------------------- |
| 6a — parents & pedigree (form pickers, pure pedigree walk, Lineage tab) | Both        | `done` | parent columns already existed on `goats` (05 migration) — no migration needed; browser-verified (pedigree renders all node kinds, cycle-safe, zero console warnings at 1280/390px) |
| 6b — multi-breed composition (`goat_breed_composition` child table) | Back-end        | `done` | 3 owner-run migrations (`20260828000001` table+backfill, `20260828000003` drops `breed_secondary`/`breed_primary_pct` + their checks); `lib/goats/breeds.ts` rewritten to a `{breed,pct}[]` list; form + list + detail + pedigree read/write the new shape; `goats.breed` kept as the primary-breed label; browser-verified |
| 6c — parent-based breed auto-computation (`composeFromParents`) | Back-end · logic    | `done` | pure averaging in `lib/goats/breeds.ts` (unit-checked incl. the 3-breed example); "Use parents' breed" ⇄ "Enter manually" toggle in the born-here form path, shown only when both parents are in-system goats, never auto-applied; browser-verified (Boer100 × Boer/Somali 50/50 → 75/25 live in the UI) |
| 6d — barn-move history (`goat_barn_moves` table, move action, history list) | Both        | `done` | `goat_barn_moves` migration (`20260828000002`); `moveGoatToBarn` action (two-step, non-atomic) + `move-barn-dialog.tsx` (trigger built inside per `ERR-001`) + `barn-move-history.tsx` on the detail page; browser-verified |

### 07 — health-records · Both · `in progress` (code-complete; awaiting the owner's hands-on test)
Health history, vaccinations, deworming, and medicine records; each dated, with next-due dates where relevant. **Depends on:** 05.
The spec (`context/feature-specs/07-health-records.md`) consolidates all health events into **one** `health_records` table (record_type enum + course fields + next_due_date), rather than the per-record-type split originally proposed here — this also sidesteps the legacy `vaccinations` / `medicine_records` table-name collision, since `health_records` is a fresh, unused name. Built and shipped as one unit; code, migration and types are done, only the owner's in-app verification remains.

| Sub-feature                                                        | Aspect    | Status | Notes                                                                                     |
| ----------------------------------------------------------------- | --------- | ------ | ---------------------------------------------------------------------------------------- |
| `health_records` table + 2 enums + indexes + RLS                   | Back-end  | `done` | `supabase/migrations/20260829000001_health_records.sql`; owner-run; `bigserial`/`bigint` + single `for all` policy per convention; legacy tables untouched |
| Generated DB types regenerated                                     | Back-end  | `done` | real `npm run gen:types` after the migration; matches the hand-added stand-in exactly     |
| `lib/health/records.ts` (pure type/status rules)                   | Back-end  | `done` | course vs follow-up types, label maps, `defaultStatusForType`                             |
| `create/update/delete/listByGoat` server actions                   | Back-end  | `done` | `app/(app)/health/actions.ts`; conditional fields stripped server-side by record type    |
| Add/edit dialog (3-step wizard, reuses `components/forms/`)         | Front-end | `done` | `components/health/health-record-form-dialog.tsx`; conditional fields per Section 6       |
| Goat-profile Health tab (chronological, newest-first)              | Front-end | `done` | `app/(app)/goats/[id]/page.tsx` + `health-record-list.tsx` + `delete-health-record-dialog.tsx` |
| Global `/health` page (all goats, filterable)                      | —         | deferred | Section 9 Q1 — owner chose to defer; `/health` keeps its placeholder                    |
| Owner's cross-account RLS check on `health_records` | — | `done` | confirmed manually by the owner 2026-08-29 (2nd test user sees no health records) |
| Owner's hands-on test of the rest of the Section 10 checklist | — | `in progress` | the owner tests every spec themselves before it closes; not yet done for 07 |

**Follow-ups shipped as separate specs (not new roadmap rows):**

- `context/update-specs/004-health-record-presets.md` (`UPD-004`, `done`) turned the health-record dialog's free-text Title field into a searchable **combobox** filtered by `record_type`, backed by a new `health_condition_presets` catalogue (seeded farm-wide defaults with `owner_id` null + the owner's own custom presets), with a "+ Add new" reveal that saves a typed title back as an owner-scoped preset. Migration `20260829000003_health_condition_presets.sql` with **split** select/insert/update/delete RLS (deliberate deviation from the single `for all` convention — see the spec's Section 6) so seeded global presets are readable but never editable/deletable by any authenticated user at the DB layer. Added the shadcn `combobox` + `input-group` primitives (`components/ui/`). Owner applied the migration, regenerated types (byte-identical to the stand-in), and confirmed it works in the running app (2026-08-29).
- `context/update-specs/005-treatment-medication-inventory.md` (`UPD-005`, `done`) makes the health-record medication/product fields searchable comboboxes over a new **`inventory_items`** table (reusing `UPD-004`'s combobox), each option showing name + quantity and a "⚠ No stock recorded" warning at quantity 0 (still selectable). Migrations `20260829000004_inventory_items.sql` (`bigserial` id, single `for all` owner RLS, `inventory_item_type` enum `medicine`/`feed`, 13 drugs seeded at quantity 0) and `20260829000005_inventory_items_category.sql` (adds a nullable `medicine_category` enum column + backfill, so the **Deworming** step — which gained a new optional product field — offers only dewormers and the **Treatment** step offers everything else). `health_records.medication` stays plain text (no FK). Owner applied both migrations, regenerated types (byte-identical to the stand-in), and confirmed it works in the running app (2026-08-29). **`inventory_items` is forward-provisioned for spec 10 — see the Phase 3 Inventory note; spec 10 extends this table, it does not recreate it.**

### 08 — weight-records · Both · `in progress` — ⏸ PAUSED at the owner's request
Weight entries per goat + growth chart (Recharts — the project's first chart). **Depends on:** 05, 06.

> ⏸ **Paused, not abandoned (owner's decision, 2026-08-29).** 08 is **code-complete** and its migration
> is applied, but it is still **awaiting the owner's own hands-on click-through test** in the running app.
> The owner has chosen to build **10 — inventory** first. **Do not do any further work on 08** — including
> "improvements", polish, or re-verification — until the owner reports their test results. Its status stays
> `in progress` (not `done`); this pause is a scheduling note only.
Spec: `context/feature-specs/08-weight-records.md`. One `weights` table (`goat_id`, `weighed_on`,
`weight_kg`, `notes`), CRUD server actions + a pure `lib/weight/weights.ts` delta helper, a single-form
add/edit dialog (3 fields — no wizard, per the Form Length check), and the goat-profile Weight tab
(growth `LineChart` + newest-first history list). No name collision with the legacy `weight_history`
table — left untouched, same as 07's legacy health tables.

### 09 — breeding-and-inbreeding · Both · `in progress` — resumed 2026-09-05, built ahead of 11
Seasonal, farm-wide breeding: the farm runs open-pasture group breeding (1 buck : ~30 does), so 09 tracks
**breeding seasons** ("males in" / "males out" windows) and a computed kidding window, **not** individual
sire+dam mating records. **Depends on:** 06 (done), `UPD-008` (active-goat filtering, reused for the buck
picker), `lib/dashboard/herd-composition.ts` (reused for buck/doe counts). Spec:
`context/feature-specs/09-breeding.md`.

*Split as built:* four additive migrations (`breeding_settings`, `breeding_season_occurrences`,
`breeding_season_bucks` — a season can run more than one buck — and `breeding_season_templates` — named,
editable recurring windows, replacing the old flat array) + server actions `(Back-end)` · pure
`lib/breeding/{kidding-window,eligible-males,templates,capacity,status,reminders,timeline}.ts`
`(Back-end · logic)` · settings form + templates manager, season list + multi-buck log dialog, seasonal
timeline, an "Approve season" flow (opens the same log dialog pre-filled from a template), dashboard
status line + Due-soon reminder merge `(Front-end)`. The buck picker is a multi-select (chips) filtered
through `eligibleBreedingMales` — Kids are never shown, Bucklings sit behind a toggle.

> ▶ **Resumed at the owner's request (2026-09-05), built ahead of `11`** — out of roadmap order, the same
> way `10`/`12` were sequenced earlier. The **batch inbreeding check (Section 6 of the spec) is deferred to
> its own future update spec** (owner's decision 2026-09-05) — the design is kept in the spec, reusing
> `06`'s pedigree walk unchanged, so it is a cheap addition later. `lib/breeding/inbreeding-check.ts` is
> **not** built in this pass and no warning is wired into the season form.
>
> **Cross-account RLS on `breeding_settings` and `breeding_season_occurrences` still needs the owner's
> second-account confirmation** as it ships (standing rule for new owner-scoped tables).

---

## Phase 3 — Operations

### 10 — inventory · Both · `done` — built ahead of 08/09 at the owner's request
Medicine and feed stock, quantities, low-stock awareness. **Depends on:** 03.
Built as a single unit: extended the forward-provisioned `inventory_items` with feed support (no schema
change — Task 1 was a no-op), a `/inventory` list page (Medicine/Feed tabs, table→card responsive,
low-stock badges, per-tab empty states), `list/create/update/deleteInventoryItem` server actions, one
add/edit dialog + delete confirm, and `lib/inventory/stock.ts` (`isLowStock` + `isOutOfStock` +
`stockStatus`). Nav cleanup shipped with it — `/medicine` → `/inventory`; `/vaccinations` and
`/deworming` stub routes removed (spec 07 made those per-goat). **Owner tested it in the running app and
confirmed it works (2026-08-29).**

> ▶ **Built out of order (owner's decision, 2026-08-29).** The normal order is 08 → 09 → 10; the owner
> built 10 first, then **12 — dashboard-analytics** (also out of order, ahead of 11), both while 08
> awaits their test and 09 is deferred. Both are now `done` and owner-tested. The `◀ next` marker stays
> on **08 / 09** — they remain the real next-up items; 13 is **not** automatically next just because 12
> shipped.

> **Expected refinement (flagged, not yet specced):** once the owner has collected real stock data
> through actual farm use, the quantities, low-stock thresholds, and possibly the unit list are likely
> to need adjusting. No update spec is filed yet — this note just keeps the expectation from being lost.

> ⚠️ **`inventory_items` ALREADY EXISTS — do not recreate it.** *(Historical note — 10 shipped 2026-08-29
> with no migration; Task 1 confirmed the table already matched. Kept here for context.)* `UPD-005`
> (`context/update-specs/005-treatment-medication-inventory.md`, 2026-08-29) forward-provisioned this
> table early so the health-record medication/product fields had a real drug list to pick from. What
> already exists (migrations `supabase/migrations/20260829000004_inventory_items.sql` +
> `20260829000005_inventory_items_category.sql`):
> `inventory_items` (`bigserial` id, `owner_id`, `type inventory_item_type` enum = `medicine` / `feed`,
> `name`, `quantity numeric(10,2) default 0`, `unit` nullable, `low_stock_threshold` nullable,
> `category medicine_category` nullable = `antibiotic` / `vitamin_support` / `anti_inflammatory` /
> `dewormer` / `other`, `created_at`, `unique (owner_id, type, name)`), a single `for all` owner RLS
> policy, a `type` index, and the `inventory_item_type` + `medicine_category` enums.
> It is seeded with 13 medicines at `quantity 0` (each backfilled with a `category`) and is currently
> **medicine-only in practice** (feed support, quantity/restock editing, low-stock thresholds & alerts,
> a real category picker, and a dedicated Inventory screen were all explicitly deferred to spec 10).
> **Spec 10 must read `UPD-005` first and EXTEND this table with an additive migration — not
> `create table` it again.** The `low_stock_threshold` / `unit` columns, the `feed` enum value, and the
> `other` category value are already present but unused, ready for 10 to wire up.

### 11 — sales-and-purchases · Both · `planned`
Sale/purchase records, optionally linked to goats. **Depends on:** 05.
*Likely single unit:* `sales_purchases` table + actions `(Back-end)` · list + form `(Front-end)`.

---

## Phase 4 — Insight

### 12 — dashboard-analytics · Both · `done` — built ahead of 09/11 at the owner's request, owner-tested 2026-08-29
Herd size and composition (counts by stage, male vs female, buck-to-doe ratio), weight growth, vaccinations/deworming due soon, sales over time, stock levels; barn filter. **Depends on:** the core data modules.
*Likely split:* aggregation queries / derivations `(Back-end · logic)` · each chart & the barn filter `(Front-end)`.

> ✅ **`UPD-006` (Dashboard Redesign & Herd Population Timeline) — `done`, owner-verified 2026-08-29.**
> `context/update-specs/006-dashboard-redesign-and-herd-population.md` layered on this `done` feature: a
> mobile-first card/donut redesign with an extended `top-bar.tsx` (back-button / filter / action-icon
> slots; action icon = a CSV export of the on-screen summary — the v1 stand-in until spec 16), plus a new
> **"Herd growth"** timeline section backed by a new `herd_events` table
> (`supabase/migrations/20260829000006_herd_events.sql`, owner-run) + a `log_herd_event` RPC that keeps a
> Sale/Death event and the goat's `status` in sync atomically. **Cross-account RLS on `herd_events` still
> needs the owner's second-account confirmation** as it ships (standing rule for new owner-scoped tables).
> When drafted, **spec 11 must integrate with `herd_events` rather than creating a second "a goat left the
> herd" concept** — same forward-provisioning pattern as `UPD-005`'s inventory note.
>
> **Amendment 2026-08-29 (owner request, via `UPD-007`):** the entire **"Herd growth" dashboard section
> is deactivated** — the running-total chart plus the "Log herd event" trigger are hidden together as
> one unit behind `const SHOW_HERD_GROWTH_SECTION = false;` in `app/(app)/page.tsx`. **Deactivation, not
> deletion** — `herd_events`, the `log_herd_event` RPC, `lib/dashboard/herd-timeline.ts`,
> `createHerdEvent`, and the dialog components are all intact; flip the flag to restore. Log Herd Event
> is not currently reachable from the dashboard. Detail in `006-*.md` §14.

> 🔧 **`UPD-007` (Newborn Kids Period Chart & Event Type Simplification) — `in progress`.**
> `context/update-specs/007-newborn-period-chart-and-event-simplification.md`. No migration. Adds
> `lib/dashboard/newborn-periods.ts` (`computeNewbornsByPeriod` — pure, emits every month in the selected
> window including zero-count months; counts every `born_here` goat by DOB regardless of life stage), a
> **"Newborn Kids"** dashboard bar chart with a **selectable end date (default today)** + a 3 / 6 /
> 12-month window applied backward from it (max 12 months) as an early proxy for breeding-season patterns
> until spec 09 exists, and a presentation-only reordering of the Log Herd Event type picker (Sale/Death
> primary; Other addition/removal grouped as secondary — enum/schema/validation untouched).
> **Two owner amendments (2026-08-29), folded into the `006` / `007` spec files (no new spec):** the
> selectable end date above, and **deactivating the entire "Herd growth" section** (see the `UPD-006`
> note above — hidden behind a flag, all code/schema kept). A separate owner concern that the Log Herd
> Event form is "not optimal" beyond the ordering is noted as an open follow-up in `progress-tracker.md`.

> ▶ **Built out of order (owner's decision, 2026-08-29).** 12 is being built next, ahead of `09` (deferred)
> and `11` (not started). The **Sales-over-time widget is deferred until `11` exists** — the dashboard
> ships with a clearly-labelled "coming soon" placeholder tile in its place (owner's choice, 2026-08-29).
> The `◀ next` marker stays on `08` / `09`.

> ⚡ **`UPD-011` (Dashboard Performance, Compact Newborn Chart & App-Shell) — `in progress`, built
> 2026-09-05, awaiting the owner's hands-on iPhone test.**
> `context/update-specs/011-dashboard-performance-and-app-shell.md`. No migration. **11a:** measured a real
> sequential-Supabase-query waterfall (~1.67s for the dashboard's 7 queries) and parallelized it into two
> `Promise.all` phases (~0.35s for the same batch); code-split the Recharts-backed `CompositionDonut` /
> `WeightTrendChart` via `next/dynamic({ ssr: false })` behind `<Suspense>` skeletons so the ~390KB chart
> chunk no longer blocks the rest of the page. **11b (reversed 2026-09-05 — see amendment below):**
> `components/dashboard/newborn-periods-chart.tsx` is a Recharts `BarChart` again (height-capped at 144px,
> abbreviated month labels), not the vertical list first shipped; zero-count months still render as a
> visible bar per `UPD-007`. **11c:** `app/manifest.ts` + `app/icon.tsx` /
> `app/apple-icon.tsx` / `app/manifest-icon/route.tsx` (a generated placeholder monogram,
> `lib/branding/app-icon.tsx`, owner-confirmed acceptable for now) + `appleWebApp` metadata
> (`app/layout.tsx`, `statusBarStyle: 'black-translucent'`, owner-confirmed) for a standalone/full-screen
> iOS install; `proxy.ts`'s matcher extended so the manifest/icons stay reachable without an authenticated
> session. No service worker built (deliberately out of scope). **Still needs the owner's own hands-on
> test** (real iPhone re-install) before this closes — see `progress-tracker.md`.
>
> **Refinement round 1 (2026-09-05, owner tested the first build on a real iPhone, folded in while still
> `in progress`):** dashboard card order changed to Herd composition → Sex ratio → Newborn Kids → Weight
> growth → Due soon → Stock levels; the Newborn Kids widget reverted from 11b's vertical list to a
> compact Recharts column chart (144px-tall, abbreviated month labels); every dashboard card's horizontal
> padding tightened 16px → 12px. Full detail + the verification-method caveat (no physical iPhone/browser
> available to confirm the 12-month no-scroll claim directly) in the spec's own dated Amendment and
> `progress-tracker.md`.
>
> **Refinement round 2 (2026-09-05, from the live post-round-1 dashboard, folded in while still
> `in progress`):** the summary-stats row (8 tiles) is **deleted** — `components/dashboard/
> summary-stats.tsx` removed entirely, its numbers already duplicated in the donuts below it (the one
> figure lost is the row's own Doelings+Bucklings "Young stock" rollup, flagged for the owner per their
> own request to confirm that's fine). Both donuts (`composition-donut.tsx`) now show every slice's count
> always visible via a custom Recharts label (inside the arc for slices ≥12% of the total, outside with a
> leader line for thinner ones) — no click/hover/tap needed. Donuts grew from 176px to 256px to fill the
> freed space. Full detail + the verification caveat (still no physical iPhone/browser available in this
> environment) in the spec's own dated Amendment and `progress-tracker.md`.
>
> **Layout-bug investigation (2026-09-05):** the owner reported the Newborn Kids card rendering wider than
> the donut cards on a real iPhone. A real headless browser (Chromium + WebKit, Playwright, retried
> successfully this round) was used with a temporary, owner-approved auth bypass to load the real
> components with realistic fake data — **the bug did not reproduce** in either engine at 3/6/12-month
> windows (every card measured 358px, zero horizontal overflow); the auth bypass and debug route were both
> fully reverted immediately after. `min-w-0` was still added defensively to the grid container, every
> `Card`, and the chart-wrapper divs — the standard fix for "one grid item's content forces the row wider,"
> applied as zero-risk hardening rather than a confirmed-bug fix. Full detail in the spec's own dated
> Amendment and `progress-tracker.md`.

> 🐐 **`UPD-012` (Doe Reproductive Performance Tracking) — `done`, built + owner-tested in the running
> app 2026-09-05.** `context/update-specs/012-doe-performance-tracking.md`. Reads only
> already-shipped goat / lineage data (05, 06 `dam_id`) + health records (07, read-only) — **does not
> depend on `09`**. Flags currently-active does that are underperforming: overdue since their last
> kidding, a long historical average interval, or past breeding-eligible age with zero kiddings (a doe
> can carry more than one flag; a doe too young to judge — by **raw age**, not life-stage label — is
> excluded, not flagged). The flag is **never stored** — recomputed live on every page load, so a
> settings change reflects immediately. Two additive migrations the owner must run + `npm run
> gen:types`: `20260905000005_doe_performance_settings.sql` (one row per owner — max expected interval
> months default 13, breeding-eligible age months default **12**) and
> `20260905000006_doe_performance_notes.sql` (`doe_performance_category` enum + accumulating
> owner-recorded investigation notes). Both `bigserial` id, single `for all` owner RLS; types hand-added
> to `types/database.types.ts` as the stand-in until `gen:types` runs. Pure logic in
> `lib/breeding/doe-performance.ts` (`computeKiddingEvents` — groups kids born within
> `KIDDING_EVENT_GROUPING_DAYS = 3` into one event; `computeDoePerformance` — returns `null` for a
> not-yet-applicable young doe, otherwise a live flag list; reuses `ageInMonths()` from
> `lib/goats/stage.ts`). UI: **a route-backed tab strip in the Breeding area** (`Seasons` /
> `Doe Performance`, `components/breeding/breeding-tabs.tsx`); the Doe Performance tab has a total-count
> summary, tag/name search, flag-type filter and a sort control, expandable per-doe cards (kidding
> history, recent health records via 07's `listHealthRecordsByGoat`, accumulating note form), and every
> duration rendered via `formatAge()` (UPD-009); plus a "Doe performance" section on
> `/breeding/settings`. Section 14 open questions resolved by the owner 2026-09-05: ±3-day
> kidding-event grouping window; eligible-age default first 10, **amended same day to 12** ("a doeling
> can have kids once she is older than a year") — the check was already raw-age-based, no stage bug.
> `npm run build` + `tsc` clean; lint at project baseline.

**Task 1 result (2026-08-29):** confirmed from the generated types that spec 07 built health records as
**one `health_records` table with a `record_type` enum + a `next_due_date` column** — not the separate
`vaccinations` / `dewormings` tables in `architecture-context.md`'s original sketch (those names belong to
the untouched legacy prototype tables). `architecture-context.md`'s Data Model section was updated to
match reality so spec 13 (calendar) builds its due-date query against accurate docs.

### 13 — calendar · Both · `planned`
Month/week view merging vaccination & deworming due dates, expected kidding, feeding schedule, and to-dos. **Depends on:** 07, 09, 14.
*Likely split:* unified due-date/event gathering function in `lib` `(Back-end · logic)` · `react-big-calendar` view + add-task interaction `(Front-end)`.

---

## Phase 5 — Reference & output

### 14 — todos-reminders · Both · `planned`
Farm tasks and feeding schedule; automatic reminders from recorded next-due dates. **Depends on:** 07.
*Likely split:* `tasks` table + actions `(Back-end)` · reminder derivation in `lib` `(Back-end · logic)` · to-do list UI `(Front-end)`.

### 15 — health-reference (Doctor) · Front-end · `planned`
Static library of common ailments with the non-diagnostic disclaimer. **No back-end** — content ships in the repo, no DB table.
Independent of the data modules — can slot in earlier as a lighter change between heavier ones.

### 16 — reports-pdf · Both · `planned`
Goat history, herd summary, and sales reports via `@react-pdf/renderer`. **Depends on:** the data modules.
*Likely split:* report-data assembly / builders in `lib` (heavier ones in an `app/api` handler) `(Back-end)` · PDF layout components `(Front-end)`.

---

## Notes

- Write each spec (like 01) just before building it, so it reflects what actually exists at that point.
- The Doctor reference (15) has no dependencies and can be built any time as a lighter change between heavier ones.
- Sub-feature rows for a `planned` feature are **proposals** until its spec is written — decompose (or don't) per `ai-workflow-rules.md` when you reach it.
- After each spec, update **both** this file and `progress-tracker.md` to match reality.

## Open questions that gate specific units

- **Goat stage thresholds** — the kid → young stock → adult age cut-offs are needed before the stage-derivation sub-feature of **05** can be finished. May vary by breed.
- **Logo colors** — brand sand/terracotta are placeholders; cosmetic only, not blocking any unit.
