-- UPD-006 (6b) — Herd population timeline.
--
-- herd_events records the herd-size-changing events that are NOT already
-- derivable from goat records: sales, deaths, and any other one-off
-- addition/removal. Births and purchases are deliberately NOT stored here —
-- the timeline derives those from goats.date_of_birth (origin = 'born_here')
-- and goats.purchase_date (origin = 'purchased'), which already exist.
--
-- Convention match: bigserial id, owner_id uuid default auth.uid(), single
-- "for all" owner RLS policy (like barns / goats / inventory_items). No global
-- rows here, so no split policy is needed (contrast UPD-004's presets).
--
-- No legacy-table name collision: the pre-spec set (goat_records / health_history
-- / vaccinations / deworming / medicine_records / breeding_history /
-- weight_history / sales_purchases) contains no `herd_events`.

do $$ begin
  create type herd_event_type as enum ('sale', 'death', 'other_addition', 'other_removal');
exception when duplicate_object then null;
end $$;

create table if not exists public.herd_events (
  id          bigserial primary key,
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  goat_id     bigint references public.goats(id) on delete set null,
  event_type  herd_event_type not null,
  event_date  date not null default current_date,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists herd_events_date_idx    on public.herd_events (event_date);
create index if not exists herd_events_goat_id_idx on public.herd_events (goat_id);

alter table public.herd_events enable row level security;

drop policy if exists "Owner manages own herd events" on public.herd_events;
create policy "Owner manages own herd events"
  on public.herd_events for all
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- ---------------------------------------------------------------------------
-- log_herd_event — insert a herd event and, for a Sale or Death that names a
-- goat, flip that goat's status to 'sold' / 'deceased' in the SAME statement
-- batch. UPD-006 Section 8 makes this side effect a hard requirement: the
-- event log and the goat's own status must never disagree. Doing both inside
-- one function keeps them atomic (a two-step server action could half-apply on
-- a mid-call crash — see the 06 barn-move trade-off; this event carries a
-- stronger integrity rule, so it gets the RPC).
--
-- SECURITY INVOKER (the default): the function runs as the calling user, so
-- RLS on herd_events and goats still applies — the insert's WITH CHECK and the
-- goats owner policy both enforce ownership. The explicit owner_id filter on
-- the UPDATE is belt-and-braces.
-- ---------------------------------------------------------------------------
create or replace function public.log_herd_event(
  p_event_type herd_event_type,
  p_event_date date,
  p_goat_id    bigint default null,
  p_note       text   default null
)
returns public.herd_events
language plpgsql
as $$
declare
  v_row public.herd_events;
begin
  insert into public.herd_events (owner_id, goat_id, event_type, event_date, note)
  values (
    auth.uid(),
    p_goat_id,
    p_event_type,
    coalesce(p_event_date, current_date),
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning * into v_row;

  if p_event_type in ('sale', 'death') and p_goat_id is not null then
    update public.goats
      set status = case p_event_type
                     when 'sale'  then 'sold'::goat_status
                     else              'deceased'::goat_status
                   end
      where id = p_goat_id
        and owner_id = auth.uid();
  end if;

  return v_row;
end;
$$;

grant execute on function public.log_herd_event(herd_event_type, date, bigint, text) to authenticated;
