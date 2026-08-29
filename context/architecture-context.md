# Architecture Context

## Stack

| Layer            | Technology                          | Role                                                                    |
| ---------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript             | Full-stack app with server / client boundaries (App Router, Node 20+)   |
| UI               | Tailwind + shadcn/ui                | Component composition and styling                                       |
| Auth             | Supabase Auth                       | Single-owner sign-in and route protection (email / password)            |
| Database         | Supabase (PostgreSQL)               | All farm records; row-level security by owner                           |
| Data access      | Supabase JS client + generated types| Typed reads / writes from web today, reusable by mobile later           |
| File storage     | Supabase Storage                    | Goat photos (and generated files if ever persisted)                     |
| Charts           | Recharts                            | Dashboard graphs and analytics                                          |
| Calendar         | react-big-calendar                  | Activity / due-date calendar view                                       |
| PDF export       | @react-pdf/renderer                 | Goat history, herd summary, and sales reports                           |
| Hosting          | Vercel (free tier)                  | Deployment of the Next.js app                                           |

Supabase is the single backend. The web app and any future iOS / Android app talk to the same Supabase project using the official SDKs, so the backend is reused rather than rebuilt.

## System Boundaries

- `app` — App Router pages, one area per module (goats, barns, health, breeding, inventory, sales, calendar, doctor, analytics), plus the auth pages.
- `app/api` — Server-only route handlers for work that should not run in the browser (e.g. building PDF reports). Most simple reads / writes go straight through the Supabase client and do not need a handler here.
- `components` — UI composition: shadcn-based forms, tables, dialogs, cards, charts, and the calendar view.
- `lib` — Shared infrastructure: Supabase clients, access helpers, and domain logic (relatedness / inbreeding check, calendar + reminder derivation, report builders).
- `lib/supabase` — `client.ts` (browser client) and `server.ts` (server client), following the `@supabase/ssr` pattern.
- `types` — Shared TypeScript types, including the database types generated from Supabase.
- `supabase` — SQL migrations and row-level-security policies (managed with the Supabase CLI).
- `middleware.ts` — Refreshes the Supabase session and protects routes.
- `context` — Documentation and the spec-driven workflow, not shipped application code: `feature-specs/` (canonical per-module baselines), `update-specs/` (approved changes to already-built features), and `error-specs/` (defects and their resolutions). Each spec folder has a `README.md` and a `000-*-template.md`. Implementation reads feature spec → approved update specs → error specs before coding (see `ai-workflow-rules.md`).

## Storage Model

- **PostgreSQL (Supabase)**: every farm record — barns, goats, health events, vaccinations, deworming, medicine, breeding, weight, inventory, sales & purchases, tasks, and barn-move history.
- **Supabase Storage**: goat photos, referenced from the `goats` record by URL.
- **Health reference ("Doctor")**: static content shipped in the repository (not per-owner data), so it needs no database table.
- **PDF reports**: generated on demand and downloaded, not stored, unless a need to keep them appears later.

## Data Model (shape, not final schema)

Every owned table has an `owner` column referencing the Supabase auth user, used by row-level security.

- `barns` — name, category (does / bucks / kids / mixed / other), notes.
- `goats` — name / tag, breed, sex, date of birth, reproductive state (intact / castrated), status (active / sold / deceased), `barn_id` (the goat's current barn — nullable in the database, but always set by the registration screen), photo URL, notes, `sire_id` and `dam_id` (self-referencing links to other goats, nullable), and `sire_name` / `dam_name` for external parents not in the system.
- `goat_barn_moves` — goat, from barn, to barn, and date (optional history of a goat's moves between barns).
- `health_records` — **one table for every health event** (spec 07, migration `20260829000001_health_records.sql`).
  `record_type` enum (`vaccination` / `illness` / `treatment` / `deworming` / `checkup` / `injury` / `surgery`),
  `status` enum (`active` / `completed` / `cancelled`), `title`, `date_occurred`, `next_due_date` (recurring-care
  follow-up date — vaccination / deworming / checkup), medication-course fields (`medication_name`, `dosage`,
  `treatment_start_date`, `treatment_duration_days`, `treatment_times_per_day`), `vet_name`, `cost`, `goat_id` →
  `goats` (`on delete cascade`), `owner_id`. This **replaces** the original sketch's separate `health_events` /
  `vaccinations` / `dewormings` / `medicine_records` tables — those were never built under the spec workflow.
  *(The similarly-named `vaccinations` / `deworming` / `medicine_records` / `health_history` tables that exist in
  the database are untouched legacy prototype tables keyed on `goat_records.tag_number`, unrelated to `health_records`.)*
- `health_condition_presets` — `UPD-004`: seeded farm-wide + owner-custom title suggestions per `record_type`.
- `breedings` — sire, dam, mating date, expected kidding date, actual kidding date, offspring. *(Spec 09 — not built yet.)*
- `weights` — goat, date (`weighed_on`), weight (`weight_kg`), notes (spec 08, migration `20260829000002_weights.sql`).
- `inventory_items` — type (medicine / feed), name, quantity, unit, low-stock threshold, `category` (medicine only). *(`UPD-005` + spec 10.)*
- `herd_events` — `event_type` enum (`sale` / `death` / `other_addition` / `other_removal` — **not** birth/purchase,
  which stay derived from goat records), optional `goat_id`, `event_date`, `note`. Feeds the dashboard's
  herd-population timeline. Written via the `log_herd_event(...)` RPC, which also flips a linked goat's
  `status` to `sold` / `deceased` for a Sale / Death in the same call. *(`UPD-006`,
  migration `20260829000006_herd_events.sql`.)* Spec 11 (sales & purchases) should integrate with this,
  not duplicate it.
- `sales_purchases` — type (sale / purchase), optional goat, party, date, amount, notes.
- `tasks` — title, due date, done flag, type (task / feeding / health check), optional goat.

Derived, not stored as tables:

- **Calendar events** are read from the due-date columns (`health_records.next_due_date` for recurring vaccination / deworming / checkup follow-ups, `breedings.expected_kidding`, `tasks.due_date`) and merged into one event list. Spec 12 introduced the first cut of this query as the pure `dueSoon()` function in `lib/dashboard/due-soon.ts`; spec 13 (calendar) reuses it.
- **Reminders** use the same due-date queries.
- **Family tree** is walked through `goats.sire_id` / `goats.dam_id`.
- **Herd-population timeline** (`UPD-006`) combines derived birth/purchase additions (`goats.date_of_birth`
  for `origin = 'born_here'`, `goats.purchase_date` for `origin = 'purchased'`) with manual `herd_events`
  rows into one running total — the pure `computeHerdTimeline()` in `lib/dashboard/herd-timeline.ts`.
- **Goat stage / class** (Doe, Doeling, Buck, Buckling, Wether, Kid) is computed from `sex`, age (from date of birth), and reproductive state — not stored.

## Auth and Ownership Model

- The app has a single owner. Sign-in is Supabase Auth email / password.
- Every owned table carries an `owner` column set to the signed-in user.
- Row-level security policies use `auth.uid()` so the owner can only read and write their own rows. Ownership is enforced at the database, not only in the UI.
- Protected routes check the Supabase session in `middleware.ts`; unauthenticated visitors are sent to the sign-in page.

## Key App Logic

### Inbreeding / relatedness check
- Input: a proposed sire and dam.
- Method: walk each goat's ancestry through `sire_id` / `dam_id` up to a set number of generations, then look for shared ancestors.
- Output: a relationship flag (e.g. parent–offspring, full / half sibling, grandparent) and the shared ancestor.
- It is advisory: a flagged mating can still be recorded, but only with explicit confirmation. Its accuracy depends on recorded lineage.

### Goat stage derivation
- Input: a goat's sex, age (from date of birth), and reproductive state.
- Output: its stage — Doe, Doeling, Buck, Buckling, Wether, or Kid.
- A castrated male resolves to Wether regardless of age. The age thresholds (kid → young stock → adult) live in one place so they are easy to adjust to the farm's breeds.

### Calendar and reminders
- A single function gathers upcoming due dates and tasks across the relevant tables and returns a unified, dated list used by both the calendar view and the reminders.

### PDF reports
- Report data is assembled (single goat history, herd summary, or sales over a period), rendered with `@react-pdf/renderer`, and returned as a download. Heavier reports may run in an `app/api` handler.

## Environment and Secrets

- The Supabase **anon key** is safe to ship to the browser **only because row-level security is enabled** — RLS is what actually protects the data, so it must be on for every table.
- The Supabase **service-role key** is server-only and must never be committed or sent to the browser.
- Keep all keys in `.env.local`, which is git-ignored. Rotate any key that may have been exposed.

## Invariants

1. All data access goes through Supabase with row-level security; ownership is enforced by `auth.uid()` at the database.
2. The service-role key never reaches the client; the browser uses only the anon key.
3. Prefer server components for reads; use client components only where interactivity is needed (forms, calendar, charts).
4. The health reference is informational only and always shows the non-diagnostic disclaimer.
5. The inbreeding check may warn, but the data model must allow recording a mating with an explicit override.
6. Supabase is the single source of truth and must stay directly usable by future mobile apps. If shared rules (like the relatedness check) later need to run on mobile too, move them into a Supabase database function or Edge Function rather than locking them inside the web app.
7. A barn must exist before a goat can be registered, and the registration screen always assigns one. The `barn_id` column stays nullable in the database so edge cases (imported or sold goats) do not break.
8. Barns are grouped by owner so a future Farm → Barn → Goat layer can be added on top later without changing existing goat or barn records.
