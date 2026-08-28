-- Goat origin & breed composition (feature 05a, follow-up to 05).
-- Additive only — does not touch the 05 migration or its data.
-- `origin` is an enum to match how `sex`/`status` are already defined on goats.

do $$ begin
  create type goat_origin as enum ('born_here', 'purchased');
exception when duplicate_object then null;
end $$;

alter table public.goats
  add column if not exists origin            goat_origin  not null default 'born_here',
  add column if not exists purchase_date     date,
  add column if not exists breed_secondary   text,
  add column if not exists breed_primary_pct numeric(6,3) not null default 100;

-- Existing rows backfill to purebred (secondary null, pct 100) and born-here, satisfying all three checks below.
alter table public.goats
  add constraint goats_breed_pct_range
    check (breed_primary_pct >= 50 and breed_primary_pct <= 100),
  add constraint goats_breed_cross_consistency
    check (
      (breed_secondary is null     and breed_primary_pct = 100) or        -- purebred
      (breed_secondary is not null and breed_primary_pct >= 50
                                   and breed_primary_pct <  100)           -- cross
    ),
  add constraint goats_breed_distinct
    check (breed_secondary is null or breed_secondary <> breed);
