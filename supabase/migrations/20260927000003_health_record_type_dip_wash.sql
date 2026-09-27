-- UPD-016 (Section 6) — dip wash becomes a real, trackable health record type.
--
-- External parasite control (dipping / washing against ticks, lice, mites) had
-- no way to be logged or scheduled. It follows exactly the same shape as
-- vaccination and deworming: a date it was given, plus a next-due date the
-- Schedule tab and the dashboard's Due soon widget read. No new table and no
-- RLS change — `dip_wash` rides on `health_records`' existing owner policy.
--
-- Standalone migration on purpose, exactly as 20260830000001 was for
-- `goat_status` → 'stolen': Postgres will not let a value added to an enum by
-- `ALTER TYPE ... ADD VALUE` be used later in the SAME transaction. Do not fold
-- other DDL into this file. Nothing here writes a `dip_wash` row, so there is
-- no follow-up migration this time.
--
-- Additive and idempotent: existing rows and the other seven enum values are
-- untouched.

alter type health_record_type add value if not exists 'dip_wash';
