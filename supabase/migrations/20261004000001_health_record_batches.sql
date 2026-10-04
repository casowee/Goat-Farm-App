-- UPD-016 / UPD-017 amendment (2026-10-04) — bulk health actions as one group.
--
-- A bulk action (UPD-017's "Bulk schedule") writes one `health_records` row per
-- goat. Until now nothing tied those rows together, so the Health page could
-- only show them one goat at a time — 58 rows for one deworming of the does.
-- This adds the missing concept:
--
--   health_record_batches — one row per bulk action, carrying the description
--                           of the group it was applied to ("Does · Barn A",
--                           "Kids", "All goats", "Does (56 of 58)"). The label
--                           is generated from the filters used in the dialog,
--                           never typed by hand.
--   health_records.batch_id — nullable link from each record the bulk action
--                           created back to its batch.
--
-- Purely additive. Records created one at a time on a goat's own card keep
-- `batch_id = null`, and existing records are NOT backfilled — a past bulk
-- action stays a set of individual records, exactly as it was stored.
--
-- `on delete set null`: removing a batch must never remove the health records
-- themselves; they simply go back to being ungrouped.
--
-- Convention match: bigserial id, owner_id uuid default auth.uid(), single
-- "for all" owner RLS policy (with the `(select auth.uid())` wrapping spec 17.2
-- introduced). No legacy-table name collision.
--
-- Run this whole file in one go in the Supabase SQL editor. Idempotent and safe
-- to re-run.

create table if not exists public.health_record_batches (
  id         bigserial primary key,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label      text not null,
  created_at timestamptz not null default now()
);

create index if not exists health_record_batches_owner_id_idx
  on public.health_record_batches (owner_id);

alter table public.health_record_batches enable row level security;

drop policy if exists "Owner manages own health record batches" on public.health_record_batches;
create policy "Owner manages own health record batches"
  on public.health_record_batches for all
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

alter table public.health_records
  add column if not exists batch_id bigint;

-- Named explicitly so the generated types' relationship name is predictable.
do $$ begin
  alter table public.health_records
    add constraint health_records_batch_id_fkey
    foreign key (batch_id) references public.health_record_batches(id) on delete set null;
exception when duplicate_object then null;
end $$;

-- Foreign keys are not indexed automatically (spec 17.2 part G). Partial,
-- because most records are single-goat entries with no batch.
create index if not exists health_records_batch_id_idx
  on public.health_records (batch_id)
  where batch_id is not null;
