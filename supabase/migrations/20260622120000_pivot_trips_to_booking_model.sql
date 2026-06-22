-- =============================================================================
-- Migration: pivot trips from the quiz/recommendation model to the booking model
-- Purpose:   Roamie's pivot. trips stops being a recommendation snapshot (three
--            archetype cards + per-partner cost estimates from the old discovery
--            engine) and becomes a plain trip header that bookings hang off:
--            a named trip with a destination, a photo, dates, ONE shared budget,
--            and a couple.
--
-- Adds:
--   trips.trip_name            - user-given name for the trip.
--   trips.destination_photo_url - Unsplash photo for the destination (the photo
--                                 fetch path stays; only its storage moves here).
--
-- Drops (all old quiz/recommendation-engine output, now removed in code):
--   per-partner estimate columns p1_*/p2_* (city/currency/budget/cost) - the
--     ledger now tracks real per-booking amounts (bookings.price_*, payer/owner),
--     so the estimate snapshot has no consumer.
--   committed / committed_at   - the "this is the trip we're doing" flag from the
--     multi-card recommendation flow; a trip is now committed by existing.
--   vibes / routing / accommodation / region / tagline / stretch_goal - quiz
--     inputs and LLM-generated copy.
--   destinations (jsonb)       - the three archetype cards; core of the old model.
--
-- KEEPS: destination_name, country_emoji, dates_from/dates_to, budget_total/
--   budget_currency, destination_currency/destination_iata (booking FX anchor),
--   user_id, couple_id, created_at.
--
-- NOTE: dropping p1_budget/p2_budget also removes the input to the bookings
-- ownership *suggestion* described in the bookings design notes; owner_id remains
-- a direct, explicitly-set FK, so the stored financial decision is unaffected.
--
-- Idempotent (IF EXISTS / IF NOT EXISTS); safe to run once.
-- =============================================================================

begin;

-- 1. New columns for the booking-model trip header.
alter table trips
  add column if not exists trip_name             text,
  add column if not exists destination_photo_url text;

comment on column trips.trip_name             is 'User-given name for the trip.';
comment on column trips.destination_photo_url is 'Unsplash photo URL for the destination (fetched via /api/photo).';

-- 2. Drop the old recommendation/quiz columns.
alter table trips
  drop column if exists p1_city,
  drop column if exists p2_city,
  drop column if exists p1_currency,
  drop column if exists p2_currency,
  drop column if exists p1_budget,
  drop column if exists p2_budget,
  drop column if exists p1_cost,
  drop column if exists p2_cost,
  drop column if exists committed,
  drop column if exists committed_at,
  drop column if exists vibes,
  drop column if exists routing,
  drop column if exists accommodation,
  drop column if exists region,
  drop column if exists tagline,
  drop column if exists destinations,
  drop column if exists stretch_goal;

commit;
