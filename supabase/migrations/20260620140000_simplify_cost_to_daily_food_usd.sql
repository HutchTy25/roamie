-- =============================================================================
-- Migration: simplify discovery cost-of-living to a direct daily $ figure
-- Purpose:   Product reframe — discovery/search is now a SECONDARY, lightweight
--            feature; the trip/booking management system (bookings) is the core.
--            So discovery's cost model collapses from a relative index (NYC=100,
--            needing a second baseline multiplication to become real money) to a
--            single, direct dollar figure: daily_food_cost_usd.
--
-- Replaces, on BOTH discovery cost tables:
--   destination_facts : col_index (+ the redundant food_per_day_usd and the
--                       broader daily_cost_usd)  ->  daily_food_cost_usd
--   country_cost_index: col_index                ->  daily_food_cost_usd
--
-- NOTE on the consolidation: the new daily_food_cost_usd is the same concept the
-- pre-existing nullable food_per_day_usd held, so keeping both would re-introduce
-- the complexity this reframe removes. daily_cost_usd (an all-in daily figure,
-- never populated) is likewise dropped — the reframe reduces discovery COL to ONE
-- flat number. Both tables are empty, so this is a zero-data-loss rewrite.
--
-- is_estimated and the city -> country -> default fallback ladder are UNCHANGED;
-- only the underlying number's meaning changes (direct USD, not an index).
--
-- Does NOT touch bookings / trips / couples — the primary system is untouched.
-- Additive-first (add new column before dropping old); idempotent.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. destination_facts: add the direct figure, then drop the index + redundants.
--    daily_food_cost_usd stays NULLABLE (a row may carry only a photo, or be
--    created before the figure is known — same nullability col_index had here).
-- -----------------------------------------------------------------------------
alter table destination_facts
  add column if not exists daily_food_cost_usd numeric(10, 2);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'destination_facts_daily_food_nonneg') then
    alter table destination_facts add constraint destination_facts_daily_food_nonneg
      check (daily_food_cost_usd is null or daily_food_cost_usd >= 0);
  end if;
end
$$;

comment on column destination_facts.daily_food_cost_usd is
  'Direct flat daily food spend estimate in USD for this destination. Replaces the relative col_index; no baseline multiplication needed.';

-- Drop old constraints (column-tied checks would drop with the columns anyway;
-- explicit + IF EXISTS keeps this re-runnable).
alter table destination_facts drop constraint if exists destination_facts_col_nonneg;
alter table destination_facts drop constraint if exists destination_facts_food_nonneg;
alter table destination_facts drop constraint if exists destination_facts_daily_nonneg;

alter table destination_facts
  drop column if exists col_index,
  drop column if exists food_per_day_usd,
  drop column if exists daily_cost_usd;

-- -----------------------------------------------------------------------------
-- 2. country_cost_index: same swap at country granularity.
--    NOT NULL here (a country fallback row with no figure is useless); the table
--    is empty so the NOT NULL add is safe without a default.
-- -----------------------------------------------------------------------------
alter table country_cost_index
  add column if not exists daily_food_cost_usd numeric(10, 2) not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'country_cost_index_daily_food_nonneg') then
    alter table country_cost_index add constraint country_cost_index_daily_food_nonneg
      check (daily_food_cost_usd >= 0);
  end if;
end
$$;

comment on column country_cost_index.daily_food_cost_usd is
  'Direct flat daily food spend estimate in USD at country granularity (NYC has no special role). Interchangeable with destination_facts.daily_food_cost_usd. Middle rung of the fallback ladder.';

alter table country_cost_index drop constraint if exists country_cost_index_col_nonneg;
alter table country_cost_index drop column if exists col_index;

-- Refresh the table comment (the index-era wording no longer applies).
comment on table country_cost_index is
  'IATA-country -> country-level direct daily food cost (USD). Middle rung of the COL fallback ladder. Sourced from World Bank PPP / a public country cost index, not Numbeo.';

commit;
