-- Feature 06 (6b) — multi-breed composition.
-- Replaces the two-breed model (goats.breed_secondary + goats.breed_primary_pct)
-- with a child table that can express three or more breed shares, which
-- parent-averaging (6c) can produce. Additive + a data backfill here; the old
-- columns are dropped in a follow-up migration once the backfill is verified.
--
-- Convention match: bigserial id, owner_id uuid default auth.uid(), single
-- "owner full access" style RLS policy (as barns / goats already use).

create table if not exists public.goat_breed_composition (
  id         bigserial primary key,
  owner_id   uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  goat_id    bigint not null references public.goats (id) on delete cascade,
  breed      text   not null,
  pct        numeric(6,3) not null check (pct > 0 and pct <= 100),
  created_at timestamptz not null default now()
);

create index if not exists goat_breed_composition_goat_id_idx
  on public.goat_breed_composition (goat_id);

-- A goat should not list the same breed twice.
create unique index if not exists goat_breed_composition_goat_breed_uniq
  on public.goat_breed_composition (goat_id, breed);

alter table public.goat_breed_composition enable row level security;

do $$ begin
  create policy "owner full access" on public.goat_breed_composition
    for all to authenticated
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);
exception when duplicate_object then null;
end $$;

-- Lossless backfill from the current two-breed columns.
-- Primary row (always present when a breed is recorded):
insert into public.goat_breed_composition (owner_id, goat_id, breed, pct)
select g.owner_id, g.id, g.breed, g.breed_primary_pct
from public.goats g
where g.breed is not null
  and not exists (
    select 1 from public.goat_breed_composition c
    where c.goat_id = g.id and c.breed = g.breed
  );

-- Secondary row (only for a recorded cross):
insert into public.goat_breed_composition (owner_id, goat_id, breed, pct)
select g.owner_id, g.id, g.breed_secondary, 100 - g.breed_primary_pct
from public.goats g
where g.breed_secondary is not null
  and not exists (
    select 1 from public.goat_breed_composition c
    where c.goat_id = g.id and c.breed = g.breed_secondary
  );

-- Verify before running the drop migration:
--   select goat_id, sum(pct) from public.goat_breed_composition group by goat_id having sum(pct) <> 100;
-- should return zero rows.
