# Roamie Progress Log

## April 17, 2026

### What we built
- Custom calendar component with quick jump pills (+3mo, +6mo, +9mo)
- Email capture (Resend) soft ask after results — working and sending notifications
- Currency symbols color coded in cost breakdown grid (P1 orange, P2 purple)
- Fixed hardcoded $ sign in cost breakdown
- Stress tested Nigeria/Japan extreme scenario — passed

### Current state
- Live at roamie-nu.vercel.app
- Backend at roamie-61ib.onrender.com
- PostHog analytics active
- Perplexity + Claude dual API working
- Resend email capture working
- 4 step quiz flow
- Photo cards via Unsplash
- Reality strip pills (crowd, weather, fairness, budget stretch)
- Share trip + save summary card
- Safety notes per destination
- Same city toggle
- 30 currencies with dynamic sliders
- Accommodation tier selector
- Region preference selector

### Known issues
- Budget ceiling occasionally leaks slightly over max — needs stronger prompt enforcement
- Rate limiting not built yet — API abuse risk
- Usage gate (3 free trips then email) not built yet

### Next up
1. Rate limiting on backend
2. Usage gate — 3 free trips then soft paywall
3. Landing page

### Env vars needed
- ANTHROPIC_API_KEY
- PERPLEXITY_API_KEY
- RESEND_API_KEY
- VITE_UNSPLASH_KEY

## Monetization Plan
- Free tier: 3 searches, basic cost totals
- $3.99 one-time: Full detailed breakdown per search
- $5.99/month: Unlimited full breakdowns + future paid features

## Short-term roadmap
1. Rate limiting
2. Stripe integration + paid prompt gate
3. Usage gate (3 free searches)
4. Landing page
5. Partner Sync