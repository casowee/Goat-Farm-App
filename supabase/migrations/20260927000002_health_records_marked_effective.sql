-- Feature 15 — Health Reference (Doctor) & Effective Treatment History.
--
-- One additive column on `health_records`. The Doctor module's real new
-- capability is "what worked before": the owner flags a treatment they actually
-- recorded as effective, so when the same condition comes up again the exact
-- treatment that worked is one tap away instead of buried in past records.
--
-- Deliberately NOT a new table (spec 15, Section 6): everything else the flag
-- needs — the goat, the date, the medication, the dosage — is already on the
-- health record itself. A separate table would only duplicate the join.
--
-- No new RLS policy either. `health_records` already has its owner-scoped
-- policy from feature 07 (rewritten to `(select auth.uid())` by spec 17.2), and
-- a policy covers every column of the row, including ones added later. Nothing
-- here widens or weakens that scoping: a second account can no more read or
-- write another owner's `marked_effective` flag than it can read the row.
--
-- `not null default false` means every existing record is "not marked", which
-- is the correct starting state — nothing has been confirmed effective yet.

alter table public.health_records
  add column if not exists marked_effective boolean not null default false;

-- The Doctor condition page asks "every record with this exact title, newest
-- first" across all of this owner's goats. Spec 17.2 already indexed
-- `health_records (owner_id, ...)`; this adds the title lookup that query needs
-- so it does not degrade into a scan as history grows.
create index if not exists health_records_owner_title_date_idx
  on public.health_records (owner_id, title, date_occurred desc);
