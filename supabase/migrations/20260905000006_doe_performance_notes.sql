-- UPD-012 — Doe Reproductive Performance Tracking.
--
-- doe_performance_notes is the owner's own investigation history for a flagged
-- doe: each row is one recorded conclusion — a category plus optional free text.
-- Notes ACCUMULATE (one row per entry, newest shown first); nothing is ever
-- overwritten, so the owner can see how their thinking evolved (§5).
--
-- The system never diagnoses a root cause itself — it shows the doe's kidding
-- history and her recent health records side by side; the owner draws the
-- conclusion and records it here (§4, out of scope: automatic diagnosis).
--
-- doe_performance_category enum:
--   age        — the doe is simply getting old
--   health     — a past or ongoing health issue explains it
--   buck_issue — a buck problem (infertile / absent) explains it
--   other      — something else
--   resolved   — investigated and no longer a concern
--
-- Convention match: bigserial id, owner_id uuid default auth.uid(), single
-- "for all" owner RLS policy. doe_id -> goats(id) on delete cascade (a note has
-- no meaning without its doe). No legacy-table name collision.

do $$ begin
  create type doe_performance_category as enum ('age','health','buck_issue','other','resolved');
exception when duplicate_object then null;
end $$;

create table if not exists public.doe_performance_notes (
  id         bigserial primary key,
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  doe_id     bigint not null references public.goats(id) on delete cascade,
  category   doe_performance_category not null,
  note       text,
  created_at timestamptz not null default now()
);

create index if not exists doe_performance_notes_doe_id_idx on public.doe_performance_notes (doe_id);

alter table public.doe_performance_notes enable row level security;

drop policy if exists "Owner manages own doe performance notes" on public.doe_performance_notes;
create policy "Owner manages own doe performance notes"
  on public.doe_performance_notes for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
