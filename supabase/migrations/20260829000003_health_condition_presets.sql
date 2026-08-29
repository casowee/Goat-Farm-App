-- UPD-004 — Health Record Title Presets (extends feature 07 — health records).
--
-- A shared farm-wide + owner-personal catalogue that powers the searchable
-- "Title" combobox on the health-record dialog. `owner_id IS NULL` marks a
-- seeded global default (not owned by any user); a non-null `owner_id` marks a
-- preset the owner created via the app's "+ Add new" affordance.
--
-- `health_records.title` stays plain text — this table only powers the picker
-- UI and does not change how a title is stored on the record itself.
--
-- Convention notes (see UPD-004 Section 6):
--   * `id` is `bigserial`, matching every other table in this project
--     (barns / goats / goat_barn_moves / goat_breed_composition / health_records).
--   * `record_type` reuses the `health_record_type` enum defined by feature 07's
--     migration (20260829000001_health_records.sql) — same name, same 7 values.
--   * RLS is DELIBERATELY split into separate select / insert / update / delete
--     policies rather than this project's usual single `for all` owner policy.
--     This table has a genuinely different access shape (shared global rows +
--     owner-private rows) that a single `for all` policy cannot express safely:
--     a `for all` policy with `owner_id is null or auth.uid() = owner_id` in its
--     `using` clause would let any authenticated user UPDATE or DELETE the seeded
--     global defaults. Ownership is enforced at the database, not just hidden in
--     the UI (architecture-context.md), so the write policies are restricted to
--     the owner's OWN rows only.

create table if not exists public.health_condition_presets (
  id          bigserial primary key,
  owner_id    uuid references auth.users(id) on delete cascade,
  record_type health_record_type not null,
  name        text not null,
  created_at  timestamptz not null default now(),
  unique (owner_id, record_type, name)
);

create index if not exists health_condition_presets_type_idx
  on public.health_condition_presets (record_type);

alter table public.health_condition_presets enable row level security;

-- Read: the owner sees both the global defaults and their own custom presets.
drop policy if exists "Owner can read presets (own + global defaults)" on public.health_condition_presets;
create policy "Owner can read presets (own + global defaults)"
  on public.health_condition_presets for select
  using (owner_id is null or auth.uid() = owner_id);

-- Insert: a new preset is always attributed to the inserting owner — never
-- inserted as a global default through the app.
drop policy if exists "Owner can insert own presets" on public.health_condition_presets;
create policy "Owner can insert own presets"
  on public.health_condition_presets for insert
  with check (auth.uid() = owner_id);

-- Update / delete: restricted to the owner's OWN rows only. Deliberately NOT
-- "owner_id is null OR ..." — that would let the app-layer owner delete/edit
-- seeded global defaults at the database level, which must not be possible even
-- if the UI never exposes the control.
drop policy if exists "Owner can update own presets" on public.health_condition_presets;
create policy "Owner can update own presets"
  on public.health_condition_presets for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "Owner can delete own presets" on public.health_condition_presets;
create policy "Owner can delete own presets"
  on public.health_condition_presets for delete
  using (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Seed data — global defaults (owner_id NULL), from UPD-004's Appendix.
-- Based on real events on the farm; the vaccination list is owner-confirmed.
-- Idempotent: re-running this migration will not create duplicate seed rows
-- (the `unique` constraint treats NULL owner_id rows as distinct, so we guard
-- with an explicit NOT EXISTS check instead).
-- ---------------------------------------------------------------------------
insert into public.health_condition_presets (owner_id, record_type, name)
select null, seed.record_type::health_record_type, seed.name
from (
  values
    ('illness',     'Worm / Parasite Infestation'),
    ('illness',     'Listeriosis (suspected)'),
    ('illness',     'Orf — Contagious Ecthyma (suspected)'),
    ('illness',     'FMD — Foot-and-Mouth Disease (suspected)'),
    ('illness',     'PPR — Peste des Petits Ruminants (suspected)'),
    ('illness',     'Bacterial Infection / Diarrhea'),
    ('illness',     'Severe Diarrhea'),
    ('illness',     'Skin Abscess / Boils'),
    ('illness',     'Respiratory Illness (Sneezing / Nasal Discharge)'),

    ('injury',      'Bloat / Abdominal Distension'),
    ('injury',      'Constipation / Failure to Pass Dung'),
    ('injury',      'Newborn Weakness / Difficulty Standing or Breathing'),
    ('injury',      'Difficult Birth / Assisted Delivery'),

    ('treatment',   'Gentamicin (Gentavet) Treatment'),
    ('treatment',   'Oxytetracycline Treatment'),
    ('treatment',   'General Antibiotic Treatment'),

    ('deworming',   'Routine Deworming'),
    ('deworming',   'Emergency Deworming (Heavy Worm Load)'),

    ('vaccination', 'CDT / Clostridial Vaccine'),
    ('vaccination', 'PPR Vaccine'),
    ('vaccination', 'Orf Vaccine'),
    ('vaccination', 'FMD Vaccine')
) as seed(record_type, name)
where not exists (
  select 1
  from public.health_condition_presets existing
  where existing.owner_id is null
    and existing.record_type = seed.record_type::health_record_type
    and existing.name = seed.name
);
