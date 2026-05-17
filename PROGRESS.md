## May 13-16, 2026 — Claude Code Sprint

### Infrastructure
- Claude Code installed and configured ✅
- Workflow shifted to surgical file edits — no more copy/paste ✅

### Flight Engine
- Airport autocomplete replaced CSV lookup with Duffel Places API ✅
- p1Iata/p2Iata passed from frontend → server — selected airport overrides CSV ✅
- max_connections: 2 added to Duffel slices — connecting flights now supported ✅
- p-limit parallel Duffel calls — load time reduced significantly ✅
- Frankfurter exchange rates — replaced ExchangeRate-API, no rate limits ✅
- Currency conversion fixed — P2 costs now correctly converted to their currency ✅
- Same city validation warning in Quiz ✅
- IATA overrides expanded — ATL, MEM, SAN, LAS, DEN, SEA, BOS, NAS, CLT, DTW, MSP, PDX, PHX, DFW, IAH, MSY, TPA ✅

### Affiliate Revenue
- Booking.com flights deep link — pre-populates airports and dates ✅
- Wise CTA moved to fairness line — peak intent placement ✅
- Viator real ID P00300467 live ✅
- "Opens in browser" note on all affiliate buttons ✅

### Auth & Login
- OTP three bug fixes — state declaration, navigation after verify, email redirect ✅
- Confirm sign up template fixed — sends 6 digit code only ✅
- Custom SMTP via Resend connected to Supabase ✅
- Terms/Privacy links on Login page ✅

### Dashboard
- Countdown card moved to top of home tab ✅
- Uncommit flow — "Remove from planning" button ✅
- Ambient glow system — time of day atmospheric overlay ✅
- City bridge layout fixed — equal fixed width, truncates long names ✅
- cleanDestName applied to saved trips ✅
- Partner trips visible via fixed RLS policy ✅
- Trips fetch refactored — profile first then parallel queries ✅

### Saved Trips
- Save trip fixed — saves active card only not all destinations ✅
- New Supabase columns — destination_name, p1_cost, p2_cost, country_emoji, tagline ✅
- Saved trip card redesigned — shows destination, tagline, both partner costs ✅
- Commit to trip button on saved trips ✅

### Orbit
- Planning ring shows when trip committed ✅
- Planning ring size increased to 200px ✅
- Text/button changes in planning mode ✅
- Activity bubbles — both partners can add planning ideas ✅
- Individual orbit animations per bubble ✅
- Tap modal on activity bubbles — shows label, who added, delete ✅
- Labels removed from bubbles — tap to reveal ✅
- Double insert bug fixed ✅
- Back button on not-connected empty state ✅
- navigate() fix — useNavigate was imported but not called ✅
- Activities table created in Supabase with RLS and Realtime ✅

### Legal & Trust
- Privacy policy page live at /privacy ✅
- Terms of service page live at /terms ✅
- Footer links on Home page ✅
- Terms/Privacy link on Login page ✅

### Bug Sweep
- query undefined bug fixed in Onboarding.jsx ✅
- fetchTripBasics out of scope reference removed ✅
- Debug console.logs removed from Results.jsx ✅
- Supabase URL/key console.logs removed from supabase.js ✅
- Session ID console.log removed from Success.jsx ✅
- Wise placeholder updated to empty string ✅

### UI Polish
- ✦ star symbol fixed across all files ✅
- Country code prefix cleaned from destination names ✅
- Days income pills removed from cost cards ✅
- Swipe lock when expanded on Results ✅
- Zoom lock on mobile via viewport meta ✅
- Rocket pointing at moon correctly ✅
- Same city warning in Quiz ✅

### Remaining Before Launch
- Stripe subscription — $7.99/month + $5.99/month founding
- Remove $3.99 one-time paywall
- Wise affiliate pending re-application
- Booking.com affiliate pending approval
- Crystallization animation (post-launch)
- Love in Miles redesign (post-launch)
- Weather widget (post-launch)
- Booking Directive / currency arbitrage (post-launch)
- html2canvas saved trip screenshot (post-launch)