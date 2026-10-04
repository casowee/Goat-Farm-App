-- UPD-016 amendment (2026-10-04) — ONE-OFF backfill of an earlier bulk action
-- into a batch, approved by the owner (replacing the earlier "no backfill"
-- rule). Recorded here so the change is in version control.
--
-- Why: bulk actions done before `health_record_batches` existed
-- (20261004000001) wrote ordinary records with no `batch_id`, so they do not
-- appear on the Health page, which shows group events only.
--
-- What the dry run found (2026-10-04) — exactly one candidate group:
--
--   record type  deworming
--   title        Routine Deworming
--   product      Nilvasol 1L
--   date given   2026-09-02
--   next due     2026-10-08
--   goats        58, all Does, created within the same second
--
-- This file converts THAT group and nothing else. It is deliberately not a
-- general "group everything that looks alike" statement: any other record —
-- including every single-goat record — is left untouched.
--
-- What it does: creates one `health_record_batches` row labelled "Does" and
-- sets `batch_id` on the matching records. The batch's `created_at` is taken
-- from the records themselves, so it sorts where the action really happened.
-- `owner_id` is set explicitly because the SQL editor has no signed-in user
-- for the column default (`auth.uid()`) to read.
--
-- Safe to run twice: it only ever looks at records whose `batch_id` is still
-- null. After the first run none match, so a second run creates no batch and
-- changes no record. A record that already has a `batch_id` is never touched.
-- It also does nothing if fewer than 2 different goats match — a single goat
-- is not a group.
--
-- Run this whole file in one go in the Supabase SQL editor. The "Messages" /
-- notices output says how many records were grouped.

do $$
declare
  v_owner uuid;
  v_batch bigint;
  v_count integer;
begin
  for v_owner in
    select hr.owner_id
    from public.health_records hr
    where hr.batch_id is null
      and hr.record_type = 'deworming'
      and hr.title = 'Routine Deworming'
      and btrim(coalesce(hr.medication_name, '')) = 'Nilvasol 1L'
      and hr.date_occurred = date '2026-09-02'
      and hr.next_due_date = date '2026-10-08'
    group by hr.owner_id
    having count(distinct hr.goat_id) >= 2
  loop
    insert into public.health_record_batches (owner_id, label, created_at)
    select v_owner, 'Does', min(hr.created_at)
    from public.health_records hr
    where hr.owner_id = v_owner
      and hr.batch_id is null
      and hr.record_type = 'deworming'
      and hr.title = 'Routine Deworming'
      and btrim(coalesce(hr.medication_name, '')) = 'Nilvasol 1L'
      and hr.date_occurred = date '2026-09-02'
      and hr.next_due_date = date '2026-10-08'
    returning id into v_batch;

    update public.health_records hr
    set batch_id = v_batch
    where hr.owner_id = v_owner
      and hr.batch_id is null
      and hr.record_type = 'deworming'
      and hr.title = 'Routine Deworming'
      and btrim(coalesce(hr.medication_name, '')) = 'Nilvasol 1L'
      and hr.date_occurred = date '2026-09-02'
      and hr.next_due_date = date '2026-10-08';

    get diagnostics v_count = row_count;
    raise notice 'Backfill: grouped % deworming records into batch % ("Does").', v_count, v_batch;
  end loop;

  if v_batch is null then
    raise notice 'Backfill: nothing to do — no ungrouped records match (already run, or none exist).';
  end if;
end $$;
