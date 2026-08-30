-- UPD-008 (8c) — reason-based goat removal.
--
-- 'stolen' joins the goat_status enum so a goat the owner marks as stolen is
-- PRESERVED (its row and history stay) via a status change, exactly like
-- 'sold' / 'deceased' — never hard-deleted. Only "Wrong registration" deletes.
--
-- Standalone migration on purpose: Postgres will not let a value added to an
-- enum by `ALTER TYPE ... ADD VALUE` be used later in the SAME transaction, so
-- the record_goat_departure() function that writes 'stolen'::goat_status lives
-- in its own follow-up migration (20260830000002). Do not fold other DDL into
-- this file.

alter type goat_status add value if not exists 'stolen';
