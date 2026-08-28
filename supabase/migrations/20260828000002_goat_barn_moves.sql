-- Feature 06 (6d) — barn-move history.
-- Records each time a goat is moved between barns. goats.barn_id stays the
-- goat's *current* barn; this table is the audit trail of past moves.
--
-- Convention match: bigserial id, owner_id uuid default auth.uid(), single
-- "owner full access" style RLS policy (as barns / goats already use).
-- No pre-spec legacy table occupies this name (checked against types/database.types.ts).

create table if not exists public.goat_barn_moves (
  id           bigserial primary key,
  owner_id     uuid   not null default auth.uid() references auth.users (id) on delete cascade,
  goat_id      bigint not null references public.goats (id) on delete cascade,
  from_barn_id bigint references public.barns (id) on delete set null,
  to_barn_id   bigint references public.barns (id) on delete set null,
  moved_on     date   not null default current_date,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists goat_barn_moves_goat_id_idx
  on public.goat_barn_moves (goat_id);

alter table public.goat_barn_moves enable row level security;

do $$ begin
  create policy "owner full access" on public.goat_barn_moves
    for all to authenticated
    using (auth.uid() = owner_id)
    with check (auth.uid() = owner_id);
exception when duplicate_object then null;
end $$;
