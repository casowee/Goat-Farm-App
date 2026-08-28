-- Goat profiles (feature 05). Owner-scoped, following the pattern barns established:
-- bigserial ids (not uuid) and a single "owner full access" RLS policy, to match barns.
-- tag is the required identifier here (per the owner); name is an optional secondary label.

do $$ begin
  create type goat_sex as enum ('male', 'female');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type reproductive_state as enum ('intact', 'castrated');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type goat_status as enum ('active', 'sold', 'deceased');
exception when duplicate_object then null;
end $$;

create table public.goats (
  id                 bigserial primary key,
  owner_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tag                text not null,
  name               text,
  breed              text,
  sex                goat_sex not null,
  date_of_birth      date not null,
  reproductive_state reproductive_state not null default 'intact',
  status             goat_status not null default 'active',
  barn_id            bigint references public.barns (id) on delete set null,
  photo_url          text,
  notes              text,
  sire_id            bigint references public.goats (id) on delete set null,
  dam_id             bigint references public.goats (id) on delete set null,
  sire_name          text,
  dam_name           text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index goats_owner_id_idx on public.goats (owner_id);
create index goats_barn_id_idx on public.goats (barn_id);

alter table public.goats enable row level security;

create policy "owner full access" on public.goats
  for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
