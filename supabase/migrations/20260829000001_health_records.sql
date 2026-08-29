-- Feature 07 — Health Records.
-- Medical events for a goat over its lifetime: vaccinations, illnesses,
-- treatments, deworming, checkups, injuries, surgeries. This table also stores
-- the raw data (course windows, next-due dates) that Spec 15 (to-dos /
-- reminders) will later READ to generate reminders — this spec does not build
-- reminders and nothing writes back here from Spec 15.
--
-- Convention match: bigserial id + a single "for all" owner RLS policy, like
-- barns / goats / goat_barn_moves. The spec's Section 4 sample uses `uuid`
-- ids, but goats.id is `bigint` in this project, so this table's own id and
-- goat_id are `bigint` to match (a uuid goat_id would not reference goats.id).
--
-- No pre-spec legacy table occupies the name `health_records`. The older
-- `vaccinations` / `medicine_records` / `deworming` / `health_history` tables
-- (keyed on goat_records.tag_number) are a separate, earlier data set and are
-- deliberately left untouched — this spec consolidates every health event into
-- one table under a fresh, non-colliding name.

do $$ begin
  create type health_record_type as enum (
    'vaccination',
    'illness',
    'treatment',
    'deworming',
    'checkup',
    'injury',
    'surgery'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type health_record_status as enum (
    'active',      -- ongoing treatment course
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.health_records (
  id                      bigserial primary key,
  owner_id                uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goat_id                 bigint not null references public.goats (id) on delete cascade,

  record_type             health_record_type not null,
  title                   text not null,
  notes                   text,
  date_occurred           date not null default current_date,

  vet_name                text,
  cost                    numeric(10,2),

  -- Medication / course fields (used by illness, treatment, injury, surgery)
  medication_name         text,
  dosage                  text,
  treatment_start_date    date,
  treatment_duration_days integer,
  treatment_times_per_day integer,

  -- Recurrence / follow-up fields (used by vaccination, deworming, checkup)
  next_due_date           date,

  status                  health_record_status not null default 'completed',

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists health_records_goat_id_idx on public.health_records (goat_id);
create index if not exists health_records_owner_id_idx on public.health_records (owner_id);

alter table public.health_records enable row level security;

drop policy if exists "health_records_owner_policy" on public.health_records;
create policy "health_records_owner_policy" on public.health_records
  for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
