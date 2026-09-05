-- UPD-012 — Doe Reproductive Performance Tracking.
--
-- doe_performance_settings holds the two owner-editable thresholds the "Doe
-- Performance" flagging uses:
--   * max_expected_interval_months — a doe overdue since her last kidding, OR
--     with a historical average interval longer than this, is flagged.
--   * breeding_eligible_age_months — a doe past this age with zero kiddings is
--     flagged 'never_kidded_but_eligible'; a younger doe with zero kiddings is
--     simply not judged yet (not flagged).
--
-- Defaults ship at 13 and 12 months respectively — the owner's confirmed
-- out-of-the-box values (§14 + the 2026-09-05 amendment: "a doeling can have
-- kids once she is older than a year"), retunable from the settings form
-- without a migration. breeding_eligible_age_months is compared against a
-- doe's RAW age from date_of_birth, never her derived life-stage label — the
-- two are independent concepts. The flag itself is NEVER stored — it is
-- recomputed live from these settings on every page load (§7), so changing a
-- value here reflects across every doe immediately.
--
-- Exactly ONE row per owner (unique (owner_id)) — the settings form upserts it.
--
-- Convention match: bigserial id, owner_id uuid default auth.uid(), single
-- "for all" owner RLS policy (like barns / goats / breeding_settings). No
-- global rows. No legacy-table name collision with the pre-spec table set.

create table if not exists public.doe_performance_settings (
  id                           bigserial primary key,
  owner_id                     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  max_expected_interval_months integer not null default 13,
  breeding_eligible_age_months integer not null default 12,
  updated_at                   timestamptz not null default now(),
  unique (owner_id)
);

alter table public.doe_performance_settings enable row level security;

drop policy if exists "Owner manages own doe performance settings" on public.doe_performance_settings;
create policy "Owner manages own doe performance settings"
  on public.doe_performance_settings for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
