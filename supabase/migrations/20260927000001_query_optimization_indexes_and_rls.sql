-- Spec 17.2 — Supabase Query Optimization, parts G (indexes) and H (RLS
-- performance rewrite). Read-performance only: no new tables, no new columns,
-- no data changes, no change to who can see what.
--
-- Run this whole file in one go in the Supabase SQL editor, the same way every
-- earlier migration in this project was applied:
--   https://supabase.com/dashboard/project/tfzzvtizokakcmwmvmhu/sql/new
-- It should finish with "Success. No rows returned."
--
-- Everything here is idempotent and safe to re-run:
--   * every index uses `create index if not exists`, so indexes that already
--     exist are skipped by Postgres itself;
--   * every policy is dropped with `drop policy if exists` and immediately
--     recreated with the SAME name, the SAME command, the SAME roles and the
--     SAME logic — only the `auth.uid()` wrapping changes.
--
-- The whole file is one transaction, so a failure anywhere leaves the database
-- exactly as it was. In particular no table can be left without its policy.
--
-- =========================================================================
-- SCOPE NOTE — which tables this touches
-- =========================================================================
-- Only the tables the application actually queries. The pre-spec legacy
-- prototype tables (`goat_records`, `health_history`, `medicine_records`,
-- `breeding_history`, `weight_history`, `vaccinations`, `deworming`,
-- `sales_purchases`) are deliberately NOT touched: no application code reads
-- or writes them, and per spec 04 they still carry the older
-- authenticated-only policies rather than owner-scoped ones, so the
-- `auth.uid()` rewrite does not apply to them.
--
-- `public.barns` is also NOT in the policy section below. Its table and policy
-- were created directly in the SQL editor during spec 04 and there is no
-- migration file recording the policy's exact name and body. Dropping a policy
-- whose definition cannot be reproduced verbatim is the one way this file could
-- lock the owner out of their own data (spec 17.2 §8), so it is left alone
-- pending the audit query's output. Its indexes ARE added below — those are
-- safe either way.

begin;

-- =========================================================================
-- PART G — INDEXES
-- =========================================================================
-- Postgres indexes primary keys and unique constraints automatically, but NOT
-- foreign keys. Every `owner_id` column is read by that table's RLS policy on
-- every single query, so an unindexed `owner_id` makes the policy scan the
-- table. Composite `(goat_id, <date> desc)` indexes match exactly how the
-- goat-detail history lists now read: filter by one goat, newest first, 20 at
-- a time.

-- goats -------------------------------------------------------------------
-- `owner_id` and `barn_id` already have indexes from 20260826000001.
-- The parent links do not, and they are walked by the pedigree view, the
-- kidding-event derivation, Top Performers and the doe-performance flags.
create index if not exists goats_sire_id_idx on public.goats (sire_id);
create index if not exists goats_dam_id_idx  on public.goats (dam_id);

-- barns -------------------------------------------------------------------
create index if not exists barns_owner_id_idx on public.barns (owner_id);

-- goat_breed_composition --------------------------------------------------
-- `goat_id` is already indexed (20260828000001); `owner_id` is not.
create index if not exists goat_breed_composition_owner_id_idx
  on public.goat_breed_composition (owner_id);

-- goat_barn_moves ---------------------------------------------------------
-- `goat_id` is already indexed (20260828000002). The two barn foreign keys and
-- `owner_id` are not, and the barn-move list reads newest-first per goat.
create index if not exists goat_barn_moves_owner_id_idx
  on public.goat_barn_moves (owner_id);
create index if not exists goat_barn_moves_from_barn_id_idx
  on public.goat_barn_moves (from_barn_id);
create index if not exists goat_barn_moves_to_barn_id_idx
  on public.goat_barn_moves (to_barn_id);
create index if not exists goat_barn_moves_goat_id_moved_on_idx
  on public.goat_barn_moves (goat_id, moved_on desc);

-- health_records ----------------------------------------------------------
-- `goat_id` and `owner_id` are already indexed (20260829000001). The composite
-- is what the Health tab's paginated read actually wants.
create index if not exists health_records_goat_id_date_idx
  on public.health_records (goat_id, date_occurred desc);
-- The dashboard's "Due soon" list filters on a non-null follow-up date.
create index if not exists health_records_next_due_date_idx
  on public.health_records (next_due_date)
  where next_due_date is not null;

-- health_condition_presets ------------------------------------------------
-- `record_type` is already indexed (20260829000003). The read policy is
-- `owner_id is null or auth.uid() = owner_id`, so `owner_id` is hit every time.
create index if not exists health_condition_presets_owner_id_idx
  on public.health_condition_presets (owner_id);

-- weights -----------------------------------------------------------------
-- `goat_id` and `owner_id` are already indexed (20260829000002).
create index if not exists weights_goat_id_weighed_on_idx
  on public.weights (goat_id, weighed_on desc);

-- herd_events -------------------------------------------------------------
-- `goat_id` and `event_date` are already indexed (20260829000006).
create index if not exists herd_events_owner_id_idx
  on public.herd_events (owner_id);

-- inventory_items ---------------------------------------------------------
-- `type` is already indexed (20260829000004).
create index if not exists inventory_items_owner_id_idx
  on public.inventory_items (owner_id);

-- breeding_settings -------------------------------------------------------
create index if not exists breeding_settings_owner_id_idx
  on public.breeding_settings (owner_id);

-- breeding_season_templates -----------------------------------------------
-- An owner index already exists (20260905000004) — listed here only so the set
-- reads completely; `if not exists` makes it a no-op.
create index if not exists breeding_season_templates_owner_id_idx
  on public.breeding_season_templates (owner_id);

-- breeding_season_occurrences ---------------------------------------------
-- Dates and the template FK are already indexed (20260905000002).
create index if not exists breeding_season_occurrences_owner_id_idx
  on public.breeding_season_occurrences (owner_id);
create index if not exists breeding_season_occurrences_barn_id_idx
  on public.breeding_season_occurrences (barn_id);

-- breeding_season_bucks ---------------------------------------------------
-- `season_id` and `buck_id` are already indexed (20260905000003).
create index if not exists breeding_season_bucks_owner_id_idx
  on public.breeding_season_bucks (owner_id);

-- doe_performance_settings ------------------------------------------------
create index if not exists doe_performance_settings_owner_id_idx
  on public.doe_performance_settings (owner_id);

-- doe_performance_notes ---------------------------------------------------
-- `doe_id` is already indexed (20260905000006).
create index if not exists doe_performance_notes_owner_id_idx
  on public.doe_performance_notes (owner_id);

-- =========================================================================
-- PART H — RLS POLICY PERFORMANCE REWRITE
-- =========================================================================
-- `auth.uid() = owner_id` re-evaluates `auth.uid()` once per candidate ROW.
-- `(select auth.uid()) = owner_id` evaluates it once per QUERY and compares the
-- result against every row — identical access decisions, far less work, and it
-- clears Supabase's `auth_rls_initplan` Performance Advisor warning.
--
-- Each block below reproduces the policy exactly as its original migration
-- created it (same name, same command, same `to` clause or deliberate absence
-- of one, same predicate) with only the `auth.uid()` call wrapped.

-- goats — 20260826000001 --------------------------------------------------
drop policy if exists "owner full access" on public.goats;
create policy "owner full access" on public.goats
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- goat_breed_composition — 20260828000001 --------------------------------
drop policy if exists "owner full access" on public.goat_breed_composition;
create policy "owner full access" on public.goat_breed_composition
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- goat_barn_moves — 20260828000002 ---------------------------------------
drop policy if exists "owner full access" on public.goat_barn_moves;
create policy "owner full access" on public.goat_barn_moves
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- health_records — 20260829000001 ----------------------------------------
drop policy if exists "health_records_owner_policy" on public.health_records;
create policy "health_records_owner_policy" on public.health_records
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- weights — 20260829000002 -----------------------------------------------
drop policy if exists "weights_owner_policy" on public.weights;
create policy "weights_owner_policy" on public.weights
  for all
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- health_condition_presets — 20260829000003 ------------------------------
-- Four separate policies, and the asymmetry between them is deliberate: read
-- includes the seeded global defaults (`owner_id is null`), while update and
-- delete are restricted to the owner's OWN rows so the app-layer owner can
-- never edit or remove a global default. That asymmetry is preserved exactly.
drop policy if exists "Owner can read presets (own + global defaults)"
  on public.health_condition_presets;
create policy "Owner can read presets (own + global defaults)"
  on public.health_condition_presets for select
  using (owner_id is null or (select auth.uid()) = owner_id);

drop policy if exists "Owner can insert own presets"
  on public.health_condition_presets;
create policy "Owner can insert own presets"
  on public.health_condition_presets for insert
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owner can update own presets"
  on public.health_condition_presets;
create policy "Owner can update own presets"
  on public.health_condition_presets for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owner can delete own presets"
  on public.health_condition_presets;
create policy "Owner can delete own presets"
  on public.health_condition_presets for delete
  using ((select auth.uid()) = owner_id);

-- inventory_items — 20260829000004 ---------------------------------------
drop policy if exists "Owner manages own inventory items"
  on public.inventory_items;
create policy "Owner manages own inventory items"
  on public.inventory_items for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- herd_events — 20260829000006 -------------------------------------------
drop policy if exists "Owner manages own herd events" on public.herd_events;
create policy "Owner manages own herd events"
  on public.herd_events for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- breeding_settings — 20260905000001 -------------------------------------
drop policy if exists "Owner manages own breeding settings"
  on public.breeding_settings;
create policy "Owner manages own breeding settings"
  on public.breeding_settings for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- breeding_season_occurrences — 20260905000002 ---------------------------
drop policy if exists "Owner manages own breeding season occurrences"
  on public.breeding_season_occurrences;
create policy "Owner manages own breeding season occurrences"
  on public.breeding_season_occurrences for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- breeding_season_bucks — 20260905000003 ---------------------------------
drop policy if exists "Owner manages own breeding season bucks"
  on public.breeding_season_bucks;
create policy "Owner manages own breeding season bucks"
  on public.breeding_season_bucks for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- breeding_season_templates — 20260905000004 -----------------------------
drop policy if exists "Owner manages own breeding season templates"
  on public.breeding_season_templates;
create policy "Owner manages own breeding season templates"
  on public.breeding_season_templates for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- doe_performance_settings — 20260905000005 ------------------------------
drop policy if exists "Owner manages own doe performance settings"
  on public.doe_performance_settings;
create policy "Owner manages own doe performance settings"
  on public.doe_performance_settings for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- doe_performance_notes — 20260905000006 ---------------------------------
drop policy if exists "Owner manages own doe performance notes"
  on public.doe_performance_notes;
create policy "Owner manages own doe performance notes"
  on public.doe_performance_notes for all
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

commit;

-- =========================================================================
-- AFTER RUNNING
-- =========================================================================
-- 1. Re-check the Performance Advisor and confirm the unindexed-foreign-key and
--    `auth_rls_initplan` warnings are gone for these tables:
--    https://supabase.com/dashboard/project/tfzzvtizokakcmwmvmhu/advisors/performance
--    Any remaining `auth_rls_initplan` warning on `public.barns` is expected —
--    see the scope note at the top.
-- 2. Sign in to the app and add, edit and delete one record (spec 17.2 §7 V9).
--    That is the practical proof the policies still grant the right access.
