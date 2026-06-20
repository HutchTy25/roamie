-- =============================================================================
-- Rollback for: 20260619120000_create_bookings.sql
-- Reverses, in dependency order, everything the forward migration created:
--   bookings (table, RLS policy, indexes, trigger) -> enum types ->
--   couples budget columns/constraints -> trips anchor+budget columns/constraints.
--
-- The shared set_updated_at() function is dropped ONLY if no other trigger still
-- depends on it (the forward migration used CREATE OR REPLACE, so it may have
-- pre-existed or be reused elsewhere). All steps are idempotent / IF EXISTS.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. bookings table.
--    DROP TABLE cascades its own policy, indexes, and the updated_at trigger,
--    so they need no separate statements. (RLS policy + indexes live on the
--    table; the trigger is attached to it.)
-- -----------------------------------------------------------------------------
drop table if exists bookings;

-- -----------------------------------------------------------------------------
-- 2. Enum types. Safe now that the only consumer (bookings) is gone.
-- -----------------------------------------------------------------------------
drop type if exists booking_status;
drop type if exists booking_category;

-- -----------------------------------------------------------------------------
-- 3. Couple portfolio-level budget: constraints first, then columns.
-- -----------------------------------------------------------------------------
alter table couples drop constraint if exists couples_budget_total_nonneg;
alter table couples drop constraint if exists couples_budget_currency_iso3;

alter table couples
  drop column if exists budget_currency,
  drop column if exists budget_total;

-- -----------------------------------------------------------------------------
-- 4. Trip destination anchor + per-trip budget: constraints first, then columns.
-- -----------------------------------------------------------------------------
alter table trips drop constraint if exists trips_budget_total_nonneg;
alter table trips drop constraint if exists trips_budget_currency_iso3;
alter table trips drop constraint if exists trips_destination_currency_iso3;
alter table trips drop constraint if exists trips_destination_iata_fmt;

alter table trips
  drop column if exists budget_currency,
  drop column if exists budget_total,
  drop column if exists destination_currency,
  drop column if exists destination_iata;

-- -----------------------------------------------------------------------------
-- 5. Shared updated_at trigger function.
--    Drop only if nothing else still references it (other tables may have
--    adopted it). If any trigger still uses set_updated_at, leave it in place.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_trigger tg
    join pg_proc p on p.oid = tg.tgfoid
    where p.proname = 'set_updated_at'
      and not tg.tgisinternal
  ) then
    drop function if exists set_updated_at();
  end if;
end
$$;

commit;
