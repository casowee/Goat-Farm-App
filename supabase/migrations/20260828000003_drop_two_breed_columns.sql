-- Feature 06 (6b) — retire the two-breed columns now that goat_breed_composition
-- is the source of truth for breed shares.
--
-- RUN ONLY AFTER verifying the backfill from 20260828000001:
--   select goat_id, sum(pct) from public.goat_breed_composition
--   group by goat_id having sum(pct) <> 100;
-- must return zero rows, and:
--   select count(*) from public.goats where breed is not null
--     and id not in (select goat_id from public.goat_breed_composition);
-- must return 0.
--
-- goats.breed is KEPT as a denormalised "primary breed" label for quick display
-- (list/table views) without joining the composition table. Only the cross-only
-- columns and their check constraints are removed here.

alter table public.goats drop constraint if exists goats_breed_pct_range;
alter table public.goats drop constraint if exists goats_breed_cross_consistency;
alter table public.goats drop constraint if exists goats_breed_distinct;

alter table public.goats drop column if exists breed_secondary;
alter table public.goats drop column if exists breed_primary_pct;

-- Recovery, if ever needed: re-add the columns, then
--   update public.goats g set
--     breed_primary_pct = c.pct
--   from public.goat_breed_composition c
--   where c.goat_id = g.id and c.breed = g.breed;
--   update public.goats g set breed_secondary = c.breed
--   from public.goat_breed_composition c
--   where c.goat_id = g.id and c.breed <> g.breed;
