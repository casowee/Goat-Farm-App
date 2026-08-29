# Spec 07 — Health Records

**Status:** in progress — code complete, migration applied, `tsc` + `npm run build` clean; **awaiting the owner's hands-on test in the running app** before it is marked `done`
**Depends on:** Spec 04 (Barns — structural template), Spec 05 (Goat Profiles)
**Related (future):** Spec 15 (To-Dos/Reminders) — data contract only, no implementation dependency

---

## 1. Overview

Health Records track medical events for a goat over its lifetime: vaccinations, illnesses, treatments, deworming, routine checkups, injuries, and surgeries. This module also stores the raw data needed to drive future reminders (Spec 15) — e.g. a 3-day medication course, or a vaccination due again in 6 months — without building the reminder/to-do system itself.

## 2. Goals

- Log any health event against a specific goat
- Support multi-day medication courses (e.g. "give antibiotic twice daily for 3 days")
- Support a "next due" date for recurring care (e.g. next deworming, next booster)
- Show a chronological health history per goat
- Follow the Barns module RLS/CRUD pattern

## 3. Non-Goals (deferred)

- File/photo attachments (vet documents, lab results) — same deferral as goat profile photos in Spec 05
- Actual to-do/reminder generation — owned entirely by Spec 15
- Automated recurring-schedule engine (e.g. auto-recalculating next due dates) — manual entry only for v1
- Herd-wide/bulk health events (e.g. vaccinating 20 goats at once) — single-goat entry only for v1

## 4. Data Model

```sql
create type health_record_type as enum (
  'vaccination',
  'illness',
  'treatment',
  'deworming',
  'checkup',
  'injury',
  'surgery'
);

create type health_record_status as enum (
  'active',      -- ongoing treatment course
  'completed',
  'cancelled'
);

create table health_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id),
  goat_id uuid not null references goats(id) on delete cascade,

  record_type health_record_type not null,
  title text not null,
  notes text,
  date_occurred date not null default current_date,

  vet_name text,
  cost numeric(10,2),

  -- Medication / course fields (used by illness, treatment, injury, surgery)
  medication_name text,
  dosage text,
  treatment_start_date date,
  treatment_duration_days integer,
  treatment_times_per_day integer,

  -- Recurrence / follow-up fields (used by vaccination, deworming, checkup)
  next_due_date date,

  status health_record_status not null default 'completed',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on health_records (goat_id);
create index on health_records (owner_id);
```

### RLS (follows project convention)

```sql
alter table health_records enable row level security;

drop policy if exists "health_records_owner_policy" on health_records;
create policy "health_records_owner_policy" on health_records
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
```

## 5. Data Contract with Spec 15 (To-Dos)

Spec 07 owns all health data. Spec 15 will **read** from `health_records` to generate to-do items — it will not write back to this table except to optionally reference `health_record_id` as a foreign key on its own `todos` table.

Two patterns Spec 15 will consume from here:

1. **Course-based tasks** — any row where `status = 'active'` and `treatment_start_date` + `treatment_duration_days` are set. Spec 15 expands this into one to-do per day (and per dose, if `treatment_times_per_day` > 1) for the course window. Example: a 3-day antibiotic course becomes 3 (or 6, if twice daily) individual to-do instances.
2. **Single follow-up tasks** — any row where `next_due_date` is set and `status != 'cancelled'`. Spec 15 generates a single reminder to-do on that date.

Spec 07's only responsibility toward this contract: keep `status` accurate (`active` while a course is ongoing, `completed` once done, `cancelled` if abandoned). Marking a record `completed`/`cancelled` will be a manual toggle in v1 — no scheduled job auto-expires a course.

## 6. Business Rules

- `treatment_start_date`, `treatment_duration_days`, `treatment_times_per_day` are only shown/editable in the form when `record_type` is one of: `illness`, `treatment`, `injury`, `surgery`.
- `next_due_date` is only shown/editable when `record_type` is one of: `vaccination`, `deworming`, `checkup`.
- `status` defaults to `completed` for one-off record types, and should default to `active` when course fields are filled in.
- `cost` is optional, numeric, 2 decimal places (matches `breed_primary_pct` precedent of using `numeric` for anything needing decimals).

## 7. UI/UX

- **Goat profile → Health tab**: chronological list of this goat's health records, newest first. Each row shows type badge, title, date, and status (if active course).
- **Add/Edit dialog**: same dialog-form pattern as Barns/Goats. Fields shown conditionally based on `record_type` per the business rules above.
- **Global Health Records page** (optional for v1, can defer): all records across all goats, filterable by goat/type/status — useful later for the analytics dashboard (Spec 13/14).

## 8. Implementation Pattern (matches Barns template)

- Owner-scoped RLS via single `for all` policy (as above)
- Generated TypeScript types regenerated after this table is added
- Server actions: `createHealthRecord`, `updateHealthRecord`, `deleteHealthRecord`, `listHealthRecordsByGoat`
- Dialog form component following the existing goat/barn dialog pattern

## 9. Open Questions for Ismail

1. Should the **global Health Records page** (all goats, filterable) ship in v1, or is the per-goat tab enough for now?
   → **Resolved 2026-08-29 (owner): defer it.** Per-goat Health tab only for v1; `/health` keeps its placeholder. Revisit alongside the analytics dashboard (Spec 13/14).
2. For the medication-course example (sick goat, 3-day dose) — should `treatment_times_per_day` be a plain number, or do you want to specify actual times of day (e.g. "8am and 8pm")? A plain number is simpler for v1.
   → **Resolved 2026-08-29 (owner): plain number.** `treatment_times_per_day` stays `integer`; the form field is a whole-number input ("Doses per day").
3. Should `cost` roll into a running total anywhere yet (e.g. goat profile shows "total vet spend"), or is it just stored for now with reporting deferred to Spec 14?
   → **Resolved 2026-08-29 (owner): store only.** Each record shows its own cost; no aggregate. Cost reporting stays with Spec 14.

## 10. Verification Checklist

Automatic (agent) — passing:
- [x] `npx tsc --noEmit` clean, no `any`; `npm run build` passes
- [x] Migration applied by the owner; `npm run gen:types` regenerated for real and matches the stand-in

Manual (owner, in the running app) — **pending the owner's own hands-on test**:
- [ ] Can add a one-off checkup record to a goat with no course/due-date fields
- [ ] Can add a 3-day medication course; record saves with `status = 'active'`
- [ ] Can add a vaccination with a `next_due_date` 6 months out
- [ ] Editing a record correctly shows/hides conditional fields based on `record_type`
- [ ] Manually marking a course `completed` works
- [x] RLS: a second test user cannot see the first user's health records — **✅ confirmed by the owner 2026-08-29** (logged in as a second test user, saw a completely empty farm; manual owner-performed check, not automated). The rest of this manual checklist is still pending.
- [ ] Goat profile Health tab lists records newest-first

## 11. Implementation Notes / Decisions

Built as a single unit (schema + actions + form + Health tab), not split by record type.

- **One `health_records` table**, not the per-record-type split (`vaccinations` / `dewormings` / …) the roadmap originally proposed. This also sidesteps the legacy pre-spec `vaccinations` / `medicine_records` table-name collision noted in `progress-tracker.md` — `health_records` is a fresh, unused name, so the old tables are left untouched.
- **Id / FK types:** `health_records.id` is `bigserial` and `goat_id` is `bigint` (not `uuid` as the Section 4 sample shows) to match this project's established convention — `goats.id` is `bigint`, so a `uuid` FK could not reference it. RLS is the single `for all` owner policy with `drop policy if exists` before `create policy`, per project convention.
- **Migration:** `supabase/migrations/20260829000001_health_records.sql` — run by the owner in the Supabase SQL editor (this project has no direct DB write access from the agent).
- **Types:** `types/database.types.ts` carries a hand-added `health_records` stand-in (Row/Insert/Update + the two enums + `Constants`), to be re-confirmed with `npm run gen:types` once the migration is applied and `SUPABASE_ACCESS_TOKEN` is fresh.
- **Server actions:** `app/(app)/health/actions.ts` — `createHealthRecord`, `updateHealthRecord`, `deleteHealthRecord(id, goatId)`, `listHealthRecordsByGoat(goatId)`. Conditional fields are cleared server-side unless the record type allows them, so a value left over from a since-changed type is never persisted. `status` respects an explicit choice, else falls back to `defaultStatusForType` (`active` for course types, `completed` otherwise).
- **Shared rules** live in `lib/health/records.ts` (pure, no React / Supabase): the type/status lists, `COURSE_RECORD_TYPES` / `FOLLOW_UP_RECORD_TYPES`, label maps, and `defaultStatusForType`.
- **Form** (`components/health/health-record-form-dialog.tsx`) is a 3-step wizard reusing `components/forms/` (`useWizardSteps` / `StepIndicator` / `WizardNav`) per the Forms — Length & Multi-Step Standard: **Event** (type, title, date) → **Treatment details / Follow-up** (conditional, skippable) → **Notes & status** (vet, cost, status, notes, review). One write on final submit. Trigger button is built inside the client component (per `ERR-001`).
- **Health tab** on the goat profile (`app/(app)/goats/[id]/page.tsx`) shows records newest-first via `listHealthRecordsByGoat`, with an "Add health record" button. Type badge + title + date always; an "Active" badge only on active courses; a course/next-due summary line where present.
- Open questions 1–3 resolved by the owner on 2026-08-29 — see Section 9. Net effect: no global page, `treatment_times_per_day` stays a plain integer, no cost roll-up.
