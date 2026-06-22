-- =============================================================================
-- Migration: drop the discovery schema (forward removal)
-- Purpose:   The pivot removes the discovery-first search feature entirely (cards,
--            COL fallback ladder, flight-band cache). This forward migration drops
--            the schema those features created. The original create migrations
--            (20260620120000 / 130000 / 140000) are kept in history; rollback is
--            re-applying them (see the .down.sql).
--
-- Drops, in dependency order:
--   discovery_cache    - route-scoped flight price bands.
--   destination_facts  - destination cost-of-living + photo cache.
--   country_cost_index - country-level cost fallback rung.
--   cost_data_source   - enum used only by destination_facts.source.
--
-- Does NOT touch bookings / trips / couples. The shared set_updated_at() function
-- is left in place (bookings still uses it).
--
-- Idempotent (IF EXISTS); safe to run once.
-- =============================================================================

begin;

-- Tables first (DROP TABLE cascades each table's own indexes, triggers, RLS).
drop table if exists discovery_cache;
drop table if exists destination_facts;
drop table if exists country_cost_index;

-- Enum, now that its only consumer (destination_facts.source) is gone.
drop type if exists cost_data_source;

commit;
