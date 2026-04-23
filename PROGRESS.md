## April 22, 2026

### What we built
- Global trip counter — real backend counter not localStorage
- Usage gate — 3 free searches then email capture to continue (beta mode)
- Secret header protection — x-roamie-secret on all API calls
- Gate page — clean branded email capture before 4th search
- Fixed Home.jsx to fetch real global trip count from backend

### Current live state — READY FOR MARKETING
- roamie-nu.vercel.app fully working
- Usage gate protects against API cost blowout
- Email capture at two touchpoints (soft + hard gate)
- Beta bypass: roamie-nu.vercel.app?beta=true
- All security layers in place

### Marketing mode
- Share roamie-nu.vercel.app for organic users
- Share roamie-nu.vercel.app?beta=true for trusted testers
- Monitor Resend for email signups
- Monitor PostHog for usage analytics

### Next up (after marketing push)
1. Dashboard — saved trips, home cities, partner sync slot
2. Google Sign In
3. Partner Sync
4. Regen feature for $5.99/month subscribers
5. Monthly Getaway
6. Amadeus flight API (Phase 2)
7. Streaming responses (Phase 2)