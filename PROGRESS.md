# Roamie Progress Log

## April 26, 2026

### What we built
- Partner Sync complete — invite generation, accept invite, connected state
- Disconnect partner functionality  
- Supabase couples + profiles tables with RLS policies
- Auto profile creation trigger for new users
- Invite URL code extraction (handles full URL paste)
- Dashboard Partner Sync button links to /connect
- Save trips manually with confirmation feedback (✓ Saved state)
- Connect page with two-step flow (generate + accept)

### Current live state
- roamie-nu.vercel.app fully working
- Google Sign In ✅
- Dashboard with saved trips ✅
- Partner Sync invite system ✅
- Supabase storing trips + couples + profiles ✅

### Next up
1. Test Partner Sync with real partner (girl needs to sign in with Google)
2. Full dashboard redesign — Tyler ♥ Lauren header, countdown, bottom nav
3. Shared trip visibility between partners
4. Pricing update ($3.99 → $4.99, $5.99 → $9.99/month per couple)
5. Prefill quiz from saved trip (Plan again button)
6. Regen feature for subscribers
7. Monthly Getaway

### Notes
- New job starts Monday — build time limited to weekends + evenings
- Dashboard redesign is next big milestone
- Partner Sync foundation complete, shared state comes next
- Girl needs to use Google Sign In (no password needed)

### Env vars
Frontend (Vercel):
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_STRIPE_PRICE_ONETIME
- VITE_STRIPE_PUBLISHABLE_KEY
- VITE_UNSPLASH_KEY
- VITE_ROAMIE_SECRET

Backend (Render):
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