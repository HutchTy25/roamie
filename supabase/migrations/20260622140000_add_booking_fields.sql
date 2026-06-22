-- =============================================================================
-- Migration: add booking fields (confirmation_code, vendor_name, nights)
-- Purpose:   The original bookings migration (20260619120000) was already applied
--            to prod BEFORE these three columns were added to its definition, so
--            a re-run (create table if not exists) would skip them. This forward
--            ALTER lands them on the existing table. Idempotent — also a no-op on
--            a fresh DB where the create-migration already includes them.
--
--   confirmation_code - airline/hotel reservation code (PNR). Free text.
--   vendor_name       - specific property/airline/operator (add-reservation form).
--   nights            - stay length for lodging; null for non-stay items.
-- =============================================================================

begin;

alter table bookings
  add column if not exists confirmation_code text,
  add column if not exists vendor_name       text,
  add column if not exists nights            integer;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bookings_nights_nonneg') then
    alter table bookings add constraint bookings_nights_nonneg
      check (nights is null or nights >= 0);
  end if;
end
$$;

comment on column bookings.confirmation_code is 'Airline/hotel reservation/confirmation code (PNR). Free text; null until booked.';
comment on column bookings.vendor_name       is 'Specific vendor (hotel/property/airline/operator). Null until set.';
comment on column bookings.nights            is 'Stay length in nights for lodging; null for non-stay items.';

commit;
