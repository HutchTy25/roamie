# Roamie Progress Log

## Current Live State
roamie-nu.vercel.app — fully working

### Core Features Live ✅
- Landing page with live trip counter
- Google Sign In + Magic Link auth (Supabase)
- Three mode quiz — Visit Partner, Meet Somewhere, Explore Together
- All three modes unlocked for all users (data collection phase, no paywall)
- AI recommendations (two-call Claude architecture)
- Real flight prices via Duffel API (live mode, handles connecting flights)
- Real exchange rates via ExchangeRate-API (6hr cache, rate limit protected)
- Per-partner cost breakdown in their own currency
- Reality strip — crowd, weather, fairness, budget strip
- Paid breakdown + Trip Basics (baked into Call 2, no third API call)
- P1 Flights combined (leg 1 + leg 2) in cost breakdown UI
- Stripe payments ($3.99 one-time)
- Partner Sync — invite system, connected state, disconnect
- Dashboard with bottom nav, saved trips
- Dashboard wired to real profile data (home city, IATA, relationship days, moon %)
- Rocket animation on Moon Odyssey — no dotted line, faces moon, glow effect
- Love in Miles card cleaned up — year bars removed, Since year only
- Onboarding flow — display name, home city + IATA autocomplete + geolocation, anniversary date
- Nearest airport detection — OurAirports CSV, Haversine formula, large airport snap logic
- Post-login redirect → dashboard (triggers onboarding for new users automatically)
- Back button on quiz mode select screen
- Continue button restored on quiz mode select screen
- Profile photo upload via Supabase Storage
- Save trips to Supabase manually
- Usage gate — 3 free searches then email capture
- Email notifications via Resend
- Session cache (30 min TTL)
- Secret header protection
- Rate limiting
- PostHog analytics
- **Orbit 2.0 — Galaxy view live** ✅
- **Orbit Realtime sync — partner additions appear instantly** ✅
- **Planet add + delete** ✅
- **Moon add** ✅
- **All planets tappable (pointer events fixed)** ✅

### Auth & Database
- Supabase tables: profiles, trips, couples, planets, moons
- Row Level Security on all tables
- Auto profile creation trigger
- Supabase Storage bucket: avatars
- Google OAuth + Magic Link
- Profile columns: home_city, home_iata, relationship_start_date, total_miles, display_name
- Supabase Realtime enabled on planets + moons tables

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
5. fly_together calls sequential internally — 6 Duffel calls not 9
6. **Call 2** — Claude gets real prices injected, returns full breakdown + trip basics
7. User sees accurate costs, trip basics instant on expand

### Three modes (all unlocked)
**Visit Partner:**
- Duffel searches P1→P2 and P2→P1 independently

**Meet Somewhere:**
- Duffel searches both partners independently to destination

**Explore Together:**
- Claude picks destinations AND determines optimal hub
- P1 total = leg1 (P1→P2) + leg2 (P2→destination)
- P2 total = P2→destination only

### Key functions
- `getCityIATA()` — overrides first (50+ major cities), then OurAirports DB lookup (4,792 entries)
- `searchDuffelFlights()` — live Duffel API with 429 retry logic
- `/api/flight-prices` — sequential destination loop, sequential internal fly_together calls
- `/api/iata-lookup` — autocomplete with multi-match for onboarding
- `/api/nearest-airport` — Haversine + large airport snap within 100km
- `getExchangeRates()` — 6hr in-memory cache, returns last known rates on API failure

---

## May 4, 2026

### What we built
- Orbit 2.0 galaxy view — sun, orbiting planets, orbiting moons ✅
- Planets wired to Supabase — add, delete, persist across sessions ✅
- Moons wired to Supabase — add memories to planets ✅
- Supabase Realtime sync — partner additions appear instantly without refresh ✅
- Pointer events fixed — all planets tappable regardless of orbit overlap ✅
- Planet modal — shows memories list, add memory button, delete planet ✅
- framer-motion + lucide-react installed ✅
- Orbit route added to App.jsx ✅
- Dashboard Orbit tab navigates to full galaxy page ✅

### Known issues / next session
- Manchester UK still resolving to MHT instead of MAN in some flows
- Planet labels missing — city name not shown below orbiting planet
- Back button missing on Orbit screen
- PWA setup — install to home screen (Gemini: do early)
- Presence Pulse — Realtime ping when partner opens app (save for later)
- Weather widget for partner city on dashboard (save for later)

### Tomorrow priority order
1. Fix Manchester MHT → MAN
2. Planet labels below orbiting planets
3. Back button on Orbit
4. PWA setup

---

## Orbit 2.0 — The Relationship Galaxy ✅ LIVE

### Current State
- Galaxy renders with sun + orbiting planets + orbiting moons
- Add planet → saves to Supabase → appears in orbit instantly
- Add moon → saves to Supabase → orbits the planet
- Realtime sync — both partners see changes without refresh
- Delete planet — removes planet and all its moons
- All planets tappable via pointer events fix

### Entity Hierarchy
**The Sun** — the relationship itself. Always visible. Glows with Presence Pulse activity.

**Planets** — unique destinations visited together. One planet per city, ever.

**Moons** — individual trips to a planet plus side-quest locations. `is_side_quest` flag distinguishes main trip moons from side-quest moons.

### Functional States (planned)
**State A — Planning Orbit** — dashed ring + activity bubbles when trip confirmed
**State B — Crystallization** — planning ring collapses into permanent planet/moon with particle animation
**State C — Memory Galaxy** — current live state, tap planet → memories list

### Remaining Orbit build
- Planning orbit ring + activity bubbles
- Crystallization animation
- Photo upload to moons
- Memory Capsule detail view
- Offline cache for memory capsules
- Planet labels on galaxy view

### Database Schema ✅ LIVE
```sql
-- planets and moons tables live in Supabase
-- RLS enabled on both
-- Realtime enabled on both
-- planets_couple_id_iata_code_key constraint removed (nullable IATA)
```

### Business Defensibility
- Psychological switching cost: 5 planets + 15 moons = deleting a physical scrapbook
- No competitor combines real flight pricing + persistent relationship memory + shared planning
- Viral mechanic: Crystallization animation is the TikTok moment

---

### Retention Strategy — Daily Infrastructure Layer (Planned)
- **Presence Pulse** — Supabase Realtime passive ping when partner opens app
- **Weather Widget** — partner's city weather on dashboard
- **Golden Window** — algorithmic overlap detection for FaceTime scheduling (Month 2)
- Primary retention mechanic is emotional accumulation (Orbit 2.0), not daily habits

### Pricing strategy (locked, paywall paused during data collection)
- Free: Explore Together only, 3 searches then email gate
- Sign in (free): saved trips, dashboard, onboarding profile, all modes during beta
- $9.99/month per couple: Partner Sync, unlimited searches, Orbit, Presence Pulse
- $79.99/year per couple: annual discount
- First 25 couples: $5.99/month locked forever

### MRR Forecasts
**Pre-Orbit 2.0 (quarterly utility model, 18-22% churn):**
- Low: $2,200-2,800 by Dec 2026
- Base: $6,500-8,500
- High: $33,000-48,000

**Post-Orbit 2.0 forecast pending** — expected churn reduction to 6-10% with emotional accumulation moat. LTV improvement estimated 3-4x per couple.

### Notes
- New job started Monday April 28 — build time limited to evenings + weekends
- Target: mid-May soft launch
- Marketing: LDR TikTok creators, authentic organic content — Crystallization animation is the hook
- Beta bypass: roamie-nu.vercel.app?beta=true
- Design inspiration: Moonly + Klima apps
- Logo: lowercase 'r' in Playfair + orange heart (girl's design)
- Orbit 2.0 is the moat — no competitor has persistent relationship memory + real flight pricing
- Long term: LDR wedge → same-city couples → anyone who travels together
- Gemini and Perplexity used for architecture analysis, market research, SQL review
- Build with Claude evenings/weekends — surgical, efficient, no over-engineering
- Strategic sprint week — aiming for beta testers by end of week