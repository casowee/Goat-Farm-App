-- UPD-010 — newborn kid registration without a permanent tag.
--
-- A newborn kid is registered the moment it's born, connected to its dam, but
-- without a permanent ear tag (kids often go untagged for months due to high
-- early mortality). The "Add newborn kid" flow auto-generates a unique
-- {dam_tag}-K{n} value for goats.tag and marks the row here so the UI can:
--   * show a "Temp" badge wherever the tag is displayed, and
--   * exclude the row from UPD-008's duplicate-tag warning / review
--     (system-generated tags are already guaranteed unique — flagging them
--      would just be noise).
--
-- is_temp_tag is a display/behaviour flag ONLY. It does not change RLS,
-- ownership, or the NOT NULL + uniqueness guarantees on goats.tag. Promoting a
-- kid to a permanent tag is a normal edit that sets this back to false; there is
-- no supported flow to turn it on again from the UI.
--
-- Additive, non-destructive: existing rows default to false (already-tagged).

alter table public.goats
  add column if not exists is_temp_tag boolean not null default false;
