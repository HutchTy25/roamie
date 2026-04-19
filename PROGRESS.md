## April 18, 2026

### What we built
- Rate limiting on backend (10 req/hour per IP)
- CORS locked to Veramie domains only
- Input validation on all endpoints (express-validator)
- Stripe integration — checkout + verify payment endpoints
- Success page built
- Paywall on "More details" button — $3.99 one time
- Security hardening complete

### Known issues / next session
- Success page returning 404 on live site — needs investigation
- Beta tester bypass not built yet
- Currency fairness logic needs strengthening in prompt
- Paid breakdown content needs to be worth $3.99

### Roadmap (in order)
1. Fix success page 404
2. Beta tester bypass for free full breakdown
3. Strengthen paid breakdown prompt — make it worth paying for
4. Partner Sync — linked accounts, saved profiles
5. Monthly Getaway feature — two cards per month (vibe match + wildcard)
6. Landing page

### Pricing locked
- Free: 3 trip searches, basic results
- $3.99 one-time: Full breakdown per search
- $5.99/month: First 25 couples — founding rate, locked forever
- $9.99/month: Everyone after first 25
- Counter on landing page: "X of 25 founding spots remaining"

### Monthly Getaway feature spec
- Two cards delivered monthly
- Card 1: Matches saved vibe profile exactly
- Card 2: Roamie wildcard — slightly outside comfort zone
- Requires Partner Sync first (saved profiles)
- Validated by Perplexity — gap in market confirmed, no competitor doing this

### Env vars
Frontend (Vercel):
- VITE_STRIPE_PRICE_ONETIME
- VITE_STRIPE_PUBLISHABLE_KEY
- VITE_UNSPLASH_KEY

Backend (Render):
- ANTHROPIC_API_KEY
- PERPLEXITY_API_KEY
- RESEND_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_PRICE_ONETIME
- STRIPE_PRICE_MONTHLY