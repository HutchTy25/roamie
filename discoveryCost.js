// discoveryCost.js
// Isolated, independently-testable cost helpers for the discovery flow.
// No Express, no live Duffel — pure data resolution so it can be unit-tested by
// injecting a fake supabase client and a fake iata->country resolver.

import { readFileSync } from 'fs'
import { resolve } from 'path'

// --- Tunable constants (PLACEHOLDERS — see DISCOVERY_DESIGN.md) -------------
// Absolute last-resort daily food spend when neither the city nor its country
// has data. Flagged is_estimated=true wherever it is used.
export const DEFAULT_DAILY_FOOD_USD = 40

// Combined-couple-budget (USD) cut points for the 3 discovery tiers. The tier
// only buckets the flight-band cache key; precise fairness is the live path's
// job. Cut points live here (config), not in the schema, so they tune freely.
export const BUDGET_TIER_CUTS_USD = { budget: 4000, mid: 10000 } // < budget | < mid | else upscale

export function classifyBudgetTier(combinedBudgetUsd) {
  const n = Number(combinedBudgetUsd) || 0
  if (n < BUDGET_TIER_CUTS_USD.budget) return 'budget'
  if (n < BUDGET_TIER_CUTS_USD.mid) return 'mid'
  return 'upscale'
}

// --- iata -> iso_country index (lazy, cached) ------------------------------
// Built from airports.csv (col 8 = iso_country, col 13 = iata_code). Parsed the
// same naive way as server.js loadAirportDB; rows whose columns are shifted by a
// comma inside a quoted name simply fail the strict iata/country validation and
// are dropped (never mis-assigned).
let iataCountryDB = null

export function loadIataCountryDB(csvPath = './airports.csv') {
  if (iataCountryDB) return iataCountryDB
  iataCountryDB = {}
  try {
    const data = readFileSync(resolve(csvPath), 'utf8')
    const lines = data.split('\n').slice(1) // skip header
    for (const line of lines) {
      const parts = line.split(',').map(p => p.replace(/"/g, '').trim())
      if (parts.length < 14) continue
      const isoCountry = parts[8]
      const iata = parts[13]
      if (!/^[A-Z]{3}$/.test(iata)) continue
      if (!/^[A-Z]{2}$/.test(isoCountry)) continue
      if (!(iata in iataCountryDB)) iataCountryDB[iata] = isoCountry
    }
  } catch (e) {
    console.error('[discoveryCost] iata->country load error:', e.message)
  }
  return iataCountryDB
}

// Default resolver used in production; tests can pass their own.
export function defaultIataToCountry(iata) {
  return loadIataCountryDB()[iata] || null
}

// --- The fallback ladder ----------------------------------------------------
// resolveDailyFood(iata, deps) -> { dailyFoodUsd, isEstimated, source }
//   1. destination_facts[iata]                       -> as stored
//   2. miss -> country_cost_index[iata->iso_country] -> is_estimated = true
//   3. miss -> DEFAULT_DAILY_FOOD_USD                -> is_estimated = true
//
// deps: { supabase, iataToCountry } — both injectable for tests.
export async function resolveDailyFood(iata, { supabase, iataToCountry = defaultIataToCountry } = {}) {
  // Rung 1: precise city fact.
  const { data: fact } = await supabase
    .from('destination_facts')
    .select('daily_food_cost_usd, is_estimated')
    .eq('dest_iata', iata)
    .maybeSingle()

  if (fact && fact.daily_food_cost_usd != null) {
    return {
      dailyFoodUsd: Number(fact.daily_food_cost_usd),
      isEstimated: !!fact.is_estimated,
      source: 'city',
    }
  }

  // Rung 2: country-level fallback.
  const country = iataToCountry(iata)
  if (country) {
    const { data: c } = await supabase
      .from('country_cost_index')
      .select('daily_food_cost_usd')
      .eq('country_code', country)
      .maybeSingle()
    if (c && c.daily_food_cost_usd != null) {
      return { dailyFoodUsd: Number(c.daily_food_cost_usd), isEstimated: true, source: 'country' }
    }
  }

  // Rung 3: last-resort default.
  return { dailyFoodUsd: DEFAULT_DAILY_FOOD_USD, isEstimated: true, source: 'default' }
}
