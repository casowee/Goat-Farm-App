-- UPD-005 — Treatment Medication From Inventory (forward-provisioned for spec 10).
--
-- inventory_items is built EARLY here, medicine-only in practice, so the
-- health-record Treatment step has a real drug list to pick from instead of a
-- free-text field. Spec 10 (Inventory) EXTENDS this table with an additive
-- migration — feed items, quantity / restock editing, low-stock thresholds and
-- alerts, a dedicated Inventory screen — it does NOT recreate it. The `unit`
-- and `low_stock_threshold` columns and the `feed` enum value are already
-- present but unused, ready for spec 10 to wire up.
--
-- Convention: `bigserial` id + a single "for all" owner RLS policy, like barns
-- / goats / health_records. Unlike UPD-004's health_condition_presets, this
-- table has NO global / shared rows, so the standard owner-only policy applies
-- directly with no split needed.
--
-- health_records.medication stays PLAIN TEXT — no schema change there, no
-- foreign key to this table (UPD-005 Section 4 / 6, deliberately lower-risk).
--
-- No legacy-table collision: the pre-spec set (goat_records / health_history /
-- vaccinations / deworming / medicine_records / breeding_history /
-- weight_history / sales_purchases) contains no `inventory_items`.

do $$ begin
  create type inventory_item_type as enum ('medicine', 'feed');
exception when duplicate_object then null;
end $$;

create table if not exists public.inventory_items (
  id                  bigserial primary key,
  owner_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type                inventory_item_type not null default 'medicine',
  name                text not null,
  quantity            numeric(10,2) not null default 0,
  unit                text,              -- e.g. "ml", "vials"; nullable for now — spec 10 may require it
  low_stock_threshold numeric(10,2),     -- nullable; spec 10's concern, unused by this update
  created_at          timestamptz not null default now(),
  unique (owner_id, type, name)
);

create index if not exists inventory_items_type_idx on public.inventory_items (type);

alter table public.inventory_items enable row level security;

drop policy if exists "Owner manages own inventory items" on public.inventory_items;
create policy "Owner manages own inventory items"
  on public.inventory_items for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- Seed — the 13 known farm drugs, type 'medicine', quantity 0 (actual stock
-- is unknown; spec 10 will let the owner set real levels). One set per existing
-- owner. `on conflict do nothing` on the (owner_id, type, name) unique key
-- makes re-running this migration safe.
-- ---------------------------------------------------------------------------
insert into public.inventory_items (owner_id, type, name, quantity)
select u.id, 'medicine'::inventory_item_type, seed.name, 0
from auth.users u
cross join (
  values
    -- Antibiotics
    ('Oxytetracycline 20%'),
    ('Oxytetracycline 10%'),
    ('Gentavet (Gentamicin)'),
    ('Pen and Strip Antibiotic'),
    ('Penicillin'),
    ('Tylosin 200 (20%)'),
    -- Vitamins & Support
    ('Iron Dextran'),
    ('Multivitamin injections'),
    -- Anti-Inflammatory / Steroid
    ('Dexamethasone'),
    -- Dewormers
    ('Ivermectin'),
    ('Nitroxinil'),
    ('Nilvasol 1L'),
    ('AlbeNor 1L')
) as seed(name)
on conflict (owner_id, type, name) do nothing;
