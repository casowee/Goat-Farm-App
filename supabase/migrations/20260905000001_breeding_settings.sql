-- Feature 09 — Breeding (Seasonal, Farm-Wide).
--
-- breeding_settings holds the farm-wide breeding constants the owner is
-- actively refining: the buck:doe group ratio, the gestation length, and the
-- typical season timing. Exactly ONE row per owner (unique (owner_id)) — the
-- settings form upserts it, never inserts a duplicate.
--
-- gestation_days ships at 171 (5 months + 3 weeks). This is the owner's
-- confirmed real default, NOT a placeholder (09-breeding.md Section 3). The
-- settings form collects months + weeks and converts to days as
-- months * 30 + weeks * 7 — an approximation, overridable later with a direct
-- day count if more precision is ever wanted.
--
-- Convention match: bigserial id, owner_id uuid default auth.uid(), single
-- "for all" owner RLS policy (like barns / goats / inventory_items /
-- herd_events). No global rows, so no split policy is needed.
--
-- No legacy-table name collision: the pre-spec set (goat_records /
-- health_history / vaccinations / deworming / medicine_records /
-- breeding_history / weight_history / sales_purchases) contains no
-- breeding_settings.

create table if not exists public.breeding_settings (
  id                           bigserial primary key,
  owner_id                     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  bucks_per_group              integer not null default 1,
  does_per_group               integer not null default 30,
  gestation_days               integer not null default 171,
  typical_season_starts        integer[] not null default '{3,9}',
  typical_season_length_months integer not null default 3,
  updated_at                   timestamptz not null default now(),
  unique (owner_id)
);

alter table public.breeding_settings enable row level security;

drop policy if exists "Owner manages own breeding settings" on public.breeding_settings;
create policy "Owner manages own breeding settings"
  on public.breeding_settings for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
