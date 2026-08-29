-- UPD-005 (amendment) — categorise medicine inventory items so the health-record
-- comboboxes can filter by context: the Deworming step offers only dewormers,
-- the Treatment step offers everything except dewormers.
--
-- Additive: a new nullable `category` column on the existing (already-applied)
-- inventory_items table + a backfill of the 13 seeded drugs. Does NOT touch
-- 20260829000004_inventory_items.sql. Spec 10 (Inventory) will own a proper
-- category picker in its inventory screens; this update just needs enough to
-- split the two health-record contexts.

do $$ begin
  create type medicine_category as enum (
    'antibiotic',
    'vitamin_support',
    'anti_inflammatory',
    'dewormer',
    'other'
  );
exception when duplicate_object then null;
end $$;

alter table public.inventory_items
  add column if not exists category medicine_category;

-- Backfill the 13 seeded drugs with their real category.
update public.inventory_items set category = 'antibiotic'
  where name in (
    'Oxytetracycline 20%',
    'Oxytetracycline 10%',
    'Gentavet (Gentamicin)',
    'Pen and Strip Antibiotic',
    'Penicillin',
    'Tylosin 200 (20%)'
  );

update public.inventory_items set category = 'vitamin_support'
  where name in ('Iron Dextran', 'Multivitamin injections');

update public.inventory_items set category = 'anti_inflammatory'
  where name in ('Dexamethasone');

update public.inventory_items set category = 'dewormer'
  where name in ('Ivermectin', 'Nitroxinil', 'Nilvasol 1L', 'AlbeNor 1L');
