-- Feature 09 — Breeding (Seasonal, Farm-Wide). 2026-09-05 amendment.
--
-- Replaces breeding_settings' anonymous typical_season_starts[] /
-- typical_season_length_months columns with a named, editable
-- breeding_season_templates table, and links a logged season back to the
-- template it came from (breeding_season_occurrences.season_template_id,
-- nullable — ad-hoc seasons remain valid).
--
-- This migration is written to run whether or not an earlier draft of the 09
-- migrations was already applied:
--   * if breeding_settings still has the two old columns, their values are
--     migrated into named template rows BEFORE the columns are dropped;
--   * if they were never there, the migrate/drop steps are harmless no-ops.

-- 1. The templates table -----------------------------------------------------

create table if not exists public.breeding_season_templates (
  id            bigserial primary key,
  owner_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  label         text not null,
  start_month   integer not null check (start_month between 1 and 12),
  length_months integer not null default 3 check (length_months between 1 and 12),
  created_at    timestamptz not null default now()
);

create index if not exists breeding_season_templates_owner_idx
  on public.breeding_season_templates (owner_id);

alter table public.breeding_season_templates enable row level security;

drop policy if exists "Owner manages own breeding season templates" on public.breeding_season_templates;
create policy "Owner manages own breeding season templates"
  on public.breeding_season_templates for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 2. Migrate any existing flat-array settings into named template rows -------
--
-- Guarded + fully dynamic: the whole INSERT only parses/runs when the two old
-- columns still exist. unnest + row_number() preserves array order for the
-- "Season 1" / "Season 2" naming.

do $$
declare
  has_cols boolean;
begin
  select count(*) = 2 into has_cols
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'breeding_settings'
    and column_name in ('typical_season_starts', 'typical_season_length_months');

  if has_cols then
    execute $mig$
      insert into public.breeding_season_templates (owner_id, label, start_month, length_months)
      select bs.owner_id,
             'Season ' || t.ord,
             t.start_month,
             coalesce(bs.typical_season_length_months, 3)
      from public.breeding_settings bs
      cross join lateral (
        select m.value as start_month, m.ordinality as ord
        from unnest(bs.typical_season_starts) with ordinality as m(value, ordinality)
      ) t
      where not exists (
        select 1 from public.breeding_season_templates x where x.owner_id = bs.owner_id
      )
    $mig$;
  end if;
end $$;

-- 3. Seed the two defaults for any owner still without templates ------------

insert into public.breeding_season_templates (owner_id, label, start_month, length_months)
select u.id, d.label, d.start_month, 3
from auth.users u
cross join (values ('Season 1', 3), ('Season 2', 9)) as d(label, start_month)
where not exists (
  select 1 from public.breeding_season_templates t where t.owner_id = u.id
);

-- 4. Drop the superseded columns ------------------------------------------------

alter table public.breeding_settings drop column if exists typical_season_starts;
alter table public.breeding_settings drop column if exists typical_season_length_months;

-- 5. Link a logged season back to its template --------------------------------

alter table public.breeding_season_occurrences
  add column if not exists season_template_id bigint
  references public.breeding_season_templates(id) on delete set null;

create index if not exists breeding_season_occurrences_template_idx
  on public.breeding_season_occurrences (season_template_id);
