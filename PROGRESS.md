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

## May 3, 2026

### What we built
- All quiz modes unlocked — no paywall during data collection phase ✅
- Post-login redirect to dashboard — new users hit onboarding automatically ✅
- Back button + Continue button on quiz step 0 ✅
- Exchange rate 6hr cache — no more rate limit errors ✅
- fly_together sequential internal calls — 6 Duffel calls not 9 ✅
- 1s delay between destinations — 429s eliminated ✅
- P1 Leg 1 + Leg 2 combined into P1 Flights in results UI ✅
- Rocket animation cleaned up — dotted line removed, faces moon, glow ✅
- Love in Miles year bars removed — card cleaned up ✅
- Dashboard plan trip button fixed ✅

### Known issues / small fixes remaining
- Partner city sometimes showing wrong on dashboard (home_city display edge case)
- Weather widget for partner city — add to dashboard (uses existing home_city data)
- Total miles seeding — onboarding question "how many times visited" × distance

---

## Orbit 2.0 — The Relationship Galaxy ✅ ARCHITECTURE LOCKED

### Core Philosophy
Roamie is transitioning from a quarterly utility tool to an emotional accumulation moat. A couple with 5 planets and 15 moons cannot leave without deleting their relationship history. This is the retention mechanic — not daily pings but irreplaceable emotional data that compounds over time.

### Entity Hierarchy
**The Sun** — the relationship itself. Always visible. Glows with Presence Pulse activity. Never changes.

**Planets** — unique destinations visited together. One planet per city, ever. Created on first confirmed trip to that location. Labeled by user display name (e.g. "Manchester"), backed by IATA code for flight logic.

**Moons** — individual trips to a planet plus side-quest locations. Every trip to Manchester gets a new moon (Christmas '26, Summer '24). A side trip to Bath during a Manchester visit = a secondary moon orbiting the Manchester planet. `is_side_quest` flag distinguishes main trip moons from side-quest moons.

### Functional States
**State A — Planning Orbit (Active Ring)**
Triggered when couple confirms a trip. A dashed orbital ring appears around the sun. Both partners drop activity bubbles onto the ring — date ideas, restaurants, things to do. Low friction, no API calls, user-defined strings only. Ring stays active until trip end date.

**State B — Crystallization (The Transition)**
Triggered when trip marked complete + at least one photo uploaded. The planning ring collapses with a particle animation into a permanent planet or moon. If destination is new → planet born. If destination is repeat → existing planet gains a new moon. This animation is the viral TikTok moment.

**State C — Memory Galaxy (The Dashboard)**
Top-down solar system view. All planets orbit the sun. Tapping a planet zooms in to show its moons. Tapping a moon opens the Memory Capsule — photos, activity logs, trip stats. Key data cached locally for offline access.

### Technical Guardrails
- IATA codes used for flight search backend only — display names are user-defined
- No auto-suggested side quests — users define their own moons (reduces API costs, increases personalization)
- Offline cache on crystallization — memory capsules accessible without internet
- `iata_code` nullable on planets — allows manually created planets for cities without airports
- Unique constraint: `couple_id + iata_code` when IATA present, `couple_id + display_name` when not

### Database Schema (ready to run in Supabase)
```sql
CREATE TABLE planets (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  display_name text not null,
  iata_code text null,
  created_at timestamp default now(),
  UNIQUE NULLS NOT DISTINCT (couple_id, iata_code),
  UNIQUE (couple_id, display_name)
);

CREATE TABLE moons (
  id uuid primary key default gen_random_uuid(),
  planet_id uuid references planets(id) on delete cascade,
  couple_id uuid references couples(id) on delete cascade,
  trip_label text not null,
  start_date date,
  end_date date,
  completed boolean default false,
  is_side_quest boolean default false,
  parent_moon_id uuid references moons(id) null,
  photos jsonb default '[]',
  activity_bubbles jsonb default '[]',
  created_at timestamp default now()
);

alter table planets enable row level security;
alter table moons enable row level security;

create policy "Couple members can access planets"
  on planets for all
  using (
    couple_id in (
      select id from couples
      where partner1_id = auth.uid()
      or partner2_id = auth.uid()
    )
  );

create policy "Couple members can access moons"
  on moons for all
  using (
    couple_id in (
      select id from couples
      where partner1_id = auth.uid()
      or partner2_id = auth.uid()
    )
  );
```

### Business Defensibility
- Psychological switching cost: 5 planets + 15 moons = deleting a physical scrapbook
- No competitor combines real flight pricing + persistent relationship memory + shared planning
- Repeat visit problem solved — planets evolve with moons instead of duplicating
- Viral mechanic: Crystallization animation is a screenshot/TikTok moment

### Next session Orbit build order
1. Run planets + moons SQL migration in Supabase
2. Sun component — dormant vs active states, layered glow animation
3. Galaxy view — planets orbiting sun, tap to zoom
4. Planning orbit ring — activity bubble add flow
5. Moon detail view — Memory Capsule with photos
6. Crystallization animation — planning ring → planet/moon transition
7. Supabase Realtime sync for activity bubbles
8. Offline cache for Memory Capsules

---

### Retention Strategy — Daily Infrastructure Layer (Planned)
Based on market research (Paired, Between, Cupla, Duolingo churn data):
- **Presence Pulse** — Supabase Realtime passive ping when partner opens app. Zero input required.
- **Weather Widget** — partner's city weather on dashboard. Uses existing home_city data. Conversation starter.
- **Golden Window** — algorithmic overlap detection for FaceTime scheduling (Month 2 feature)
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

**Post-Orbit 2.0 forecast pending** — Perplexity analysis running with full Relationship Galaxy architecture factored in. Expected churn reduction to 6-10% with emotional accumulation moat. LTV improvement estimated 3-4x per couple.

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