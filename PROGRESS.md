# Roamie Progress Log

## Current Live State
roamie-nu.vercel.app — fully working

### Core Features Live ✅
- Landing page with live trip counter
- Google Sign In + Magic Link auth (Supabase)
- Three mode quiz — Visit Partner, Meet Somewhere, Explore Together
- Quiz mode gating — Visit + Meet locked behind sign in
- AI recommendations (two-call Claude architecture)
- Real flight prices via FlightAPI.io (11,602 airport IATA database)
- Real exchange rates via ExchangeRate-API
- Per-partner cost breakdown in their own currency
- Reality strip — crowd, weather, fairness, budget stretch
- Paid breakdown + Trip Basics (now baked into Call 2, no third API call)
- Stripe payments ($3.99 one-time)
- Partner Sync — invite system, connected state, disconnect
- Dashboard with countdown, bottom nav, saved trips
- Dashboard wired to real profile data (home city, IATA, relationship days, moon %)
- Onboarding flow — display name, home city + IATA lookup, anniversary date
- Profile photo upload via Supabase Storage
- Save trips to Supabase manually
- Usage gate — 3 free searches then email capture
- Email notifications via Resend
- Session cache (30 min TTL)
- Secret header protection
- Rate limiting
- PostHog analytics

### Auth & Database
- Supabase tables: profiles, trips, couples
- Row Level Security on all tables
- Auto profile creation trigger
- Supabase Storage bucket: avatars
- Google OAuth + Magic Link
- New profile columns: home_city, home_iata, relationship_start_date, total_miles, display_name

### Environment Variables
**Vercel (frontend):**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_STRIPE_PRICE_ONETIME
- VITE_STRIPE_PUBLISHABLE_KEY
- VITE_UNSPLASH_KEY
- VITE_ROAMIE_SECRET

**Render (backend):**
- ANTHROPIC_API_KEY
- PERPLEXITY_API_KEY
- RESEND_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_PRICE_ONETIME
- STRIPE_PRICE_MONTHLY
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- ROAMIE_SECRET
- EXCHANGERATE_API_KEY
- FLIGHTAPI_KEY

---

## Flight Engine Architecture ✅ COMPLETE

### How it works
1. User submits quiz with mode (Visit/Meet/Explore) and cities
2. **Call 1 + Flight API run in parallel** — Claude picks 3 destinations while flight API warms up
3. Real prices extracted using retry polling (up to 3 attempts, 2s delay)
4. **Call 2** — Claude gets real prices injected, returns full breakdown + trip basics
5. User sees accurate costs, trip basics instant on expand

### Three modes
**Visit Partner:**
- Locked behind sign in
- FlightAPI searches P1→P2 and P2→P1 independently
- Shows VisitResults.jsx — clean two-card flight price display

**Meet Somewhere:**
- Locked behind sign in
- Claude picks destinations
- FlightAPI searches both partners independently to destination
- fetchWithRetry polling handles async API responses

**Explore Together:**
- Free to use
- Claude picks destinations AND determines optimal hub
- FlightAPI searches based on fly_together routing logic
- P1 total = leg1 (P1→P2) + leg2 (P2→destination)
- P2 total = P2→destination only

### Key functions
- `getCityIATA()` — fuzzy city name to IATA lookup (11,602 airports)
- `extractLowestPrice()` — parses FlightAPI response structure
- `fetchWithRetry()` — polls FlightAPI up to 3x with 2s delay
- `/api/flight-prices` — dedicated endpoint for all flight searches
- `/api/iata-lookup` — exposes getCityIATA for frontend onboarding

---

## May 1, 2026

### What we built
- Onboarding flow (4 steps: welcome, name, home city, anniversary) ✅
- App.jsx profile fetch + onboarding redirect logic ✅
- Supabase migration — 5 new profile columns ✅
- Dashboard wired to real data — cities, IATA, relationship days, moon %, miles ✅
- display_name fixes magic link "You" bug ✅
- Quiz mode locking — Visit + Meet require sign in ✅
- Results speed improvement — Call 1 + flight API now parallel ✅
- Trip basics folded into Call 2 — no third API call ✅
- /api/iata-lookup endpoint added to server.js ✅

### Known bugs to fix tomorrow
- MEM→MAN (and similar indirect routes) returns no flights — FlightAPI struggles with connections
- Onboarding restart — race condition between profile save and App.jsx fetch
- No airport found — frontend IATA lookup depends on Render being warm, needs bundled city list
- Back button missing from quiz mode select screen
- Post-login flow needs cleaner redirect to dashboard

### Orbit Feature — Architecture Locked
- Two rings: inner (confirmed, 140px, clockwise 35s) + outer (ideas, 240px, counter-clockwise 50s)
- Sun states: dormant (no confirmed trip) → active (trip confirmed, glows)
- Planets counter-spin to stay upright
- Tap → card slides up with name/note/who added
- Hold → confirm, moves to inner ring
- Swipe back → returns to outer ring
- Realtime sync via Supabase realtime (built in from day one)
- DB table: orbit_items (id, couple_id, trip_destination, name, note, added_by, confirmed, color, created_at)

### Tomorrow build order
1. Fix MEM→MAN indirect flight routing
2. Fix onboarding race condition
3. Bundle top cities IATA frontend
4. Back button + post login flow polish
5. Supabase migration — orbit_items table + RLS
6. Orbit sun component (dormant/active states, layered glow)
7. Two ring orbit with counter-spinning planets
8. Tap interaction + bottom sheet card
9. Add bubble form
10. Wire to Supabase with realtime subscription

### Pricing strategy (locked)
- Free: Explore Together only, 3 searches then email gate
- Sign in (free): saved trips, dashboard, onboarding profile
- $9.99/month per couple: Visit Partner, Meet Somewhere, Partner Sync, unlimited searches
- $79.99/year per couple: annual discount
- First 25 couples: $5.99/month locked forever

### Notes
- New job started Monday April 28 — build time limited to evenings + weekends
- Target: mid-late May soft launch
- Marketing: LDR TikTok creators, authentic organic content
- Beta bypass: roamie-nu.vercel.app?beta=true
- Design inspiration: Moonly + Klima apps
- Logo: lowercase 'r' in Playfair + orange heart (girl's design)
- Orbit is the viral feature — visual, intimate, no competitor has it
- Long term: LDR wedge → same-city couples naturally discover it