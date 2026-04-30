# Roamie Progress Log

## Current Live State
roamie-nu.vercel.app — fully working

### Core Features Live ✅
- Landing page with live trip counter
- Google Sign In + Magic Link auth (Supabase)
- Three mode quiz — Visit Partner, Meet Somewhere, Explore Together
- AI recommendations (two-call Claude architecture)
- Real flight prices via FlightAPI.io (11,602 airport IATA database)
- Real exchange rates via ExchangeRate-API
- Per-partner cost breakdown in their own currency
- Reality strip — crowd, weather, fairness, budget stretch
- Paid breakdown + Trip Basics (Perplexity + Claude)
- Stripe payments ($3.99 one-time)
- Partner Sync — invite system, connected state, disconnect
- Dashboard with countdown, bottom nav, saved trips
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
2. **Call 1** — Claude picks 3 destinations only (fast, no prices)
3. **FlightAPI** called with real routes based on routing mode
4. Real prices extracted using retry polling (up to 3 attempts, 2s delay)
5. **Call 2** — Claude gets real prices injected, returns full breakdown
6. User sees accurate costs

### Three modes
**Visit Partner:**
- No AI destination discovery
- FlightAPI searches P1→P2 and P2→P1 independently
- Shows VisitResults.jsx — clean two-card flight price display
- Real prices confirmed: MEM↔MAN $1,214 / £1,128

**Meet Somewhere:**
- Claude picks destinations
- FlightAPI searches both partners independently to destination
- fetchWithRetry polling handles async API responses

**Explore Together:**
- Claude picks destinations AND determines optimal hub
- FlightAPI searches based on fly_together routing logic
- P1 total = leg1 (P1→P2) + leg2 (P2→destination)
- P2 total = P2→destination only

### Key functions
- `getCityIATA()` — fuzzy city name to IATA lookup (11,602 airports)
- `extractLowestPrice()` — parses FlightAPI response structure
- `fetchWithRetry()` — polls FlightAPI up to 3x with 2s delay
- `/api/flight-prices` — dedicated endpoint for all flight searches

---

## April 29, 2026

### What we built
- Three mode quiz flow ✅
- VisitResults.jsx — dedicated visit partner results page ✅
- Real FlightAPI prices with retry polling ✅
- Two-call Claude architecture complete ✅
- Airport database integration (11,602 entries) ✅
- fetchWithRetry polling function ✅
- Price extraction working correctly ✅
- fuzzy IATA matching (handles typos, punctuation, state suffixes) ✅

### Known issues / next fixes
- Magic link users show "You" instead of their name — need name edit field
- fly_together routing needs fetchWithRetry applied (currently only meet has it)
- Debug logs need cleanup before push
- airports.dat added to .gitignore

### Next up
1. Apply fetchWithRetry to fly_together routing block
2. Name edit field in Profile tab
3. Shared trip visibility between partners
4. Pricing update ($3.99 → $4.99, $5.99 → $9.99/month per couple)
5. Favorites/matching system (yellow = one likes, green = both like)
6. Miles flown legacy card
7. Onboarding flow with nearest airport detection
8. Orbit system (shared couple space between trips)
9. iOS PWA home screen setup
10. UI redesign with V0

### Pricing strategy (locked)
- Free: 3 trip searches
- $4.99 one-time: Full breakdown + trip basics
- $9.99/month per couple: Partner Sync, unlimited searches, Monthly Getaway, regens
- $79.99/year per couple: Annual discount
- First 25 couples: $5.99/month locked forever

### Product roadmap
1. Name edit ← next
2. Shared trips
3. Pricing update in Stripe
4. Favorites matching
5. Miles legacy card
6. Onboarding flow
7. Orbit system
8. Monthly Getaway
9. UI redesign
10. PWA setup
11. Privacy Policy + Terms
12. LLC formation

### Notes
- New job started Monday April 28 — build time limited to evenings + weekends
- Target: mid-late May soft launch
- Marketing: LDR TikTok creators, authentic organic content
- Beta bypass: roamie-nu.vercel.app?beta=true
- Design inspiration: Moonly + Klima apps
- Logo: lowercase 'r' in Playfair + orange heart (girl's design)