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
- Reality strip — crowd, weather, fairness, budget stretch
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
- PWA configured — vite-plugin-pwa, manifest, icons ✅
- Orbit 2.0 — Galaxy view live ✅
- Orbit Realtime sync — partner additions appear instantly ✅
- Planet add + delete ✅
- Moon add ✅
- All planets tappable (pointer events fixed) ✅
- Manchester UK → MAN fix (iata-lookup ambiguous city injection) ✅

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
- `/api/iata-lookup` — autocomplete with multi-match, ambiguous city injection (MAN before MHT), major airport priority sort
- `/api/nearest-airport` — Haversine + large airport snap within 100km
- `getExchangeRates()` — 6hr in-memory cache, returns last known rates on API failure

---

## May 9, 2026

### What we built
- Affiliate revenue layer — src/utils/affiliateLinks.js gateway function ✅
- Travelpayouts marker ID live — 526993 ✅
- Booking.com deep links — city + checkin/checkout dates prefilled ✅
- Affiliate buttons in Results.jsx — shows in expanded breakdown (paid users) ✅
- Affiliate buttons in VisitResults.jsx — shows above Plan a trip together ✅
- Viator placeholder wired — awaiting approval (14 days) ✅
- Wise placeholder wired — awaiting approval (14 days) ✅

### Affiliate programs status
- Travelpayouts/Booking.com — LIVE ✅
- Viator — pending approval, swap YOUR_VIATOR_ID in affiliateLinks.js
- Wise — pending approval, swap YOUR_WISE_ID in affiliateLinks.js

### Tomorrow priority order
1. Speed up Explore/Meet results — Duffel call chain optimisation
2. Back button on Orbit screen
3. Orbit planning mode — active ring + activity bubbles
4. Photo upload on moons — memory capsule
5. Crystallization animation
6. Weather widget on dashboard
7. Presence Pulse
8. First beta testers in

---

## Orbit 2.0 — The Relationship Galaxy ✅ LIVE

### Current State
- Galaxy renders with sun + orbiting planets + orbiting moons
- Add planet → saves to Supabase → appears in orbit instantly
- Add moon → saves to Supabase → orbits the planet
- Realtime sync — both partners see changes without refresh
- Delete planet — removes planet and all its moons
- All planets tappable via pointer events fix

### Two Modes Still Needed
**Memory Mode** (current) — planets and moons represent past trips
**Planning Mode** (next) — active dashed ring around sun for upcoming trip, activity bubbles both partners can add

### Remaining Orbit build
- Planning orbit ring + activity bubbles
- Crystallization animation — planning ring collapses into permanent planet
- Photo upload to moons — memory capsule
- Memory Capsule detail view
- Offline cache for memory capsules

### Entity Hierarchy
**The Sun** — the relationship itself. Always visible.
**Planets** — unique destinations visited together. One per city, ever.
**Moons** — individual trips + side-quest locations. `is_side_quest` flag for styling.

### Functional States
**State A — Planning Orbit** — dashed ring + activity bubbles when trip confirmed
**State B — Crystallization** — planning ring collapses into permanent planet/moon with particle animation
**State C — Memory Galaxy** — current live state

### Database Schema ✅ LIVE
- planets + moons tables live in Supabase
- RLS enabled on both
- Realtime enabled on both
- iata_code nullable, display_name unique per couple

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
- Logo: lowercase 'r' in Playfair Display, purple #7C6AEF, pink heart #F472B6, dark bg #1A1B26
- Orbit 2.0 is the moat — no competitor has persistent relationship memory + real flight pricing
- Long term: LDR wedge → same-city couples → anyone who travels together
- Gemini and Perplexity used for architecture analysis, market research, SQL review
- Build with Claude evenings/weekends — surgical, efficient, no over-engineering
- Strategic sprint week — aiming for beta testers by end of week

## May 10, 2026

### What we built
- Airport autocomplete in Quiz — Duffel Places API replaces CSV lookup ✅
- Atlanta → ATL, Berlin → BER, all major cities now resolve correctly ✅
- max_connections: 2 in Duffel slices — connecting flights now supported ✅
- p1Iata/p2Iata passed through frontend → server — selected airport overrides CSV ✅
- Multi-city overrides expanded — ATL, MEM, SAN, LAS, DEN, SEA, BOS, NAS, CLT, DTW, MSP, PDX, PHX, DFW, IAH, MSY, TPA ✅
- ✦ star symbol fixed across all files ✅
- Claude Code installed and configured ✅
- Rate limiter raised from 10 to 25 requests/hour ✅
- Sensitive console.logs removed from server.js ✅
- Commit to trip flow — button on saved trips card ✅
- Countdown card on dashboard when trip committed ✅
- Save trip from VisitResults ✅
- Shared trips between partners via couple_id ✅
- Dupe affiliate buttons fixed in VisitResults ✅
- Partner sync bug fixed — refetch on app resume ✅
- Swipe lock when expanded on Results page ✅
- Zoom lock on mobile via viewport meta ✅
- Rocket pointing at moon correctly ✅
- Days income pills removed from cost cards ✅

### Remaining before launch
- Country code prefix leaking into destination names (us New York, GB London)
- Planning orbit ring + activity bubbles
- Privacy policy + terms of service pages
- ExchangeRate API rate limit — may need plan upgrade
- Load time optimization on Explore/Meet
- Crystallization animation (post-launch ok)
- Weather widget (post-launch ok)
- Presence Pulse (post-launch ok)