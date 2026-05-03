# Roamie Progress Log

## Current Live State
roamie-nu.vercel.app — fully working

### Core Features Live ✅
- Landing page with live trip counter
- Google Sign In + Magic Link auth (Supabase)
- Three mode quiz — Visit Partner, Meet Somewhere, Explore Together
- Quiz mode gating — Visit + Meet locked behind sign in
- AI recommendations (two-call Claude architecture)
- Real flight prices via Duffel API (live mode, handles connecting flights)
- Real exchange rates via ExchangeRate-API
- Per-partner cost breakdown in their own currency
- Reality strip — crowd, weather, fairness, budget stretch
- Paid breakdown + Trip Basics (baked into Call 2, no third API call)
- Stripe payments ($3.99 one-time)
- Partner Sync — invite system, connected state, disconnect
- Dashboard with countdown, bottom nav, saved trips
- Dashboard wired to real profile data (home city, IATA, relationship days, moon %)
- Onboarding flow — display name, home city + IATA autocomplete + geolocation, anniversary date
- Nearest airport detection — OurAirports CSV, Haversine formula, large airport snap logic
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
- Profile columns: home_city, home_iata, relationship_start_date, total_miles, display_name

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
- DUFFEL_API_KEY

---

## Flight Engine Architecture ✅ COMPLETE

### How it works
1. User submits quiz with mode (Visit/Meet/Explore) and cities
2. **Call 1 + Flight API warm-up run in parallel** — Claude picks 3 destinations
3. **Duffel API** searches real flights including connecting routes
4. Sequential destination loop with 1s delay to avoid rate limiting
5. **Call 2** — Claude gets real prices injected, returns full breakdown + trip basics
6. User sees accurate costs, trip basics instant on expand

### Three modes
**Visit Partner:**
- Locked behind sign in
- Duffel searches P1→P2 and P2→P1 independently

**Meet Somewhere:**
- Locked behind sign in
- Duffel searches both partners independently to destination

**Explore Together:**
- Free to use
- Claude picks destinations AND determines optimal hub
- P1 total = leg1 (P1→P2) + leg2 (P2→destination)
- P2 total = P2→destination only

### Key functions
- `getCityIATA()` — overrides first, then OurAirports DB lookup (4,792 entries)
- `searchDuffelFlights()` — live Duffel API with 429 retry logic
- `/api/flight-prices` — sequential destination loop, parallel internal calls
- `/api/iata-lookup` — autocomplete with multi-match for onboarding
- `/api/nearest-airport` — Haversine + large airport snap within 100km

---

## May 2, 2026

### What we built
- Switched FlightAPI → Duffel API (live mode, real connecting flights) ✅
- OurAirports CSV replacing airports.dat (type filtering, scheduled service) ✅
- Nearest airport endpoint with Haversine + snap logic ✅
- Onboarding city autocomplete with dropdown suggestions ✅
- Detect my location button with geolocation ✅
- getCityIATA overrides moved to top — MAN/MEM/KEF etc correct ✅
- Onboarding race condition fixed — onComplete callback from App.jsx ✅
- Dashboard Memphis hardcode fixed ✅
- Exchange rate non-JSON error handling ✅
- 429 rate limit retry logic in searchDuffelFlights ✅
- Sequential destination loop with 1s delay ✅
- fly_together deduped — p2ToDestPrice = bothToDestPrice (6 calls not 9) ✅

### Known issues to fix next session
- Valencia/Lisbon still hitting 429s — need longer delay or further call reduction
- fly_together internal calls still parallel — make sequential to reduce burst
- Back button missing from quiz mode select screen
- Post-login flow needs cleaner redirect to dashboard
- Year bars in Love in Miles card still hardcoded

### Orbit Feature — Architecture Locked
- Two rings: inner (confirmed, 140px, clockwise 35s) + outer (ideas, 240px, counter-clockwise 50s)
- Sun states: dormant (no confirmed trip) → active (trip confirmed, glows)
- Planets counter-spin to stay upright
- Tap → card slides up with name/note/who added
- Hold → confirm, moves to inner ring
- Swipe back → returns to outer ring
- Realtime sync via Supabase realtime (built in from day one)
- DB table: orbit_items (id, couple_id, trip_destination, name, note, added_by, confirmed, color, created_at)

### Next session order
1. Fix 429s — sequential internal calls + longer delay
2. Back button on quiz mode select
3. Post-login redirect polish
4. Year bars real data
5. Orbit — Supabase migration then build
6. Dashboard opposite User Test

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
- Gemini helping with SQL learning and architecture analysis