-- Feature 08 — Weight Records.
-- Dated weight entries per goat, shown as a growth curve on the goat profile.
--
-- Convention match: bigserial id + bigint goat_id FK + a single "for all" owner
-- RLS policy with `drop policy if exists` before `create policy`, as
-- 20260829000001_health_records.sql established. owner_id is stamped by the
-- column default (auth.uid()) and never set from application code.
--
-- No pre-spec legacy table occupies the name `weights`. The older
-- `weight_history` table (keyed on goat_records.tag_number) is a separate,
-- earlier data set and is left untouched.

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

alter table public.weights enable row level security;

drop policy if exists "weights_owner_policy" on public.weights;
create policy "weights_owner_policy" on public.weights
  for all
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
