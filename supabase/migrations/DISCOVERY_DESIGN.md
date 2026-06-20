# Discovery-first search — design notes

Design for Phase 2: a **pre-commit discovery step** that shows a couple three
destination cards built from cheap/cached data — a photo, a flight price *band*
for the route, and Numbeo-based cost-of-living (food / daily cost) — **before**
any live Duffel call or LLM cost breakdown runs. The expensive live path
(`/api/flight-prices` → Duffel, Call 2 breakdown, empathy mirror, trip save)
fires once, only for the destination the couple actually picks.

Companion to the `…_create_discovery_cache.sql` migration. This doc captures the
*why* so the reasoning survives the conversation it came from.

> **Product reframe (2026-06-20): discovery is a SECONDARY, lightweight feature.**
> The core of the app is the trip/booking management system (Phase 1 `bookings`
> + lifecycle). Discovery deliberately gets *minimal* complexity — hence the
> cost model is a single direct dollar figure (`daily_food_cost_usd`), not a
> relative index. The `bookings` system is the primary feature and is never
> touched by discovery work.

> **Numbeo quota is unconfirmed.** Every TTL, prewarm cadence, and "how
> aggressively we may call Numbeo" number below is a **PLACEHOLDER** pending
> confirmation that we have Numbeo API access and a known monthly quota. Search
> this doc for **`⚠ PLACEHOLDER`** before building the Numbeo path. Everything
> else (table shapes, keys, flow, budget tiers) is final.

---

## 1. Why two tables, not one

A discovery card has three pieces, and they differ in **scope** and in **how
fast they go stale**. Keying all three under one `(route, month, tier)` key
re-fetches per-city data once per origin pair *and* per budget tier — burning the
scarce paid Numbeo quota on data that is identical for a given city.

| Data | Scope | Natural TTL | Reusable across… |
|---|---|---|---|
| Photo (Unsplash) | destination city | weeks–month | every couple |
| Numbeo COL + food/daily cost | destination city | **7–30 days** ⚠ PLACEHOLDER | every couple |
| Flight price band | origin-pair → dest + month + budget tier | **24–48h** ⚠ PLACEHOLDER | same-route couples |

So the data splits along its scope seam:

- **`destination_facts`** — destination-scoped, slow-moving, shared across the
  *entire* user base. This is the Numbeo + photo cache. Highest hit rate, lowest
  quota burn.
- **`discovery_cache`** — route-scoped, volatile, the flight price band only.

A discovery card is **composed at read time** by joining the two on
`dest_iata`, exactly as the live path composes `flight_cache` + live FX today.
Neither table derives from the other.

This reuses the proven `flight_cache` *pattern* — `cache_key` / `data jsonb` /
`created_at`, with **TTL enforced in the query** (`.gt('created_at', now − TTL)`),
not stored in a column — but deliberately **does not extend `flight_cache`
itself**: that table is keyed by exact date with a 6h TTL and a route-scoped
payload, all three of which are wrong for destination-scoped, day-coarse,
slow-moving discovery data.

---

## 2. `destination_facts` — the destination-scoped cache (Numbeo + photo)

One row per destination city, keyed by IATA. Shared across all couples; this is
where the Numbeo spend is amortised.

Conceptual shape (columns finalised with the migration):

- `dest_iata` — `text`, the cache key (`^[A-Z]{3}$`). Same IATA vocabulary as
  `COL_INDEX` / `getCityIATA`.
- `photo_url` — `text`, from the existing `/api/photo` (Unsplash) path.
- `daily_food_cost_usd` — `numeric`, **a direct flat daily food spend estimate in
  USD** — the single cost number a discovery card shows. Replaced the relative
  `col_index` (NYC=100) in `20260620140000` so no baseline multiplication is
  needed: the reframe makes discovery's cost model one plain dollar figure.
  Nullable (a row may carry only a photo). Seeded from the static `COL_INDEX`
  era's bands; later overwritable by `user_generated` / `numbeo`.
- `source` — `cost_data_source` enum `('col_static','user_generated','numbeo')`,
  defined up front so the schema never changes when the data source does.
  `col_static` is **primary** today.
- `numbeo_city_id` — `integer`, future-only (set when `source = 'numbeo'`).
- `is_estimated` — `boolean`, **orthogonal to `source`**. `true` when
  `daily_food_cost_usd` is a fallback (country-level or the rough default), not a
  precise measured city value. Lets the UI hedge and lets a backfill target
  estimated rows. A `col_static` row can still be precise (`false`); a
  country-derived row is always `true`. (Added in `20260620130000`.)
- `created_at` / `updated_at` — `timestamptz`; TTL is queried against
  `updated_at` (bumped on every upsert).

**TTL: 7–30 days ⚠ PLACEHOLDER.** Numbeo is crowd-sourced and changes monthly at
most, so a long TTL is correct *and* protects quota — but the exact number waits
on real quota figures. The static `COL_INDEX` already in `server.js` becomes the
**cold-start / cache-miss fallback** so discovery never blocks on Numbeo.

**Month is intentionally absent.** Cost of living has no meaningful per-month
swing at discovery granularity; folding `month` into this key would triple-plus
the row count and the Numbeo calls for no product gain. Seasonality lives only
in the flight band (§3), where it actually matters.

---

## 3. `discovery_cache` — the route-scoped flight band

One row per `(origin-pair, destination, month, budget tier)`. This is the
24–48h-ish layer the original Phase 2 brief described.

- `cache_key` — `text` unique, composed as
  **`origin_pair_key :: dest_iata :: month :: budget_tier`**, where:
  - `origin_pair_key` = the two origin IATAs **sorted then joined** (e.g.
    `JFK|LHR`), so direction never splits the cache — mirrors the existing
    `destIataSorted` trick in `/api/flight-prices`.
  - `month` = `YYYY-MM` (not an exact date — discovery is "roughly when", the
    exact date is a commit-time concern).
  - `budget_tier` ∈ `budget | mid | upscale` (see §4).
- `data` — `jsonb`: `{ flight_band_low, flight_band_typical, currency }`. A
  *band*, not a quote — discovery promises "from ~$X", the live path promises the
  real number.
- `created_at` — `timestamptz`, TTL **24–48h ⚠ PLACEHOLDER** (flight prices move
  fast; this one is genuinely short-lived).

**Where the band comes from — never a live Duffel call.** `prewarmFlightCache()`
already populates `flight_cache` for `PREWARM_PAIRS × next-14-days`. Discovery
reads bands from that existing warm data (or a small nightly roll-up job folds
those exact-date prices into month/tier bands here). A route with **no** prewarm
coverage shows a coarse "from ~$X" estimate and only resolves to a real price at
commit — discovery stays strictly cache-only by construction.

---

## 4. Budget tiers — 3 tiers, cut from combined couple budget

`budget_tier` ∈ **`budget` / `mid` / `upscale`**, derived from the **combined**
couple budget (`p1.maxSpend + p2.maxSpend`), **not** per-partner.

**Why combined, not per-partner:** the tier exists to keep the `discovery_cache`
key space small and the hit rate high. Per-partner tiers would square the tier
dimension (3 × 3) and fragment the cache; combined collapses it to a single
3-way bucket two couples with similar total budgets share. Per-partner fairness
is already handled downstream by the empathy mirror / `harder_partner` logic on
the *live* path — discovery only needs a coarse "what class of trip" signal.

The two combined-budget cut points live in **code/config, not the schema** (same
discipline as the ownership-gap threshold in the bookings model) so they can be
tuned without a migration.

---

## 5. Cold start & fallbacks — discovery never blocks

Discovery must render even on a total cache miss. Resolution order per piece:

- **Flight band:** `discovery_cache` → warm `flight_cache` roll-up → coarse
  "from ~$X" estimate. Never a synchronous Duffel call.
- **Photo:** `destination_facts.photo_url` → live `/api/photo` (already cached
  30d in-process) → neutral placeholder.
- **Cost-of-living:** the three-rung **fallback ladder** below.

### The cost-of-living fallback ladder (resolution order, in code)

The static `COL_INDEX` covers only **68 cities**, and a miss today silently
defaults to a mid value on both server (`COL_INDEX[iata] || 65`) and client
(`getCOLIndex() || 65`) — actively *wrong* for cheap off-list picks like Bogë,
Albania, and indistinguishable from a city genuinely measured. The ladder makes
every rung honest via `is_estimated`, and the figure is now a **direct daily food
USD value**, not an index:

```
resolveDailyFood(dest_iata):
  1. destination_facts[dest_iata]              → use as stored (is_estimated as set;
                                                  precise col_static hit ⇒ false)
  2. miss → iata → iso_country (airports.csv)
            → country_cost_index[iso_country]  → daily_food_cost_usd = country $,
                                                  is_estimated = TRUE
  3. miss → daily_food_cost_usd = DEFAULT_USD  → is_estimated = TRUE  (last resort)
```

- **Rung 2 — `country_cost_index`** (`20260620130000`, simplified in
  `20260620140000`): ~150 rows, ISO-3166-1 **alpha-2** key (matches
  `airports.csv.iso_country`, the in-app IATA→country source), a direct
  `daily_food_cost_usd` interchangeable with
  `destination_facts.daily_food_cost_usd`, sourced from **World Bank PPP / a
  public country cost index — not Numbeo**. Schema shipped empty; data filled
  separately.
- **Rung 3 — `DEFAULT_USD`**, a single configurable last-resort daily-food dollar
  constant (replacing the old `65` index default), *still* flagged
  `is_estimated = true` so it can never masquerade as measured.
- When the resolver lands on rung 2 or 3 it may **cache** the result as a
  `destination_facts` row with `is_estimated = true`, so the next couple skips
  the ladder — but a backfill/Numbeo job can later overwrite any estimated row.

A miss optionally enqueues a **background** refill (band roll-up; Numbeo later)
so the *next* couple on that city/route gets a warm card — the current request
never waits on it.

---

## 6. Where discovery slots into the Quiz → Results flow

Today `Results.jsx::fetchRecommendations` runs **eagerly, pre-commit**: Call 1
(LLM archetypes) → live `/api/flight-prices` (Duffel fan-out over 3 dests) →
Call 2 (LLM breakdown + `computeTripCosts` + empathy). Two LLM calls and a live
Duffel fan-out before the couple has chosen anything.

**Call 1 stays in the pre-commit path** — it's the archetype brain
(Sanctuary / Odyssey / Horizon), already cache-keyed by p1/p2/dates, and is *not*
the expensive part. What moves behind the commit is the **live Duffel fan-out and
Call 2.**

```
Quiz submit
  └─ Call 1  (LLM archetypes — cached)                         ← KEEP, pre-commit
  └─ for each of 3 dests: read destination_facts ⨝ discovery_cache   ← NEW, cache-only
        → render 3 discovery cards (photo + COL/food + flight band)
        → NO live Duffel, NO Call 2
  ── couple picks / commits to one card ───────────────────────▶
  └─ EXISTING live path, for the ONE chosen destination:
        /api/flight-prices (live Duffel) + Call 2 breakdown + empathy mirror
        + trip save  ← where Phase 1 (bookings, trips.destination_currency) writes
```

Net: the pre-commit step drops from **2 LLM calls + 3 live Duffel routes** to
**1 LLM call + cache reads**. The expensive live work runs once, for the chosen
destination — and feeds straight into the Phase 1 trip/bookings save.

---

## 7. Decoupling — discovery estimate vs. the live engines

Discovery is a **third estimate surface**, and like `computeTripCosts()` vs. the
bookings ledger, it must stay decoupled from the live path:

| | Discovery cards | Live path (`computeTripCosts`) | Bookings ledger |
|---|---|---|---|
| When | pre-commit, every search | on commit / breakdown | post-decision |
| Flight figure | cached **band** (`from ~$X`) | live Duffel quote (USD) | locked receipt |
| Cost-of-living | direct `daily_food_cost_usd`, city-cached (fallback ladder) | Claude estimate (Call 2) | n/a |
| Freshness | hours (band) / weeks (food $) | per-search live | locked at payment |
| Purpose | cheap browsing | recommendation detail | money tracking |

Discovery reads its own caches and renders; it does **not** call the live engines
and they do **not** call it. The only meeting point is the hand-off when a couple
commits: the chosen `dest_iata` flows into the existing live path.

---

## Status

**Schema applied to the live DB and verified:**
- `20260620120000_create_discovery_cache.sql` — `destination_facts`,
  `discovery_cache`, `cost_data_source` enum, RLS, triggers.
- `20260620130000_add_country_col_fallback.sql` — `destination_facts.is_estimated`,
  `country_cost_index` (schema only, **rows not yet filled**).
- `20260620140000_simplify_cost_to_daily_food_usd.sql` — product reframe: both
  tables' relative `col_index` (+ redundant `food_per_day_usd` / `daily_cost_usd`)
  replaced by a single direct `daily_food_cost_usd`. **Did not touch the
  `bookings` core.**

The Numbeo path remains **on hold** pending confirmation of API access and
monthly quota — `col_static` ships as primary, so nothing here depends on it.

Still open:

1. **Fill `country_cost_index`** (~150 rows) from World Bank PPP / a public
   country cost index, alpha-3 → alpha-2 mapped.
2. **Confirm Numbeo access + quota**, then replace every `⚠ PLACEHOLDER` TTL /
   prewarm-cadence number with quota-driven values.
3. Settle the two combined-budget tier cut points (code/config).
4. Decide whether the band roll-up from `flight_cache` is a nightly job or a
   lazy on-read fold.
5. Implement `resolveDailyFood` (§5 ladder) and the discovery read path; wire it
   between Call 1 and the live commit path (§6). Set the `DEFAULT_USD`
   last-resort constant.

Tables, keys, budget-tier model, fallback ladder, and flow placement are
**final**; only the Numbeo-dependent numbers and the country data remain open.
