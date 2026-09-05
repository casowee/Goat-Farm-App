-- Feature 09 — Breeding (Seasonal, Farm-Wide).
--
-- breeding_season_occurrences records an ACTUAL breeding season — one row per
-- real season the farm ran, NOT a recurring abstract template. One or more
-- bucks are introduced to the herd (start_date), then removed once known
-- (end_date, which stays null until they are actually taken out). The expected
-- kidding window is COMPUTED from start_date / end_date +
-- breeding_settings.gestation_days by lib/breeding/kidding-window.ts — it is
-- never stored here.
--
-- A season can run MORE THAN ONE buck, so the buck link is a join table
-- (breeding_season_bucks, next migration) — there is deliberately no buck_id
-- column here.
--
-- barn_id is optional and, for this pass, purely record-keeping (which group
-- was with the bucks). It does not scope the timeline, the buck-capacity stat,
-- or the reminders (owner's decision 2026-09-05). It is provisioned now so the
-- deferred batch inbreeding check can use it later without a migration.
--
-- Convention match: bigserial id, owner_id uuid default auth.uid(), single
-- "for all" owner RLS policy. No global rows.
--
-- No legacy-table name collision with the pre-spec table set.

create table if not exists public.breeding_season_occurrences (
  id         bigserial primary key,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  barn_id    bigint references public.barns(id) on delete set null,
  start_date date not null,
  end_date   date,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists breeding_season_occurrences_dates_idx
  on public.breeding_season_occurrences (start_date, end_date);

alter table public.breeding_season_occurrences enable row level security;

drop policy if exists "Owner manages own breeding season occurrences" on public.breeding_season_occurrences;
create policy "Owner manages own breeding season occurrences"
  on public.breeding_season_occurrences for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
