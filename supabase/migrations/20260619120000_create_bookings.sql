-- =============================================================================
-- Migration: bookings table + trip/couple budget + trip destination anchor
-- Purpose:   Support the couples' financial trip-planning model.
--
--   * bookings  - one booking line item (flight/hotel/transport/other) per row,
--                 attached to a trip. Tracks who paid (payer_id) vs. whose cost
--                 it is (owner_id), the FX rate locked at payment, a settlement
--                 status, and a cancellation/payment deadline.
--   * trips     - gains a destination-currency anchor (the display currency for
--                 every booking on the trip) and its own independent budget.
--   * couples   - gains a portfolio-level budget (across all trips).
--
-- Currency model:
--   price_amount/price_currency is the booking's ground truth (the receipt).
--   fx_rate_locked converts price_currency -> trips.destination_currency (the
--   per-trip display anchor), captured once at fx_locked_at so later rate drift
--   never changes what a partner owes. This ledger FX is intentionally separate
--   from computeTripCosts()'s USD-based, live-rate ESTIMATE engine; the two
--   layers only meet at read time (estimate vs. actual booked total).
--
-- Budget model (two independent concepts, neither derived from the other):
--   couples.budget_total - portfolio-level "committed across all our trips".
--   trips.budget_total   - this trip's own affordability-ring target.
--
-- Idempotent where Postgres allows it; safe to run once.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Enum types
--    Native enums (requested). Adding a value later needs ALTER TYPE ADD VALUE,
--    the trade-off vs. a text+CHECK column.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_category') then
    create type booking_category as enum ('flight', 'hotel', 'transport', 'other');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('draft', 'booked_unpaid', 'booked_paid', 'settled');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Shared updated_at trigger function
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. Trip destination anchor + per-trip budget
--    destination_currency is resolved SERVER-SIDE at trip save/commit time
--    (static IATA/country -> ISO map; default USD; manual override allowed).
--    The client only ever reads this column - no client-side currency map.
-- -----------------------------------------------------------------------------
alter table trips
  add column if not exists destination_iata     text,
  add column if not exists destination_currency text,
  add column if not exists budget_total         numeric(14, 2),
  add column if not exists budget_currency      text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trips_destination_iata_fmt') then
    alter table trips add constraint trips_destination_iata_fmt
      check (destination_iata is null or destination_iata ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trips_destination_currency_iso3') then
    alter table trips add constraint trips_destination_currency_iso3
      check (destination_currency is null or destination_currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trips_budget_currency_iso3') then
    alter table trips add constraint trips_budget_currency_iso3
      check (budget_currency is null or budget_currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'trips_budget_total_nonneg') then
    alter table trips add constraint trips_budget_total_nonneg
      check (budget_total is null or budget_total >= 0);
  end if;
end
$$;

comment on column trips.destination_iata     is 'IATA of the committed destination; anchor source.';
comment on column trips.destination_currency is 'ISO-4217 display anchor for all bookings on this trip. Resolved server-side at save.';
comment on column trips.budget_total         is 'This trip''s own affordability target. Independent of couples.budget_total.';
comment on column trips.budget_currency      is 'ISO-4217 currency for trips.budget_total.';

-- -----------------------------------------------------------------------------
-- 4. Couple portfolio-level budget
--    Separate concept from trips.budget_total: a cross-trip "committed" number
--    for the home dashboard. Never summed/derived from trip budgets.
-- -----------------------------------------------------------------------------
alter table couples
  add column if not exists budget_total    numeric(14, 2),
  add column if not exists budget_currency text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'couples_budget_currency_iso3') then
    alter table couples add constraint couples_budget_currency_iso3
      check (budget_currency is null or budget_currency ~ '^[A-Z]{3}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'couples_budget_total_nonneg') then
    alter table couples add constraint couples_budget_total_nonneg
      check (budget_total is null or budget_total >= 0);
  end if;
end
$$;

comment on column couples.budget_total    is 'Portfolio-level budget committed across all the couple''s trips (home dashboard).';
comment on column couples.budget_currency is 'ISO-4217 currency for couples.budget_total.';

-- -----------------------------------------------------------------------------
-- 5. bookings table
-- -----------------------------------------------------------------------------
create table if not exists bookings (
  id              uuid              primary key default gen_random_uuid(),
  trip_id         uuid              not null
                                      references trips (id) on delete cascade,

  category        booking_category  not null,
  title           text              not null,
  vendor_name     text,             -- specific property/airline/operator (add-reservation form)
  nights          integer,          -- stay length for hotels; null for non-stay items
  status          booking_status    not null default 'draft',

  -- Booking ground truth (the receipt).
  price_amount    numeric(14, 2)    not null default 0,
  price_currency  text              not null,

  -- Who actually paid vs. whose cost it is. Separated so one partner can front
  -- a booking that economically belongs to the other (drives settlement).
  -- owner_id is the stored DECISION (a direct profile FK); the budget-based
  -- recommendation is computed live in the app and never written here.
  -- ON DELETE SET NULL: removing a profile must not delete trip history.
  payer_id        uuid              references profiles (id) on delete set null,
  owner_id        uuid              references profiles (id) on delete set null,

  -- FX captured at payment: price_currency -> trips.destination_currency.
  -- Both lock together or not at all.
  fx_rate_locked  numeric(18, 8),
  fx_locked_at    timestamptz,

  deadline_date   date,             -- cancellation / payment-due cutoff
  confirmation_code text,           -- airline/hotel PNR / reservation code
  receipt_url     text,

  created_at      timestamptz       not null default now(),
  updated_at      timestamptz       not null default now(),

  constraint bookings_title_not_blank      check (char_length(btrim(title)) > 0),
  constraint bookings_nights_nonneg        check (nights is null or nights >= 0),
  constraint bookings_price_amount_nonneg  check (price_amount >= 0),
  constraint bookings_currency_iso3        check (price_currency ~ '^[A-Z]{3}$'),
  constraint bookings_fx_lock_consistent   check (
    (fx_rate_locked is null) = (fx_locked_at is null)
  )
);

comment on table  bookings is 'One booking line item (flight/hotel/transport/other) belonging to a trip.';
comment on column bookings.payer_id       is 'Profile that paid. NULL until paid/assigned.';
comment on column bookings.owner_id       is 'Profile whose cost this is, independent of who paid. Stored decision; drives settlement.';
comment on column bookings.fx_rate_locked is 'Rate price_currency -> trips.destination_currency, locked at payment time.';
comment on column bookings.fx_locked_at   is 'When fx_rate_locked was captured. Locks together with fx_rate_locked.';
comment on column bookings.deadline_date  is 'Cancellation / payment-due cutoff for this item.';
comment on column bookings.confirmation_code is 'Airline/hotel reservation/confirmation code (PNR). Free text; null until booked.';
comment on column bookings.vendor_name    is 'Specific vendor (hotel/property/airline/operator). Null until set.';
comment on column bookings.nights         is 'Stay length in nights for lodging; null for non-stay items.';

-- -----------------------------------------------------------------------------
-- 6. Indexes (by trip, by who-paid / who-owes, by status board)
-- -----------------------------------------------------------------------------
create index if not exists bookings_trip_id_idx on bookings (trip_id);
create index if not exists bookings_payer_id_idx on bookings (payer_id);
create index if not exists bookings_owner_id_idx on bookings (owner_id);
create index if not exists bookings_status_idx   on bookings (trip_id, status);

-- -----------------------------------------------------------------------------
-- 7. updated_at trigger
-- -----------------------------------------------------------------------------
drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at
  before update on bookings
  for each row
  execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Row Level Security
--    A booking is visible/editable to the trip's owner (trips.user_id) or to
--    either partner of the couple the trip belongs to. Resolved against the
--    couples partner ids directly, so it survives profiles.couple_id drift.
-- -----------------------------------------------------------------------------
alter table bookings enable row level security;

drop policy if exists bookings_couple_access on bookings;
create policy bookings_couple_access
  on bookings
  for all
  to authenticated
  using (
    exists (
      select 1
      from trips t
      where t.id = bookings.trip_id
        and (
          t.user_id = auth.uid()
          or t.couple_id in (
            select c.id
            from couples c
            where c.partner1_id = auth.uid()
               or c.partner2_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from trips t
      where t.id = bookings.trip_id
        and (
          t.user_id = auth.uid()
          or t.couple_id in (
            select c.id
            from couples c
            where c.partner1_id = auth.uid()
               or c.partner2_id = auth.uid()
          )
        )
    )
  );

commit;
