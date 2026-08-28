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
| 2     | 07  | health-records              | Both       | `planned` ◀ next |
| 2     | 08  | weight-records              | Both       | `planned`     |
| 2     | 09  | breeding-and-inbreeding     | Both       | `planned`     |
| 3     | 10  | inventory                   | Both       | `planned`     |
| 3     | 11  | sales-and-purchases         | Both       | `planned`     |
| 4     | 12  | dashboard-analytics         | Both       | `planned`     |
| 4     | 13  | calendar                    | Both       | `planned`     |
| 5     | 14  | todos-reminders             | Both       | `planned`     |
| 5     | 15  | health-reference (Doctor)   | Front-end  | `planned`     |
| 5     | 16  | reports-pdf                 | Both       | `planned`     |

`*` Barns code is complete and verified; the owner's own logged-in cross-account RLS test is still outstanding (needs their real credentials).
`**` Goat profiles core (schema, stage logic, CRUD, list/filter, form, detail page) is complete and verified; photo upload was deferred to its own follow-up increment per the owner, and the owner's own logged-in cross-account RLS test is still outstanding, same as barns.
`***` Family tree (parents/pedigree, multi-breed composition, parent-based breed computation, barn-move history) is complete, browser-verified, and **tested and confirmed working by the owner in the running app (2026-08-28)**; only the cross-account RLS check on the two new tables (needs a second real login) is still outstanding, same as barns/goats. Minor UX refinements to family-tree / breed composition may follow later.

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
| Owner authenticated CRUD + cross-account RLS test   | —         | `in progress` | **owner only** — needs their real login            |

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

**Follow-ups shipped as separate specs (not new roadmap rows):** `context/update-specs/002-goat-form-and-breed-cross.md` (`UPD-002`, `done`) restructured the goat form around an origin segmented control and replaced the purebred/crossbred toggle + percentage picker with a unified breed dropdown (`Crossed…` computed via `crossOfPureBreeds()`); `context/error-specs/001-goat-dialog-trigger-hydration.md` (`ERR-001`, `Resolved`) fixed a dialog-trigger hydration mismatch in the same file and the equivalent pattern in `barn-form-dialog.tsx` and the goat detail page; `context/update-specs/003-goat-form-multistep-wizard.md` (`UPD-003`, `done`) converted the goat form into a 4-step wizard (Identity & Origin → Breed & Housing → Parents [skippable] → Notes & Review) and established the reusable, goat-agnostic stepper pattern in `components/forms/` (`use-wizard-steps.ts`, `step-indicator.tsx`, `wizard-nav.tsx`) — no schema change, one write on final Save — which `07` and `09` should reuse per the "Forms — Length & Multi-Step Standard" now in `ui-context.md`.

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

### 07 — health-records · Both · `planned` ◀ next
Health history, vaccinations, deworming, and medicine records; each dated, with next-due dates where relevant. **Depends on:** 05.
*Likely split by record type:* `health_events`, `vaccinations`, `dewormings`, `medicine_records` — each schema/RLS `(Back-end)` + its form and list `(Front-end)`.

### 08 — weight-records · Both · `planned`
Weight entries per goat + growth chart (Recharts). **Depends on:** 05.
*Likely split:* `weights` table + entry action `(Back-end)` · growth chart `(Front-end)`.

### 09 — breeding-and-inbreeding · Both · `planned`
Breeding records (sire/dam, mating, expected/actual kidding, offspring) + the relatedness check that warns on close matings. **Depends on:** 06.
*Likely split:* `breedings` table + actions `(Back-end)` · relatedness/inbreeding check as a pure `lib` function `(Back-end · logic)` · warning + override-confirm UI `(Front-end)`.

---

## Phase 3 — Operations

### 10 — inventory · Both · `planned`
Medicine and feed stock, quantities, low-stock awareness. **Depends on:** 03.
*Likely single unit unless it grows:* `inventory_items` table + actions `(Back-end)` · list + low-stock UI `(Front-end)`.

### 11 — sales-and-purchases · Both · `planned`
Sale/purchase records, optionally linked to goats. **Depends on:** 05.
*Likely single unit:* `sales_purchases` table + actions `(Back-end)` · list + form `(Front-end)`.

---

## Phase 4 — Insight

### 12 — dashboard-analytics · Both · `planned`
Herd size and composition (counts by stage, male vs female, buck-to-doe ratio), weight growth, vaccinations/deworming due soon, sales over time, stock levels; barn filter. **Depends on:** the core data modules.
*Likely split:* aggregation queries / derivations `(Back-end · logic)` · each chart & the barn filter `(Front-end)`.

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
