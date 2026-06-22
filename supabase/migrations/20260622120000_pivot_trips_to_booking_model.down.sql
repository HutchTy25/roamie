-- =============================================================================
-- Rollback for: 20260622120000_pivot_trips_to_booking_model.sql
--
-- Re-adds the dropped quiz/recommendation columns and removes the two new
-- booking-model columns. This is a STRUCTURAL rollback only: the data that lived
-- in the dropped columns is gone and cannot be restored. Column types mirror the
-- original pre-pivot schema as closely as the insert sites recorded them
-- (Results.jsx / VisitResults.jsx); adjust if the live schema differed.
--
-- Idempotent; safe to run once.
-- =============================================================================

begin;

alter table trips
  drop column if exists destination_photo_url,
  drop column if exists trip_name;

alter table trips
  add column if not exists p1_city      text,
  add column if not exists p2_city      text,
  add column if not exists p1_currency  text,
  add column if not exists p2_currency  text,
  add column if not exists p1_budget    numeric,
  add column if not exists p2_budget    numeric,
  add column if not exists p1_cost      numeric,
  add column if not exists p2_cost      numeric,
  add column if not exists committed    boolean default false,
  add column if not exists committed_at timestamptz,
  add column if not exists vibes        jsonb,
  add column if not exists routing      text,
  add column if not exists accommodation text,
  add column if not exists region       text,
  add column if not exists tagline      text,
  add column if not exists destinations jsonb,
  add column if not exists stretch_goal text;

commit;
