-- Feature 09 — Breeding (Seasonal, Farm-Wide).
--
-- breeding_season_bucks links a breeding season to the buck(s) that ran with
-- the herd during it. Many-to-many: the farm sometimes runs two or more bucks
-- with the same group in one season.
--
-- If an earlier draft of the breeding_season_occurrences migration was applied
-- with a single buck_id column, drop it here (safe no-op otherwise).

alter table public.breeding_season_occurrences drop column if exists buck_id;

create table if not exists public.breeding_season_bucks (
  id         bigserial primary key,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  season_id  bigint not null references public.breeding_season_occurrences(id) on delete cascade,
  buck_id    bigint not null references public.goats(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (season_id, buck_id)
);

create index if not exists breeding_season_bucks_season_idx on public.breeding_season_bucks (season_id);
create index if not exists breeding_season_bucks_buck_idx   on public.breeding_season_bucks (buck_id);

alter table public.breeding_season_bucks enable row level security;

drop policy if exists "Owner manages own breeding season bucks" on public.breeding_season_bucks;
create policy "Owner manages own breeding season bucks"
  on public.breeding_season_bucks for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
