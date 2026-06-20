-- =============================================================================
-- Migration: discovery-first search caches (Phase 2)
-- Purpose:   Back the pre-commit discovery step with cheap/cached data so three
--            destination cards render with NO live Duffel call and NO LLM cost
--            breakdown. Two tables, split by data scope (see DISCOVERY_DESIGN.md):
--
--   * destination_facts - destination-scoped, shared across ALL couples.
--                         Cost-of-living (food / daily cost) + photo per city.
--                         PRIMARY cost-of-living source is the static COL_INDEX
--                         already shipped in server.js (source = 'col_static').
--                         NOT dependent on Numbeo access being granted.
--   * discovery_cache   - route-scoped flight price BAND keyed by
--                         origin-pair + month + budget tier. The 24-48h layer.
--
-- TTL is enforced in the read query (.gt('updated_at', now - TTL)), not stored,
-- mirroring the existing flight_cache pattern. updated_at (bumped by trigger on
-- every upsert-update, defaulted on insert) is the "last written" stamp, so it
-- is the correct column to TTL against even when rows are re-upserted.
--
-- NOTE: every concrete TTL value lives in application/config code, not here, and
-- the Numbeo-dependent ones remain PLACEHOLDERS pending confirmed API quota.
-- This migration is Numbeo-independent: it ships with col_static as primary.
--
-- Idempotent where Postgres allows it; safe to run once.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. Cost-of-living data provenance.
--    'col_static'     - the hardcoded COL_INDEX snapshot in server.js. PRIMARY
--                       source today; ships now, no external dependency.
--    'user_generated' - aggregated from our own bookings ledger over time
--                       (future: real prices our couples actually paid).
--    'numbeo'         - Numbeo API (FUTURE, only if/when licensed).
--    Enum (not text+CHECK) so the allowed set is explicit; adding a value later
--    is ALTER TYPE ADD VALUE. These three are deliberately defined UP FRONT so
--    the schema never has to change when the data source changes.
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cost_data_source') then
    create type cost_data_source as enum ('col_static', 'user_generated', 'numbeo');
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Shared updated_at trigger function (same one bookings uses; CREATE OR
--    REPLACE so this migration stands alone if applied independently).
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
-- 3. destination_facts - destination-scoped, shared across all couples.
--    Keyed by IATA (same vocabulary as COL_INDEX / getCityIATA). One row per
--    destination city; this is where any future Numbeo spend is amortised.
--
--    col_index is the live-replaceable cost-of-living index (NYC = 100). Under
--    'col_static' typically ONLY col_index is populated; food_per_day_usd /
--    daily_cost_usd stay NULL and are derived downstream from the COL band
--    exactly as today, until 'user_generated'/'numbeo' fills real figures.
-- -----------------------------------------------------------------------------
create table if not exists destination_facts (
  dest_iata         text              primary key,

  -- Cost-of-living. col_index is the workhorse; the two *_usd columns are
  -- nullable because the primary 'col_static' source does not provide them.
  col_index         numeric(6, 2),
  food_per_day_usd  numeric(10, 2),
  daily_cost_usd    numeric(10, 2),

  source            cost_data_source  not null default 'col_static',

  -- Numbeo city resolution, cached so we never re-pay the lookup. NULL unless
  -- source = 'numbeo'.
  numbeo_city_id    integer,

  -- Photo (Unsplash via /api/photo). Destination-scoped, reusable by everyone.
  photo_url         text,

  created_at        timestamptz       not null default now(),
  updated_at        timestamptz       not null default now(),

  constraint destination_facts_iata_fmt      check (dest_iata ~ '^[A-Z]{3}$'),
  constraint destination_facts_col_nonneg    check (col_index is null or col_index >= 0),
  constraint destination_facts_food_nonneg   check (food_per_day_usd is null or food_per_day_usd >= 0),
  constraint destination_facts_daily_nonneg  check (daily_cost_usd is null or daily_cost_usd >= 0),
  -- numbeo_city_id only meaningful for the numbeo source.
  constraint destination_facts_numbeo_id_src check (
    numbeo_city_id is null or source = 'numbeo'
  )
);

comment on table  destination_facts is 'Destination-scoped, all-couple-shared cost-of-living + photo cache for discovery cards. PRIMARY cost source is static COL_INDEX (source=col_static).';
comment on column destination_facts.col_index        is 'Cost-of-living index, NYC = 100. Live-replaceable mirror of server.js COL_INDEX.';
comment on column destination_facts.food_per_day_usd is 'USD/day food. NULL under col_static (derived downstream from col_index band).';
comment on column destination_facts.daily_cost_usd   is 'USD/day all-in daily cost. NULL under col_static.';
comment on column destination_facts.source           is 'Provenance: col_static (primary now) | user_generated (from bookings) | numbeo (future).';
comment on column destination_facts.numbeo_city_id   is 'Cached Numbeo city id; only set when source = numbeo.';

create index if not exists destination_facts_source_idx     on destination_facts (source);
create index if not exists destination_facts_updated_at_idx on destination_facts (updated_at);

drop trigger if exists destination_facts_set_updated_at on destination_facts;
create trigger destination_facts_set_updated_at
  before update on destination_facts
  for each row
  execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. discovery_cache - route-scoped flight price BAND.
--    cache_key = origin_pair_key :: dest_iata :: month :: budget_tier, composed
--    in app (origin_pair_key = two origin IATAs sorted+joined; month = YYYY-MM;
--    budget_tier in {budget, mid, upscale} from COMBINED couple budget).
--    data = { flight_band_low, flight_band_typical, currency }. A band, never a
--    quote. Mirrors flight_cache's freeform-jsonb shape; TTL ~24-48h (in app).
-- -----------------------------------------------------------------------------
create table if not exists discovery_cache (
  cache_key   text          primary key,
  data        jsonb         not null,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

comment on table  discovery_cache is 'Route-scoped flight price BANDS for discovery cards. Key: origin_pair::dest::month::budget_tier. Short TTL (~24-48h), enforced in query against updated_at.';
comment on column discovery_cache.data is 'jsonb { flight_band_low, flight_band_typical, currency }. A band, not a live quote.';

create index if not exists discovery_cache_updated_at_idx on discovery_cache (updated_at);

drop trigger if exists discovery_cache_set_updated_at on discovery_cache;
create trigger discovery_cache_set_updated_at
  before update on discovery_cache
  for each row
  execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Row Level Security.
--    destination_facts is non-sensitive reference data (city averages + a photo
--    URL) and discovery cards may render for logged-out previews, so it is
--    PUBLIC-READ (anon + authenticated). Writes are server-side only: the
--    service-role key bypasses RLS, so no write policy is granted to clients.
--
--    discovery_cache (route flight bands) is left SERVER-ONLY: RLS enabled with
--    NO policy, so only the service role can read/write it. The live path
--    already composes route data server-side; if a client ever needs to read
--    bands directly, add a SELECT policy then (no table change required).
-- -----------------------------------------------------------------------------
alter table destination_facts enable row level security;

drop policy if exists destination_facts_public_read on destination_facts;
create policy destination_facts_public_read
  on destination_facts
  for select
  to anon, authenticated
  using (true);

alter table discovery_cache enable row level security;

commit;
