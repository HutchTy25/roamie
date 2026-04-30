import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import posthog from 'posthog-js'
import { supabase } from '../supabase'


function EmailCapture() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const accent = '#FF6B35'

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
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✦</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', marginBottom: '6px', color: 'var(--text-primary)' }}>
        You're in.
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
        We'll keep you posted on new features.
      </div>
    </div>
  )



  return (
    <div style={{
      padding: '2rem 1.5rem',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(255,107,53,0.03)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: accent, marginBottom: '8px', fontWeight: '500' }}>
          Early access
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-primary)' }}>
          Want to be first to know?
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          We're building new features for couples. Drop your email and we'll keep you in the loop.
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', maxWidth: '400px', margin: '0 auto' }}>
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ flex: 1, fontSize: '14px', padding: '12px 16px' }}
        />
        <button
          onClick={submit}
          disabled={loading || !email.includes('@')}
          style={{
            background: accent,
            border: 'none',
            borderRadius: '100px',
            padding: '12px 20px',
            color: '#0a0a0a',
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
  const [loadingBasics, setLoadingBasics] = useState(false)
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

  const accent = '#FF6B35'
  const purple = '#9c7ec4'

  const CURR_SYMBOLS = {
    USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
    NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
    IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
    INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
    KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
    BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
  }

  const CARD_GRADIENTS = [  
    'linear-gradient(135deg, #1a0a05 0%, #2d1408 100%)',
    'linear-gradient(135deg, #05101a 0%, #082038 100%)',
    'linear-gradient(135deg, #0a0514 0%, #1a0a2d 100%)',
    'linear-gradient(135deg, #0a1405 0%, #1a2d08 100%)',
  ]

  const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_KEY
  useEffect(() => {
  if (!data) { navigate('/'); return }
  const params = new URLSearchParams(window.location.search)
  if (params.get('beta') === 'true') {
    localStorage.setItem('roamie_paid', 'true')
  }
  console.log('Saved result:', localStorage.getItem('roamie_last_result') ? 'YES' : 'NO')
  console.log('Location data:', data)
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
    console.log('Trip saved to Supabase')
  } catch (e) {
    console.error('Save trip error:', e)
  }
}
  useEffect(() => {
  if (!loading) return
  const interval = setInterval(() => {
    setMessageIndex(i => (i + 1) % loadingMessages.length)
  }, 2500)
  return () => clearInterval(interval)
}, [loading])

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
  // VISIT MODE — skip AI, just flight prices
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
    // CALL 1 — Get destinations
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

    const destinations = JSON.parse(text1)
    console.log('Call 1 destinations:', destinations.destinations?.map(d => d.name))

    // Get destination names for flight search
    const destNames = destinations.destinations?.map(d => d.name) || []

    // CALL FlightAPI for real prices
    setMessageIndex(2)
    const flightPrices = await fetchRealFlightPrices(destNames)
    console.log('Real flight prices:', flightPrices)

    // CALL 2 — Get full breakdown with real prices
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
    console.log('Visit prices:', prices)

    // Build a simple result structure for visit mode
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
- flights_p1_leg1 = P1 flight from their city to partner city
- flights_p1_leg2 = P1+P2 flight from partner city to destination  
- flights_p1_total = leg1 + leg2
- flights_p2 = P2 flight from their city to destination

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

Return the complete destinations JSON with all fields. Same JSON structure as input but with cost fields added. No markdown, no backticks, no explanation.`
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

  const p1sym = CURR_SYMBOLS[data?.p1?.currency] || ''
const p2sym = CURR_SYMBOLS[data?.p2?.currency] || ''

async function downloadPDF() {
  const element = document.getElementById('roamie-pdf-content')
  if (!element) return

  const canvas = await html2canvas(element, {
    backgroundColor: '#0a0a0a',
    scale: 2,
    useCORS: true,
    allowTaint: true,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
  pdf.save(`Roamie-${dest.name?.replace(/,/g, '').replace(/ /g, '-')}.pdf`)
}

async function fetchTripBasics() {
  if (tripBasics || loadingBasics) return
  setLoadingBasics(true)
  try {
    const res = await fetch('https://roamie-61ib.onrender.com/api/messages', {
      method: 'POST',
      headers: { 
    'Content-Type': 'application/json',
    'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
  },
      body: JSON.stringify({
        destination: dest.name,
        vibe: data?.vibes || [],
        accommodation: data?.accommodation || 'mid',
      })
    })
    const basics = await res.json()
    setTripBasics(basics)
  } catch (e) {
    console.error('Trip basics error:', e)
  } finally {
    setLoadingBasics(false)
  }
}

if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.06) 0%, transparent 70%)',
      padding: '2rem',
    }}>
      <style>{`
        @keyframes pulse { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-8px);opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>

      <div style={{ fontSize: '2.5rem', animation: 'float 3s ease-in-out infinite' }}>✈️</div>

      <div style={{ textAlign: 'center', maxWidth: '300px' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
          Finding your trips...
        </div>
        <div style={{
          fontSize: '14px',
          color: accent,
          minHeight: '24px',
          fontStyle: 'italic',
        }}>
          {loadingMessages[messageIndex]} 
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: accent,
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
          }} />
        ))}
      </div>

      <div style={{
        marginTop: '1rem',
        fontSize: '12px',
        color: 'var(--text-muted)',
        textAlign: 'center',
        maxWidth: '260px',
        lineHeight: '1.6'
      }}>
        Checking real flight routes, currencies, and weather for your exact dates
      </div>
    </div>
  )


  if (error || !result) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem' }}>Something went wrong</div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Couldn't generate recommendations. Try again.</div>
      <button onClick={() => navigate('/quiz')} style={{ marginTop: '1rem', padding: '12px 32px', background: accent, color: '#0a0a0a', borderRadius: '100px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
        Try again
      </button>
    </div>
  )

  const allCards = [...(result.destinations || []), { isStretch: true, ...(result.stretch_goal || {}) }]
  const allCardsLength = allCards.length
  const dest = allCards[activeCard] || {}
  const isStretch = dest.isStretch || false

async function shareTrip() {
  const dest = allCards[activeCard]
  if (!dest || isStretch) return

  const shareText = `✈️ We're thinking ${dest.country_emoji} ${dest.name}!\n\n💰 P1: ${p1sym}${dest.p1_cost?.toLocaleString()}\n💰 P2: ${p2sym}${dest.p2_cost?.toLocaleString()}\n\n${dest.tagline}\n\n🔗 Plan yours free at roamie-nu.vercel.app`

  if (navigator.share) {
    try {
      await navigator.share({
        title: `${dest.name} — Roamie`,
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

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
      `}</style>

      <div
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
  style={{
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    flexDirection: 'column',
    padding: '3rem 1.5rem 2rem',
    position: 'relative',
  }}
>
  {/* Top bar */}
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
    <button
      onClick={() => navigate('/quiz')}
      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
    >
      ← back
    </button>
    <button
  onClick={() => navigate('/dashboard')}
  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: 0 }}
>
  Dashboard →
</button>
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      {allCards.map((_, i) => (
        <div
          key={i}
          onClick={() => { setActiveCard(i); setExpanded(false) }}
          style={{
            width: i === activeCard ? '20px' : '6px',
            height: '6px',
            borderRadius: '3px',
            background: i === activeCard ? accent : 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {activeCard > 0 && (
        <button onClick={() => { setActiveCard(c => c - 1); setExpanded(false) }} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: 'white', cursor: 'pointer', fontSize: '12px' }}>←</button>
      )}
      {activeCard < allCardsLength - 1 && (
        <button onClick={() => { setActiveCard(c => c + 1); setExpanded(false) }} style={{ background: accent, border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#0a0a0a', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}>→</button>
      )}
    </div>
  </div>

  {/* Card label */}
  <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: isStretch ? purple : accent, marginBottom: '0.75rem', fontWeight: '500' }}>
    {isStretch ? '✦ Stretch goal' : activeCard === 0 ? '✦ Best match' : `Option ${activeCard + 1}`}
  </div>

  {/* Photo card at top */}
  <div style={{
    width: '100%',
    height: '220px',
    borderRadius: '20px',
    overflow: 'hidden',
    marginBottom: '1.25rem',
    position: 'relative',
    background: photos[isStretch ? 'stretch' : activeCard]
  ? `url(${photos[isStretch ? 'stretch' : activeCard]}) center 30%/cover no-repeat`
  : CARD_GRADIENTS[activeCard % CARD_GRADIENTS.length],
  }}>
    {/* Gradient overlay on photo */}
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%',
      background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
    }} />
    {/* Reality strip */}
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
      { label: dest.reality_strip.weather, icon: '🌤' },
      { label: dest.reality_strip.fairness, icon: '⚖️' },
      { label: dest.reality_strip.budget_stretch, icon: '💰' },
    ].map(item => (
      <div key={item.label} style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
        borderRadius: '100px',
        padding: '3px 8px',
        fontSize: '10px',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}>
        {item.icon} {item.label}
      </div>
    ))}
  </div>
)}
    {/* Destination name on photo */}
    <div style={{
      position: 'absolute',
      bottom: '1rem',
      left: '1rem',
      right: '1rem',
    }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', lineHeight: '1.1', color: 'white', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
        {dest.country_emoji} {dest.name}
      </div>
    </div>
  </div>

  {/* Tagline */}
  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.25rem', maxWidth: '400px' }}>
    {dest.tagline}
  </div>

  {/* Bottom card */}
  <div style={{
    background: 'rgba(20,20,20,0.95)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '20px',
    padding: '1.25rem',
    border: '1px solid rgba(255,255,255,0.06)',
  }}>

    {/* Cost pills */}
    {!isStretch && (
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.3)', borderRadius: '100px', padding: '8px 14px', fontSize: '13px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '6px' }}>✈️ P1 est.</span>
          <span style={{ color: accent, fontWeight: '500' }}>{p1sym}{dest.p1_cost?.toLocaleString()}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '4px', fontSize: '11px' }}>{dest.p1_days_income}d income</span>
        </div>
        <div style={{ background: 'rgba(156,126,196,0.15)', border: '1px solid rgba(156,126,196,0.3)', borderRadius: '100px', padding: '8px 14px', fontSize: '13px' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)', marginRight: '6px' }}>✈️ P2 est.</span>
          <span style={{ color: purple, fontWeight: '500' }}>{p2sym}{dest.p2_cost?.toLocaleString()}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', marginLeft: '4px', fontSize: '11px' }}>{dest.p2_days_income}d income</span>
        </div>
      </div>
    )}

    {/* Stretch goal content */}
    {isStretch && (
      <div style={{ background: 'rgba(156,126,196,0.1)', border: '1px solid rgba(156,126,196,0.25)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>{dest.what_it_takes}</div>
      </div>
    )}

    {/* Expand button */}
    {!isStretch && (
    <button
  onClick={async () => {
  const isPaid = localStorage.getItem('roamie_paid') === 'true'
  if (isPaid) {
    setExpanded(e => !e)
    if (!expanded) fetchTripBasics()
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
    background: localStorage.getItem('roamie_paid') === 'true' ? 'none' : 'rgba(255,107,53,0.1)',
    border: `1px solid ${localStorage.getItem('roamie_paid') === 'true' ? 'rgba(255,255,255,0.1)' : 'rgba(255,107,53,0.3)'}`,
    borderRadius: '100px',
    padding: '10px 20px',
    color: localStorage.getItem('roamie_paid') === 'true' ? 'rgba(255,255,255,0.7)' : accent,
    fontSize: '13px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginBottom: expanded ? '1rem' : '0',
    transition: 'all 0.2s',
    display: 'block',
  }}
>
  {expanded ? 'Less details ↑' : localStorage.getItem('roamie_paid') === 'true' ? 'More details ↓' : '🔓 Unlock full breakdown — $3.99'}
</button>  
    )}

{/* Expanded details */}
    {expanded && !isStretch && (
      <div style={{ animation: 'fadeSlideUp 0.3s ease', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', marginTop: '1rem' }}>

        {dest.cost_breakdown && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '1.25rem' }}>
            {[
              { label: 'P1 Leg 1', value: dest.cost_breakdown.flights_p1_leg1 || dest.cost_breakdown.flights_p1, icon: '✈️', sym: p1sym, color: accent },
              { label: 'P1 Leg 2', value: dest.cost_breakdown.flights_p1_leg2 || null, icon: '✈️', sym: p1sym, color: accent },
              { label: 'P2 Flight', value: dest.cost_breakdown.flights_p2, icon: '✈️', sym: p2sym, color: purple },
              { label: 'Lodging', value: dest.cost_breakdown.lodging_total, icon: '🏨', sym: '$', color: 'rgba(255,255,255,0.85)' },
              { label: 'Food', value: dest.cost_breakdown.food_total, icon: '🍽️', sym: '$', color: 'rgba(255,255,255,0.85)' },
              { label: 'Activities', value: dest.cost_breakdown.activities_total, icon: '🎯', sym: '$', color: 'rgba(255,255,255,0.85)' },
            ].filter(item => item.value != null).map(item => (
              <div key={item.label} style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 4px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: '14px', marginBottom: '3px' }}>{item.icon}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '11px', color: item.color, fontWeight: '500' }}>{item.sym}{item.value?.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {dest.lodging_note && (
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '10px', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
            🏨 {dest.lodging_note}
          </div>
        )}

        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.7', marginBottom: '1rem' }}>
          {dest.why_it_works}
        </div>

        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
          ✈ {dest.routing_note}
        </div>

        {dest.safety_note && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
            🛡️ {dest.safety_note}
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>
          🌤 {dest.season_note}
        </div>

        <div style={{ borderLeft: `2px solid ${accent}`, paddingLeft: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: '1.6', marginBottom: '1rem' }}>
          {dest.savings_scenario}
        </div>

        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '1.5rem' }}>
          {dest.fairness_note}
        </div>

        {/* Trip Basics */}
        {loadingBasics && (
          <div style={{ textAlign: 'center', padding: '1rem', fontSize: '13px', color: 'var(--text-muted)' }}>
            Loading trip basics...
          </div>
        )}

        {tripBasics && !loadingBasics && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, marginBottom: '1rem', fontWeight: '500' }}>
              ✦ Trip basics
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>✈️ Getting there</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginBottom: '6px' }}>{tripBasics.airport?.name}</div>
              {tripBasics.airport?.transport_options?.map(t => (
                <div key={t.method} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>
                  <span>{t.method}</span>
                  <span>{t.cost} · {t.time}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🚗 Getting around</div>
              {tripBasics.getting_around?.map(g => (
                <div key={g.method} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>
                  <span>{g.method}</span>
                  <span style={{ color: g.recommended ? accent : 'rgba(255,255,255,0.4)' }}>{g.avg_cost}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>📍 Where to stay</div>
              <div style={{ fontSize: '13px', color: accent, marginBottom: '4px', fontWeight: '500' }}>{tripBasics.neighborhood?.name}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{tripBasics.neighborhood?.why}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🏨 Stay options</div>
              {tripBasics.stays?.map(s => (
                <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  <span>{s.name} <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {s.type}</span></span>
                  <span style={{ color: accent }}>{s.price_range}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🍽️ Where to eat</div>
              {tripBasics.restaurants?.map(r => (
                <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                  <span>{r.name} <span style={{ color: 'rgba(255,255,255,0.3)' }}>· {r.cuisine}</span></span>
                  <span>{r.price}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>🛒 Essentials nearby</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>🛍️ {tripBasics.essentials?.grocery}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '3px' }}>💊 {tripBasics.essentials?.pharmacy}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>🏪 {tripBasics.essentials?.convenience}</div>
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/quiz')}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '100px', padding: '10px 24px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer' }}
        >
          Plan another trip
        </button>
      </div>
    )}

    {/* Share + Swipe */}
    {!expanded && (
      <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
        {!isStretch && (
          <>
            <button
              onClick={shareTrip}
              style={{
                background: 'rgba(255,107,53,0.15)',
                border: '1px solid rgba(255,107,53,0.3)',
                borderRadius: '100px',
                padding: '10px 24px',
                color: accent,
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.2s',
              }}
            >
              Share this trip ✈️
            </button>
            <button
              onClick={() => setShowSummary(true)}
              style={{
                background: 'rgba(156,126,196,0.15)',
                border: '1px solid rgba(156,126,196,0.3)',
                borderRadius: '100px',
                padding: '10px 24px',
                color: purple,
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                width: '100%',
                transition: 'all 0.2s',
              }}
            >
              Save summary card 📸
            </button>
          <button
  onClick={saveTripToSupabase}
  disabled={tripSaved}
  style={{
    background: tripSaved ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${tripSaved ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: '100px',
    padding: '10px 24px',
    color: tripSaved ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: tripSaved ? 'default' : 'pointer',
    width: '100%',
    transition: 'all 0.2s',
  }}
>
  {tripSaved ? '✓ Saved to dashboard' : '💾 Save to dashboard'}
</button>
          </>
        )}
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          swipe to explore ←→
        </div>
      </div>
    )}

  </div>
</div>

{/* Couple summary */}
{result.couple_summary && (
  <div style={{ padding: '1.5rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7', textAlign: 'center' }}>
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
    background: 'rgba(0,0,0,0.85)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  }}
    onClick={() => setShowSummary(false)}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: '#111',
        borderRadius: '24px',
        padding: '2rem',
        width: '100%',
        maxWidth: '360px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '13px', color: accent, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>✦ Roamie</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', lineHeight: '1.1', marginBottom: '8px' }}>
          {dest.country_emoji} {dest.name}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          {dest.tagline}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
        <div style={{ background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Partner 1</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '600', color: accent }}>{p1sym}{dest.p1_cost?.toLocaleString()}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{dest.p1_days_income} days income</div>
        </div>
        <div style={{ background: 'rgba(156,126,196,0.1)', border: '1px solid rgba(156,126,196,0.2)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>Partner 2</div>
          <div style={{ fontSize: '1.3rem', fontWeight: '600', color: purple }}>{p2sym}{dest.p2_cost?.toLocaleString()}</div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{dest.p2_days_income} days income</div>
        </div>
      </div>
      {dest.reality_strip && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '1.25rem', justifyContent: 'center' }}>
          {[
            { label: dest.reality_strip.crowd, icon: '👥' },
            { label: dest.reality_strip.weather, icon: '🌤' },
            { label: dest.reality_strip.fairness, icon: '⚖️' },
            { label: dest.reality_strip.budget_stretch, icon: '💰' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '100px',
              padding: '4px 10px',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.6)',
            }}>
              {item.icon} {item.label}
            </div>
          ))}
        </div>
      )}
      <div style={{ borderLeft: `2px solid ${accent}`, paddingLeft: '12px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
        {dest.savings_scenario}
      </div>
      <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
        Planned with Roamie · roamie-nu.vercel.app
      </div>
      <button
        onClick={() => setShowSummary(false)}
        style={{ width: '100%', marginTop: '1.25rem', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer' }}
      >
        Close
      </button>
    </div>
  </div>
)}

    </div>
  )
}    