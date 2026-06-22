-- =============================================================================
-- Rollback for: 20260622140000_add_booking_fields.sql
-- Drops the constraint then the three columns. Idempotent / IF EXISTS.
-- =============================================================================

begin;

alter table bookings drop constraint if exists bookings_nights_nonneg;

alter table bookings
  drop column if exists nights,
  drop column if exists vendor_name,
  drop column if exists confirmation_code;

commit;
