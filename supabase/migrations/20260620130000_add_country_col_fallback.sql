-- =============================================================================
-- Migration: cost-of-living fallback ladder
-- Purpose:   Make the cost-of-living estimate honest when a destination is not
--            in the static COL_INDEX (the common case for off-the-beaten-path
--            discovery picks, e.g. Bogë, Albania). Two additive changes:
--
--   1. destination_facts.is_estimated - boolean, orthogonal to `source`. Marks a
--      row whose col_index is NOT a precise measured city value but a fallback
--      (country-level, or the absolute-last-resort 65 default). A col_static row
--      can still be a precise hit (is_estimated = false); a country-derived row
--      is always is_estimated = true. Keeping this separate from `source` lets
--      the UI hedge ("rough estimate") and lets a backfill job target estimated
--      rows without conflating provenance with precision.
--
--   2. country_cost_index - ~150-row IATA-country -> country-level COL index
--      table, the middle rung of the fallback ladder. Keyed by ISO-3166-1
--      alpha-2 (matches airports.csv `iso_country`, the in-app IATA->country
--      source). Data sourced from World Bank PPP / a public country cost index
--      (NOT Numbeo). Schema only here; rows are filled separately.
--
-- Resolution order (implemented in code, see DISCOVERY_DESIGN.md section 5/8):
--   destination_facts[iata]                         -> use as stored
--     miss -> country_cost_index[ iata->iso_country ] -> is_estimated = true
--       miss -> col_index = 65 (NYC=100 mid default)   -> is_estimated = true
--
-- Idempotent; safe to run once.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. is_estimated on destination_facts.
--    Default false: a normally-written measured row is precise. The resolver
--    sets it true only when synthesising a country/default fallback row.
-- -----------------------------------------------------------------------------
alter table destination_facts
  add column if not exists is_estimated boolean not null default false;

comment on column destination_facts.is_estimated is
  'true when col_index is a fallback (country-level or 65 default), not a precise measured city value. Orthogonal to source.';

-- -----------------------------------------------------------------------------
-- 2. country_cost_index - middle rung of the fallback ladder.
--    country_code is ISO-3166-1 alpha-2 to match airports.csv iso_country, the
--    source the in-app IATA->country resolution reads. (World Bank PPP ships
--    alpha-3; map to alpha-2 when filling.) col_index uses the same NYC=100
--    convention as destination_facts.col_index so the two are interchangeable.
--    data_as_of records the vintage of the underlying index for "as of" honesty
--    (a static snapshot has no other freshness signal).
-- -----------------------------------------------------------------------------
create table if not exists country_cost_index (
  country_code  text          primary key,
  col_index     numeric(6, 2) not null,
  source        text          not null default 'worldbank_ppp',
  data_as_of    date,
  created_at    timestamptz   not null default now(),
  updated_at    timestamptz   not null default now(),

  constraint country_cost_index_code_fmt    check (country_code ~ '^[A-Z]{2}$'),
  constraint country_cost_index_col_nonneg  check (col_index >= 0)
);

comment on table  country_cost_index is 'IATA-country -> country-level cost-of-living index (NYC=100). Middle rung of the COL fallback ladder. Sourced from World Bank PPP / public country cost index, not Numbeo.';
comment on column country_cost_index.country_code is 'ISO-3166-1 alpha-2, matches airports.csv iso_country.';
comment on column country_cost_index.col_index   is 'Country-level cost-of-living index, NYC = 100. Interchangeable with destination_facts.col_index.';
comment on column country_cost_index.data_as_of  is 'Vintage of the underlying index value (static snapshots have no other freshness signal).';

create index if not exists country_cost_index_updated_at_idx on country_cost_index (updated_at);

-- Reuse the shared updated_at trigger (created by earlier migrations).
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists country_cost_index_set_updated_at on country_cost_index;
create trigger country_cost_index_set_updated_at
  before update on country_cost_index
  for each row
  execute function set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. RLS - same posture as destination_facts: public-read reference data,
--    writes server-side / manual only (service role bypasses RLS).
-- -----------------------------------------------------------------------------
alter table country_cost_index enable row level security;

drop policy if exists country_cost_index_public_read on country_cost_index;
create policy country_cost_index_public_read
  on country_cost_index
  for select
  to anon, authenticated
  using (true);

commit;
