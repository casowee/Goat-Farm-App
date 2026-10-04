-- UPD-016 / UPD-017 amendment (2026-10-04) — remember which goats were left
-- out of a bulk action.
--
-- A batch's label already says HOW MANY goats were excluded ("Does (57 of
-- 58)"), but not WHICH. The Health page now shows the excluded goats on the
-- group event's row instead of an expandable list of every goat in the group,
-- so the batch has to remember them.
--
--   health_record_batches.excluded_goat_ids — the ids of the goats the owner
--     excluded by tag in the Bulk schedule dialog. Empty for a whole-group
--     action, and for every batch created before this column existed
--     (including the backfilled 2 Sep 2026 "Does" deworming) — nothing is
--     guessed for those.
--
-- An array rather than a join table: it is a small, write-once note about the
-- batch, read only together with it. There is no foreign key on array
-- elements, so the page simply skips an id whose goat no longer exists.
--
-- Purely additive; no RLS change (the column rides on the table's existing
-- owner policy). Idempotent and safe to re-run. Run it in the Supabase SQL
-- editor.

alter table public.health_record_batches
  add column if not exists excluded_goat_ids bigint[] not null default '{}';
