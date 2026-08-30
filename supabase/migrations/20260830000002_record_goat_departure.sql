-- UPD-008 (8c) — one shared, atomic "a goat left the herd" side effect.
--
-- This is THE single path for recording a Sale / Death / Stolen departure.
-- Both callers use it, so the status + herd_events (+ health record on death)
-- writes live in exactly one place and can never half-apply out of sync
-- (spec Section 7):
--
--   * UPD-008's reason-based removal dialog  (Sold / Death / Stolen)
--   * UPD-006's Log Herd Event form, via createHerdEvent  (Sale / Death)
--
-- log_herd_event() (UPD-006, migration 20260829000006) is kept for the
-- goat-less "Other addition" / "Other removal" events only — createHerdEvent
-- now routes Sale / Death here instead, so the Sale/Death status-sync logic is
-- no longer duplicated.
--
--   kind = 'sale'   -> goats.status = 'sold',      herd_events.event_type = 'sale'
--   kind = 'death'  -> goats.status = 'deceased',  herd_events.event_type = 'death'
--                      + a health_records row when p_cause_title is supplied,
--                        typed to p_cause_category (illness / injury)
--   kind = 'stolen' -> goats.status = 'stolen',    herd_events.event_type = 'other_removal'
--
-- SECURITY INVOKER (the default): the function runs as the calling user, so RLS
-- on goats / herd_events / health_records still applies. The explicit
-- `owner_id = auth.uid()` filters are belt-and-braces.

create or replace function public.record_goat_departure(
  p_goat_id        bigint,
  p_kind           text,
  p_date           date,
  p_note           text default null,
  p_cause_title    text default null,
  p_cause_category health_record_type default null
)
returns public.herd_events
language plpgsql
as $$
declare
  v_row        public.herd_events;
  v_event_type herd_event_type;
  v_status     goat_status;
begin
  if p_kind = 'sale' then
    v_event_type := 'sale';          v_status := 'sold';
  elsif p_kind = 'death' then
    v_event_type := 'death';         v_status := 'deceased';
  elsif p_kind = 'stolen' then
    v_event_type := 'other_removal'; v_status := 'stolen';
  else
    raise exception 'record_goat_departure: unknown kind %', p_kind;
  end if;

  insert into public.herd_events (owner_id, goat_id, event_type, event_date, note)
  values (
    auth.uid(),
    p_goat_id,
    v_event_type,
    coalesce(p_date, current_date),
    nullif(btrim(coalesce(p_note, '')), '')
  )
  returning * into v_row;

  update public.goats
    set status = v_status
    where id = p_goat_id
      and owner_id = auth.uid();

  if p_kind = 'death'
     and nullif(btrim(coalesce(p_cause_title, '')), '') is not null then
    insert into public.health_records
      (owner_id, goat_id, record_type, title, date_occurred, status)
    values (
      auth.uid(),
      p_goat_id,
      coalesce(p_cause_category, 'illness'::health_record_type),
      btrim(p_cause_title),
      coalesce(p_date, current_date),
      'completed'::health_record_status
    );
  end if;

  return v_row;
end;
$$;

grant execute on function public.record_goat_departure(bigint, text, date, text, text, health_record_type)
  to authenticated;
