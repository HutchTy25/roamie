import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import { supabase } from '../supabase'

// Moonly Theme Colors
const THEME = {
  bg: '#1A1B26',
  card: 'rgba(30, 32, 48, 0.85)',
  primary: '#7C6AEF',
  accent: '#F472B6',
  cyan: '#22D3EE',
  text: '#E8E8ED',
  muted: '#8B8FA3',
  border: 'rgba(124, 106, 239, 0.25)',
}

// Starfield
function Starfield() {
  const stars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 3,
  }))
  
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {stars.map(star => (
        <div
          key={star.id}
          style={{
            position: 'absolute',
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            background: 'white',
            opacity: 0.3,
            animation: `twinkle 3s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function EmailCapture() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!email.includes('@')) return
    setLoading(true)
    try {
      await fetch('https://roamie-61ib.onrender.com/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      setSubmitted(true)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) return (
    <div style={{
      padding: '2rem 1.5rem',
      textAlign: 'center',
      borderTop: `1px solid ${THEME.border}`,
      background: 'rgba(124, 106, 239, 0.05)',
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '8px', color: THEME.accent }}>&#10022;</div>
      <div style={{ fontSize: '1.1rem', marginBottom: '6px', color: THEME.text, fontWeight: '500' }}>
        You&apos;re in.
      </div>
      <div style={{ fontSize: '13px', color: THEME.muted }}>
        We&apos;ll keep you posted on new features.
      </div>
    </div>
  )

  return (
    <div style={{
      padding: '2rem 1.5rem',
      borderTop: `1px solid ${THEME.border}`,
      background: 'rgba(244, 114, 182, 0.03)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: THEME.accent, marginBottom: '8px', fontWeight: '500' }}>
          Early access
        </div>
        <div style={{ fontSize: '1.2rem', marginBottom: '6px', color: THEME.text, fontWeight: '500' }}>
          Want to be first to know?
        </div>
        <div style={{ fontSize: '13px', color: THEME.muted, lineHeight: '1.6' }}>
          We&apos;re building new features for couples. Drop your email and we&apos;ll keep you in the loop.
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', maxWidth: '400px', margin: '0 auto' }}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{
            flex: 1,
            fontSize: '14px',
            padding: '12px 16px',
            background: 'rgba(30, 32, 48, 0.8)',
            border: `1px solid ${THEME.border}`,
            borderRadius: '100px',
            color: THEME.text,
            outline: 'none',
          }}
        />
        <button
          onClick={submit}
          disabled={loading || !email.includes('@')}
          style={{
            background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
            border: 'none',
            borderRadius: '100px',
            padding: '12px 20px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            cursor: loading ? 'wait' : 'pointer',
            opacity: !email.includes('@') ? 0.4 : 1,
            whiteSpace: 'nowrap',
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? '...' : 'Join'}
        </button>
      </div>
    </div>
  )
}

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const location_data = location.state?.data
  const savedDataStr = localStorage.getItem('roamie_last_data')
  const data = location_data || (savedDataStr ? JSON.parse(savedDataStr) : null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeCard, setActiveCard] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [photos, setPhotos] = useState({})
  const [messageIndex, setMessageIndex] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [tripBasics, setTripBasics] = useState(null)
  const [tripSaved, setTripSaved] = useState(false)

  const loadingMessages = [
    "Checking flight routes from both cities...",
    "Comparing currencies and budgets...",
    "Finding hidden gems for your vibe...",
    "Checking weather for your dates...",
    "Calculating fairness between partners...",
    "Almost there — building your breakdown...",
  ]
  const startX = useRef(null)

  const CURR_SYMBOLS = {
    USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
    NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
    IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
    INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
    KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
    BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
  }

  const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_KEY

  useEffect(() => {
    if (!data) { navigate('/'); return }
    const params = new URLSearchParams(window.location.search)
    if (params.get('beta') === 'true') {
      localStorage.setItem('roamie_paid', 'true')
    }
    const savedResult = localStorage.getItem('roamie_last_result')
    if (savedResult) {
      setResult(JSON.parse(savedResult))
      setLoading(false)
      localStorage.removeItem('roamie_last_result')
    } else {
      fetchRecommendations()
    }
  }, [])

  useEffect(() => {
    if (!result) return
    result.destinations?.forEach((dest, i) => {
      fetchPhoto(dest.name, i)
    })
    if (result.stretch_goal?.name) {
      fetchPhoto(result.stretch_goal.name, 'stretch')
    }
  }, [result])

  useEffect(() => {
    setTripBasics(null)
    setExpanded(false)
    setTripSaved(false)
  }, [activeCard])

  useEffect(() => {
    if (!result) return
    posthog.capture('results_viewed', {
      destination_1: result.destinations?.[0]?.name,
      destination_2: result.destinations?.[1]?.name,
      destination_3: result.destinations?.[2]?.name,
    })
  }, [result])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % loadingMessages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [loading])

  async function saveTripToSupabase() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      await supabase.from('trips').insert({
        user_id: session.user.id,
        p1_city: data.p1.city,
        p2_city: data.p2.city,
        p1_currency: data.p1.currency,
        p2_currency: data.p2.currency,
        p1_budget: data.p1.maxSpend,
        p2_budget: data.p2.maxSpend,
        vibes: data.vibes,
        dates_from: data.dates.from,
        dates_to: data.dates.to,
        routing: data.routing,
        accommodation: data.accommodation,
        region: data.region,
        destinations: result.destinations,
        stretch_goal: result.stretch_goal,
      })
      setTripSaved(true)
    } catch (e) {
      console.error('Save trip error:', e)
    }
  }

  function handleTouchStart(e) {
    startX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (!startX.current) return
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        setActiveCard(c => Math.min(c + 1, allCardsLength - 1))
        setExpanded(false)
      } else {
        setActiveCard(c => Math.max(c - 1, 0))
        setExpanded(false)
      }
    }
    startX.current = null
  }

  async function fetchRecommendations() {
    if (data.tripMode === 'visit') {
      await fetchVisitPrices()
      return
    }

    const p1sym = CURR_SYMBOLS[data.p1.currency] || data.p1.currency
    const p2sym = CURR_SYMBOLS[data.p2.currency] || data.p2.currency

    const destinationPrompt = `You are Roamie, a couples travel planner. Based on these details suggest exactly 3 destinations.

PARTNER DETAILS:
- Partner 1: Lives in ${data.p1.city} | Currency: ${data.p1.currency} (${p1sym}) | Max budget: ${p1sym}${data.p1.maxSpend.toLocaleString()} TOTAL
- Partner 2: Lives in ${data.p2.city} | Currency: ${data.p2.currency} (${p2sym}) | Max budget: ${p2sym}${data.p2.maxSpend.toLocaleString()} TOTAL
- Travel dates: ${data.dates.from} to ${data.dates.to}
- Vibes: ${data.vibes?.join(', ') || 'open to anything'}
- Routing: ${data.routing}
- Accommodation: ${data.accommodation}
- Region: ${data.region}

Return ONLY this JSON, no markdown, no explanation:
{
  "destinations": [
    {
      "name": "City, Country",
      "country_emoji": "🇵🇹",
      "tagline": "One warm sentence why this is perfect for them",
      "why_it_works": "2-3 sentences on why this fits their cities, budgets and vibes",
      "vibe_match": ["vibe1", "vibe2"],
      "best_for": "weekend or week or two weeks",
      "season_note": "Weather for their exact dates with temperatures",
      "safety_note": "One honest sentence on safety",
      "reality_strip": {
        "crowd": "Low or Medium or High",
        "weather": "Good or Uncertain or Risky",
        "fairness": "Balanced or Slightly Skewed or Very Skewed",
        "budget_stretch": "Comfortable or Slight Stretch or Heavy Stretch"
      }
    }
  ],
  "stretch_goal": {
    "name": "City, Country",
    "country_emoji": "🇬🇷",
    "tagline": "Why this is the dream trip",
    "what_it_takes": "Exactly what both need to save weekly and how many weeks"
  },
  "couple_summary": "2 warm sentences about what kind of travelers they are together"
}`

    try {
      setMessageIndex(0)
      const res1 = await fetch('https://roamie-61ib.onrender.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: destinationPrompt }]
        })
      })

      const raw1 = await res1.text()
      const json1 = JSON.parse(raw1)
      const text1 = Array.isArray(json1.content)
        ? json1.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
        : raw1.replace(/```json|```/g, '').trim()

      // Run Claude call 1 AND flight prices in parallel
setMessageIndex(0)

const [res1, earlyFlightPrices] = await Promise.all([
  fetch('https://roamie-61ib.onrender.com/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: destinationPrompt }]
    })
  }),
  fetchRealFlightPrices([
    data.p1.city,
    data.p2.city,
  ]).catch(() => ({}))
])

const raw1 = await res1.text()
const json1 = JSON.parse(raw1)
const text1 = Array.isArray(json1.content)
  ? json1.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
  : raw1.replace(/```json|```/g, '').trim()

const destinations = JSON.parse(text1)
const destNames = destinations.destinations?.map(d => d.name) || []

setMessageIndex(2)

// Now fetch destination-specific prices, but we already warmed up the API
const flightPrices = await fetchRealFlightPrices(destNames)

setMessageIndex(4)
const breakdownPrompt = buildBreakdownPrompt(destinations, flightPrices, p1sym, p2sym)

      const res2 = await fetch('https://roamie-61ib.onrender.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3000,
          messages: [{ role: 'user', content: breakdownPrompt }]
        })
      })

      const raw2 = await res2.text()
      const json2 = JSON.parse(raw2)
      const text2 = Array.isArray(json2.content)
        ? json2.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
        : raw2.replace(/```json|```/g, '').trim()

      const fullResult = JSON.parse(text2)
      setResult(fullResult)

    } catch (e) {
      console.error('Error:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function fetchVisitPrices() {
    try {
      const res = await fetch('https://roamie-61ib.onrender.com/api/flight-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({
          p1City: data.p1.city,
          p2City: data.p2.city,
          destinations: [data.p2.city, data.p1.city],
          dates: `${data.dates.from} to ${data.dates.to}`,
          routing: 'meet',
          sameCity: false,
        })
      })
      const prices = await res.json()

      setResult({
        destinations: [
          {
            name: data.p2.city,
            country_emoji: '✈️',
            tagline: `${data.p1.city} → ${data.p2.city}`,
            isVisit: true,
            visitDirection: 'p1_to_p2',
            p1_cost: prices[data.p2.city]?.p1 || null,
            p2_cost: null,
            routing_note: `Round trip from ${data.p1.city} to ${data.p2.city}`,
            reality_strip: null,
          },
          {
            name: data.p1.city,
            country_emoji: '✈️',
            tagline: `${data.p2.city} → ${data.p1.city}`,
            isVisit: true,
            visitDirection: 'p2_to_p1',
            p1_cost: null,
            p2_cost: prices[data.p1.city]?.p2 || null,
            routing_note: `Round trip from ${data.p2.city} to ${data.p1.city}`,
            reality_strip: null,
          }
        ],
        couple_summary: `Real flight prices for ${data.dates.from} to ${data.dates.to}`
      })
    } catch (e) {
      console.error('Visit prices error:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRealFlightPrices(destNames) {
    try {
      const res = await fetch('https://roamie-61ib.onrender.com/api/flight-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({
          p1City: data.p1.city,
          p2City: data.p2.city,
          destinations: destNames,
          dates: `${data.dates.from} to ${data.dates.to}`,
          routing: data.routing,
          sameCity: data.sameCity,
        })
      })
      return await res.json()
    } catch (e) {
      console.error('Flight price fetch error:', e)
      return {}
    }
  }

  function buildBreakdownPrompt(destinations, flightPrices, p1sym, p2sym) {
    const flightContext = Object.entries(flightPrices).map(([dest, prices]) => {
      return `${dest}:
  - P1 total round trip from ${data.p1.city}: ${prices.p1 ? prices.p1 : 'estimate needed'} USD
  - P1 breakdown: leg1 (${data.p1.city}→${data.p2.city}): ${prices.p1_breakdown?.leg1 || 'N/A'} USD, leg2 (${data.p2.city}→destination): ${prices.p1_breakdown?.leg2 || 'N/A'} USD
  - P2 total round trip from ${data.p2.city}: ${prices.p2 ? prices.p2 : 'estimate needed'} USD`
    }).join('\n')

    return `You are Roamie. Here are 3 destinations already selected for a couple. Add detailed cost breakdowns using the REAL flight prices provided.

PARTNER DETAILS:
- Partner 1: ${data.p1.city} | ${data.p1.currency} (${p1sym}) | Budget: ${p1sym}${data.p1.maxSpend.toLocaleString()}
- Partner 2: ${data.p2.city} | ${data.p2.currency} (${p2sym}) | Budget: ${p2sym}${data.p2.maxSpend.toLocaleString()}
- Dates: ${data.dates.from} to ${data.dates.to}
- Routing: ${data.routing}
- Accommodation: ${data.accommodation}

REAL FLIGHT PRICES (use these exactly, do not estimate or change them):
${flightContext}

DESTINATIONS TO ADD BREAKDOWN TO:
${JSON.stringify(destinations, null, 2)}

CRITICAL RULES:
- All numeric values must be plain numbers with NO currency symbols attached
- p1_cost and p2_cost must be plain numbers only (e.g. 2265 not $2265)
- All cost_breakdown values must be plain numbers only
- All costs in USD equivalent
- Use the EXACT flight prices provided above, do not modify them

For each destination add these fields:
- p1_cost: total trip cost for P1 as plain number in USD
- p2_cost: total trip cost for P2 as plain number in USD
- cost_breakdown: { flights_p1_leg1, flights_p1_leg2, flights_p1_total, flights_p2, lodging_per_night, lodging_total, food_per_day, food_total, activities_total } all plain numbers in USD
- lodging_note: specific hotel recommendation with price per night
- routing_note: specific airlines and flight times for both partners
- fairness_note: one sentence on currency fairness
- harder_partner: "p1" or "p2"
- p1_days_income: estimated days of income as number
- p2_days_income: estimated days of income as number
- savings_scenario: accurate math — calculate exact gap between budget and cost, divide by weeks, give exact weekly amount

Also add a "trip_basics" object to each destination with this structure:
- neighborhood: { name, why }
- getting_around: [{ method, avg_cost, recommended }] (2-3 options)
- restaurants: [{ name, cuisine, price }] (2 recs)
- stay_tip: one sentence on best area to book

Return the complete destinations JSON with all fields including trip_basics. Same JSON structure as input but with cost fields and trip_basics added. No markdown, no backticks, no explanation.`
  }

  function getPhotoQuery() {
    const vibes = data?.vibes || []
    if (vibes.includes('beach')) return 'beach sunset travel'
    if (vibes.includes('city')) return 'cityscape architecture travel'
    if (vibes.includes('nature')) return 'nature landscape travel'
    if (vibes.includes('romantic')) return 'romantic travel destination'
    return 'travel destination landmark'
  }

  async function fetchPhoto(cityName, index) {
    try {
      const city = cityName.split(',')[0].trim()
      const query = `${city} ${getPhotoQuery()}`
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape&order_by=relevant&content_filter=high`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      )
      const json = await res.json()
      if (json.results?.length > 0) {
        const best = json.results.reduce((prev, current) => 
          (current.likes > prev.likes) ? current : prev
        )
        setPhotos(prev => ({ ...prev, [index]: best.urls.regular }))
      }
    } catch (e) {
      console.log('Photo fetch failed:', e)
    }
  }

  async function fetchTripBasics() {
  if (!dest.trip_basics) return
  setTripBasics(dest.trip_basics)
}

  async function shareTrip() {
    const currentDest = allCards[activeCard]
    if (!currentDest || currentDest.isStretch) return

    const shareText = `✈️ We're thinking ${currentDest.country_emoji} ${currentDest.name}!\n\n💰 P1: ${p1sym}${currentDest.p1_cost?.toLocaleString()}\n💰 P2: ${p2sym}${currentDest.p2_cost?.toLocaleString()}\n\n${currentDest.tagline}\n\n🔗 Plan yours free at roamie-nu.vercel.app`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentDest.name} — Roamie`,
          text: shareText,
        })
      } catch (e) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(shareText)
      alert('Copied to clipboard!')
    }
  }

  const p1sym = CURR_SYMBOLS[data?.p1?.currency] || ''
  const p2sym = CURR_SYMBOLS[data?.p2?.currency] || ''

  // LOADING STATE
  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      background: THEME.bg,
      padding: '2rem',
      position: 'relative',
    }}>
      <Starfield />
      <style>{`
        @keyframes pulse { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-8px);opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.8} }
      `}</style>

      {/* Animated plane */}
      <div style={{ fontSize: '2.5rem', animation: 'float 3s ease-in-out infinite', position: 'relative', zIndex: 1 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={THEME.accent} strokeWidth="1.5">
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      </div>

      <div style={{ textAlign: 'center', maxWidth: '300px', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: '1.4rem', marginBottom: '12px', color: THEME.text, fontWeight: '500' }}>
          Finding your trips...
        </div>
        <div style={{
          fontSize: '14px',
          color: THEME.accent,
          minHeight: '24px',
          fontStyle: 'italic',
        }}>
          {loadingMessages[messageIndex]} 
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 1 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
          }} />
        ))}
      </div>

      <div style={{
        marginTop: '1rem',
        fontSize: '12px',
        color: THEME.muted,
        textAlign: 'center',
        maxWidth: '260px',
        lineHeight: '1.6',
        position: 'relative',
        zIndex: 1,
      }}>
        Checking real flight routes, currencies, and weather for your exact dates
      </div>
    </div>
  )

  // ERROR STATE
  if (error || !result) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem', background: THEME.bg }}>
      <Starfield />
      <div style={{ fontSize: '1.4rem', color: THEME.text, fontWeight: '500', position: 'relative', zIndex: 1 }}>Something went wrong</div>
      <div style={{ fontSize: '14px', color: THEME.muted, position: 'relative', zIndex: 1 }}>Couldn&apos;t generate recommendations. Try again.</div>
      <button
        onClick={() => navigate('/quiz')}
        style={{
          marginTop: '1rem',
          padding: '12px 32px',
          background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
          color: '#fff',
          borderRadius: '100px',
          fontSize: '14px',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
        }}
      >
        Try again
      </button>
    </div>
  )

  const allCards = [...(result.destinations || []), { isStretch: true, ...(result.stretch_goal || {}) }]
  const allCardsLength = allCards.length
  const dest = allCards[activeCard] || {}
  const isStretch = dest.isStretch || false

  // MAIN RESULTS VIEW
  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', background: THEME.bg }}>
      <Starfield />
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.8} }
      `}</style>

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '3rem 1.5rem 2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <button
            onClick={() => navigate('/quiz')}
            style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', padding: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M15 18l-6-6 6-6"/></svg>
            back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', padding: 0 }}
          >
            Dashboard
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginLeft: '4px' }}><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        {/* Card dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '1rem', justifyContent: 'center' }}>
          {allCards.map((_, i) => (
            <div
              key={i}
              onClick={() => { setActiveCard(i); setExpanded(false) }}
              style={{
                width: i === activeCard ? '24px' : '8px',
                height: '8px',
                borderRadius: '4px',
                background: i === activeCard
                  ? `linear-gradient(90deg, ${THEME.accent}, ${THEME.primary})`
                  : 'rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: i === activeCard ? `0 0 12px ${THEME.accent}` : 'none',
              }}
            />
          ))}
        </div>

        {/* Card label */}
        <div style={{
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: isStretch ? THEME.primary : THEME.accent,
          marginBottom: '0.75rem',
          fontWeight: '500',
          textAlign: 'center',
        }}>
          {isStretch ? '&#10022; Stretch goal' : activeCard === 0 ? '&#10022; Best match' : `Option ${activeCard + 1}`}
        </div>

        {/* ======================== */}
        {/* PREMIUM DESTINATION CARD */}
        {/* ======================== */}
        <div style={{
          width: '100%',
          borderRadius: '24px',
          overflow: 'hidden',
          marginBottom: '1.25rem',
          position: 'relative',
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${isStretch ? 'rgba(124,106,239,0.15)' : 'rgba(244,114,182,0.15)'}`,
        }}>
          {/* Full bleed photo */}
          <div style={{
            width: '100%',
            height: '280px',
            background: photos[isStretch ? 'stretch' : activeCard]
              ? `url(${photos[isStretch ? 'stretch' : activeCard]}) center 30%/cover no-repeat`
              : `linear-gradient(135deg, ${THEME.bg} 0%, #2A2D42 100%)`,
          }}>
            {/* Gradient overlay for text readability */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '70%',
              background: 'linear-gradient(to top, rgba(26,27,38,0.98) 0%, rgba(26,27,38,0.8) 40%, transparent 100%)',
            }} />

            {/* Reality strip pills - top right */}
            {!isStretch && dest.reality_strip && (
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}>
                {[
                  { label: dest.reality_strip.crowd, icon: '👥' },
                  { label: dest.reality_strip.weather, icon: '☀️' },
                  { label: dest.reality_strip.fairness, icon: '⚖️' },
                  { label: dest.reality_strip.budget_stretch, icon: '💰' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(30,32,48,0.85)',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '100px',
                    padding: '4px 10px',
                    fontSize: '10px',
                    color: THEME.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    border: `1px solid ${THEME.border}`,
                  }}>
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
            )}

            {/* Destination name - bottom of photo */}
            <div style={{
              position: 'absolute',
              bottom: '1.25rem',
              left: '1.25rem',
              right: '1.25rem',
            }}>
              <div style={{
                fontSize: 'clamp(1.8rem, 7vw, 2.4rem)',
                lineHeight: '1.1',
                color: '#fff',
                fontWeight: '600',
                textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                marginBottom: '6px',
              }}>
                {dest.country_emoji} {dest.name}
              </div>
              <div style={{
                fontSize: '14px',
                color: 'rgba(255,255,255,0.8)',
                lineHeight: '1.5',
                maxWidth: '90%',
              }}>
                {dest.tagline}
              </div>
            </div>
          </div>
        </div>

        {/* Glassmorphism info card */}
        <div style={{
          background: THEME.card,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '1.25rem',
          border: `1px solid ${THEME.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>

          {/* Cost pills */}
          {!isStretch && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(244,114,182,0.12)',
                border: '1px solid rgba(244,114,182,0.3)',
                borderRadius: '100px',
                padding: '10px 16px',
                fontSize: '13px',
                flex: 1,
                minWidth: '140px',
              }}>
                <span style={{ color: THEME.muted, marginRight: '6px' }}>P1</span>
                <span style={{ color: THEME.accent, fontWeight: '600', fontSize: '16px' }}>{p1sym}{dest.p1_cost?.toLocaleString()}</span>
                {dest.p1_days_income && <span style={{ color: THEME.muted, marginLeft: '6px', fontSize: '11px' }}>{dest.p1_days_income}d</span>}
              </div>
              <div style={{
                background: 'rgba(124,106,239,0.12)',
                border: '1px solid rgba(124,106,239,0.3)',
                borderRadius: '100px',
                padding: '10px 16px',
                fontSize: '13px',
                flex: 1,
                minWidth: '140px',
              }}>
                <span style={{ color: THEME.muted, marginRight: '6px' }}>P2</span>
                <span style={{ color: THEME.primary, fontWeight: '600', fontSize: '16px' }}>{p2sym}{dest.p2_cost?.toLocaleString()}</span>
                {dest.p2_days_income && <span style={{ color: THEME.muted, marginLeft: '6px', fontSize: '11px' }}>{dest.p2_days_income}d</span>}
              </div>
            </div>
          )}

          {/* Stretch goal content */}
          {isStretch && (
            <div style={{
              background: 'rgba(124,106,239,0.1)',
              border: '1px solid rgba(124,106,239,0.25)',
              borderRadius: '14px',
              padding: '1rem',
              marginBottom: '1rem',
            }}>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>{dest.what_it_takes}</div>
            </div>
          )}

          {/* Expand/unlock button */}
          {!isStretch && (
            <button
              onClick={async () => {
                const isPaid = localStorage.getItem('roamie_paid') === 'true'
                if (isPaid) {
  setExpanded(e => !e)
  if (!expanded && dest.trip_basics) setTripBasics(dest.trip_basics)
  return
}

                try {
                  const res = await fetch('https://roamie-61ib.onrender.com/api/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      priceId: import.meta.env.VITE_STRIPE_PRICE_ONETIME,
                      mode: 'payment',
                    })
                  })
                  const stripeResponse = await res.json()
                  if (stripeResponse.url) {
                    localStorage.setItem('roamie_last_result', JSON.stringify(result))
                    localStorage.setItem('roamie_last_data', JSON.stringify(data))
                    window.location.href = stripeResponse.url
                  }  
                } catch (e) {
                  console.error('Checkout error:', e)
                }
              }}
              style={{
                background: localStorage.getItem('roamie_paid') === 'true'
                  ? 'rgba(255,255,255,0.05)'
                  : `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
                border: localStorage.getItem('roamie_paid') === 'true'
                  ? `1px solid ${THEME.border}`
                  : 'none',
                borderRadius: '100px',
                padding: '12px 20px',
                color: '#fff',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                marginBottom: expanded ? '1rem' : '0',
                transition: 'all 0.2s',
                display: 'block',
                width: '100%',
                boxShadow: localStorage.getItem('roamie_paid') !== 'true' ? `0 0 20px rgba(244,114,182,0.3)` : 'none',
              }}
            >
              {expanded ? 'Less details' : localStorage.getItem('roamie_paid') === 'true' ? 'More details' : 'Unlock full breakdown — $3.99'}
            </button>  
          )}

          {/* Expanded details */}
          {expanded && !isStretch && (
            <div style={{ animation: 'fadeSlideUp 0.3s ease', borderTop: `1px solid ${THEME.border}`, paddingTop: '1.25rem', marginTop: '1rem' }}>

              {dest.cost_breakdown && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '1.25rem' }}>
                  {[
                    { label: 'P1 Leg 1', value: dest.cost_breakdown.flights_p1_leg1 || dest.cost_breakdown.flights_p1, sym: p1sym, color: THEME.accent },
                    { label: 'P1 Leg 2', value: dest.cost_breakdown.flights_p1_leg2 || null, sym: p1sym, color: THEME.accent },
                    { label: 'P2 Flight', value: dest.cost_breakdown.flights_p2, sym: p2sym, color: THEME.primary },
                    { label: 'Lodging', value: dest.cost_breakdown.lodging_total, sym: '$', color: THEME.text },
                    { label: 'Food', value: dest.cost_breakdown.food_total, sym: '$', color: THEME.text },
                    { label: 'Activities', value: dest.cost_breakdown.activities_total, sym: '$', color: THEME.text },
                  ].filter(item => item.value != null).map(item => (
                    <div key={item.label} style={{
                      background: 'rgba(255,255,255,0.04)',
                      borderRadius: '12px',
                      padding: '10px 6px',
                      textAlign: 'center',
                      border: `1px solid ${THEME.border}`,
                    }}>
                      <div style={{ fontSize: '10px', color: THEME.muted, marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ fontSize: '12px', color: item.color, fontWeight: '500' }}>{item.sym}{item.value?.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}

              {dest.lodging_note && (
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', border: `1px solid ${THEME.border}` }}>
                  🏨 {dest.lodging_note}
                </div>
              )}

              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.7', marginBottom: '1rem' }}>
                {dest.why_it_works}
              </div>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', border: `1px solid ${THEME.border}` }}>
                ✈️ {dest.routing_note}
              </div>

              {dest.safety_note && (
                <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', border: `1px solid ${THEME.border}` }}>
                  🛡️ {dest.safety_note}
                </div>
              )}

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', border: `1px solid ${THEME.border}` }}>
                ☀️ {dest.season_note}
              </div>

              <div style={{ borderLeft: `3px solid ${THEME.accent}`, paddingLeft: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.6', marginBottom: '1rem' }}>
                {dest.savings_scenario}
              </div>

              <div style={{ fontSize: '12px', color: THEME.muted, marginBottom: '1.5rem' }}>
                {dest.fairness_note}
              </div>

              {/* Trip Basics */}
              {loadingBasics && (
                <div style={{ textAlign: 'center', padding: '1rem', fontSize: '13px', color: THEME.muted }}>
                  Loading trip basics...
                </div>
              )}

              {tripBasics && (
  <div style={{ marginBottom: '1.5rem' }}>
    <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.accent, marginBottom: '1rem', fontWeight: '500' }}>
      &#10022; Trip basics
    </div>

    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', border: `1px solid ${THEME.border}` }}>
      <div style={{ fontSize: '11px', color: THEME.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📍 Where to stay</div>
      <div style={{ fontSize: '13px', color: THEME.accent, marginBottom: '4px', fontWeight: '500' }}>{tripBasics.neighborhood?.name}</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{tripBasics.neighborhood?.why}</div>
    </div>

    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', border: `1px solid ${THEME.border}` }}>
      <div style={{ fontSize: '11px', color: THEME.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🚗 Getting around</div>
      {tripBasics.getting_around?.map(g => (
        <div key={g.method} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>
          <span>{g.method}</span>
          <span style={{ color: g.recommended ? THEME.accent : 'rgba(255,255,255,0.4)' }}>{g.avg_cost}</span>
        </div>
      ))}
      {tripBasics.stay_tip && (
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '8px', fontStyle: 'italic' }}>{tripBasics.stay_tip}</div>
      )}
    </div>

    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', border: `1px solid ${THEME.border}` }}>
      <div style={{ fontSize: '11px', color: THEME.muted, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🍽️ Where to eat</div>
      {tripBasics.restaurants?.map(r => (
        <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
          <span>{r.name} <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {r.cuisine}</span></span>
          <span>{r.price}</span>
        </div>
      ))}
    </div>
  </div>
)}

              <button
                onClick={() => navigate('/quiz')}
                style={{
                  background: 'none',
                  border: `1px solid ${THEME.border}`,
                  borderRadius: '100px',
                  padding: '10px 24px',
                  color: THEME.muted,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Plan another trip
              </button>
            </div>
          )}

          {/* Share + action buttons */}
          {!expanded && (
            <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
              {!isStretch && (
                <>
                  <button
                    onClick={shareTrip}
                    style={{
                      background: 'rgba(244,114,182,0.12)',
                      border: '1px solid rgba(244,114,182,0.3)',
                      borderRadius: '100px',
                      padding: '12px 24px',
                      color: THEME.accent,
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.2s',
                    }}
                  >
                    Share this trip
                  </button>
                  <button
                    onClick={() => setShowSummary(true)}
                    style={{
                      background: 'rgba(124,106,239,0.12)',
                      border: '1px solid rgba(124,106,239,0.3)',
                      borderRadius: '100px',
                      padding: '12px 24px',
                      color: THEME.primary,
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.2s',
                    }}
                  >
                    Save summary card
                  </button>
                  <button
                    onClick={saveTripToSupabase}
                    disabled={tripSaved}
                    style={{
                      background: tripSaved ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${tripSaved ? THEME.border : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '100px',
                      padding: '12px 24px',
                      color: tripSaved ? THEME.muted : THEME.text,
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: tripSaved ? 'default' : 'pointer',
                      width: '100%',
                      transition: 'all 0.2s',
                    }}
                  >
                    {tripSaved ? 'Saved to dashboard' : 'Save to dashboard'}
                  </button>
                </>
              )}
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '0.5rem' }}>
                swipe to explore
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Couple summary */}
      {result.couple_summary && (
        <div style={{
          padding: '1.5rem',
          background: THEME.card,
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${THEME.border}`,
          fontSize: '14px',
          color: THEME.muted,
          lineHeight: '1.7',
          textAlign: 'center',
          position: 'relative',
          zIndex: 1,
        }}>
          {result.couple_summary}
        </div>
      )}

      {/* Email capture */}
      <EmailCapture />

      {/* Summary card modal */}
      {showSummary && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backdropFilter: 'blur(8px)',
        }}
          onClick={() => setShowSummary(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: THEME.card,
              backdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '2rem',
              width: '100%',
              maxWidth: '360px',
              border: `1px solid ${THEME.border}`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(244,114,182,0.1)`,
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '13px', color: THEME.accent, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>&#10022; Roamie</div>
              <div style={{ fontSize: '2rem', lineHeight: '1.1', marginBottom: '8px', color: THEME.text, fontWeight: '600' }}>
                {dest.country_emoji} {dest.name}
              </div>
              <div style={{ fontSize: '13px', color: THEME.muted, lineHeight: '1.5' }}>
                {dest.tagline}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
              <div style={{
                background: 'rgba(244,114,182,0.1)',
                border: '1px solid rgba(244,114,182,0.2)',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: THEME.muted, marginBottom: '4px' }}>Partner 1</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '600', color: THEME.accent }}>{p1sym}{dest.p1_cost?.toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: THEME.muted, marginTop: '2px' }}>{dest.p1_days_income} days income</div>
              </div>
              <div style={{
                background: 'rgba(124,106,239,0.1)',
                border: '1px solid rgba(124,106,239,0.2)',
                borderRadius: '16px',
                padding: '14px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', color: THEME.muted, marginBottom: '4px' }}>Partner 2</div>
                <div style={{ fontSize: '1.4rem', fontWeight: '600', color: THEME.primary }}>{p2sym}{dest.p2_cost?.toLocaleString()}</div>
                <div style={{ fontSize: '10px', color: THEME.muted, marginTop: '2px' }}>{dest.p2_days_income} days income</div>
              </div>
            </div>
            {dest.reality_strip && (
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem', justifyContent: 'center' }}>
                {[
                  { label: dest.reality_strip.crowd, icon: '👥' },
                  { label: dest.reality_strip.weather, icon: '☀️' },
                  { label: dest.reality_strip.fairness, icon: '⚖️' },
                  { label: dest.reality_strip.budget_stretch, icon: '💰' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '100px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    color: THEME.muted,
                    border: `1px solid ${THEME.border}`,
                  }}>
                    {item.icon} {item.label}
                  </div>
                ))}
              </div>
            )}
            <div style={{ borderLeft: `3px solid ${THEME.accent}`, paddingLeft: '14px', fontSize: '12px', color: THEME.muted, lineHeight: '1.6', marginBottom: '1.5rem' }}>
              {dest.savings_scenario}
            </div>
            <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              Planned with Roamie · roamie-nu.vercel.app
            </div>
            <button
              onClick={() => setShowSummary(false)}
              style={{
                width: '100%',
                marginTop: '1.25rem',
                background: 'none',
                border: `1px solid ${THEME.border}`,
                borderRadius: '100px',
                padding: '12px',
                color: THEME.muted,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}