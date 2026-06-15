import { useLocation, useNavigate } from 'react-router-dom'
import { generateAffiliateLink } from '../utils/affiliateLinks'
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

function cleanDestName(name) {
  return name?.replace(/^[A-Z]{2,3}\s+/, '') ?? ''
}

const COL_INDEX_CLIENT = {
  'NYC': 100.0, 'HNL': 98.2, 'SFO': 97.6, 'SEA': 90.3, 'LAX': 81.5,
  'MIA': 79.5, 'ORD': 76.0, 'ATL': 75.3, 'DEN': 75.1, 'DFW': 72.9,
  'PHX': 71.6, 'MSP': 71.5, 'BNA': 70.3, 'CLT': 69.8, 'MCO': 69.0,
  'IND': 69.0, 'YYJ': 68.7, 'MEM': 64.2, 'YVR': 62.7, 'YTO': 61.4,
  'YYC': 61.0, 'IAH': 60.6, 'SAT': 58.8, 'YUL': 58.4, 'YEG': 58.3,
  'CVG': 54.6, 'ZRH': 118.5, 'GVA': 116.5, 'OSL': 90.2, 'TLV': 91.4,
  'LHR': 87.5, 'SIN': 87.7, 'CPH': 85.7, 'AMS': 82.6, 'CDG': 78.6,
  'ARN': 78.6, 'DUB': 76.7, 'MUC': 76.1, 'FRA': 74.0, 'VIE': 73.9,
  'BRU': 73.5, 'MXP': 73.1, 'EDI': 73.0, 'HAM': 71.9, 'MAN': 70.0,
  'TXL': 70.0, 'FLR': 69.5, 'GOT': 68.7, 'BHX': 68.6, 'GLA': 67.8,
  'HKG': 75.2, 'ICN': 68.2, 'SYD': 75.1, 'CBR': 71.2, 'MEL': 70.8,
  'DXB': 58.0, 'AUH': 52.6, 'NRT': 51.1, 'BNE': 57.5, 'WLG': 59.3,
  'AKL': 59.1, 'CHC': 55.0, 'LIS': 54.5, 'TLL': 52.7, 'FCO': 51.0,
  'BCN': 50.6, 'MAD': 48.9, 'OPO': 50.2
}

function getCOLIndex(iata) {
  return COL_INDEX_CLIENT[iata] || 65
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

export default function Results({ profile }) {
  const location = useLocation()
  const navigate = useNavigate()
  const location_data = location.state?.data
  const savedDataStr = localStorage.getItem('roamie_last_data')
  const data = location_data || (savedDataStr ? (() => { try { return JSON.parse(savedDataStr) } catch { return null } })() : null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [paywallHit, setPaywallHit] = useState(false)
  const [userId, setUserId] = useState(null)
  const [pendingUpgradePlan, setPendingUpgradePlan] = useState(null)
  const isPro = profile?.is_pro || localStorage.getItem('roamie_paid') === 'true'
  const [activeCard, setActiveCard] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [photos, setPhotos] = useState({})
  const [messageIndex, setMessageIndex] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [tripBasics, setTripBasics] = useState(null)
  const [tripSaved, setTripSaved] = useState(false)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [signupExpandGate, setSignupExpandGate] = useState(false)
  const [empathyExpanded, setEmpathyExpanded] = useState(false)
  const [cancelToast, setCancelToast] = useState(false)
  const [partialResult, setPartialResult] = useState(null)
  const [proExpandGate, setProExpandGate] = useState(false)
  const [flightLoadProgress, setFlightLoadProgress] = useState(0)
  const [didYouKnowIndex, setDidYouKnowIndex] = useState(0)
  const fetchedPhotos = useRef(new Set())
  const costsLoading = !!partialResult && !result

  const loadingMessages = [
    "Checking flight routes from both cities...",
    "Comparing currencies and budgets...",
    "Finding hidden gems for your vibe...",
    "Checking weather for your dates...",
    "Calculating fairness between partners...",
    "Almost there — building your breakdown...",
  ]
  const DID_YOU_KNOW = [
    "Did you know? Roamie was built by a solo developer in a long distance relationship 🌍",
    "Did you know? Roamie searches flights from both your cities at the same time",
    "Did you know? Roamie shows your trip cost in both partners' currencies automatically",
    "Did you know? Roamie's Sanctuary destinations are chosen based on purchasing power for both partners",
    "Did you know? Roamie was built for couples like yours — apart but planning the next reunion",
    "Did you know? Roamie uses live flight data from 300+ airlines worldwide",
  ]
  const startX = useRef(null)

  const CURR_SYMBOLS = {
    USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
    NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
    IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
    INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
    KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
    BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
    TWD: 'NT$', HKD: 'HK$', CHF: 'CHF', SEK: 'kr', NOK: 'kr',
    DKK: 'kr', PLN: 'zł', CZK: 'Kč', TRY: '₺', ILS: '₪',
    HUF: 'Ft', RON: 'lei',
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id)
      }
    })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('cancelled') === 'true') {
      setCancelToast(true)
      const t = setTimeout(() => setCancelToast(false), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    if (userId && pendingUpgradePlan) {
      setPendingUpgradePlan(null)
      startCheckout(pendingUpgradePlan)
    }
  }, [userId, pendingUpgradePlan])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const isCancelled = params.get('cancelled') === 'true'

    if (!data) {
      // data is already the localStorage fallback (line 158); if still null, nothing to restore
      navigate(isCancelled ? '/quiz' : '/')
      return
    }

    const plan = location.state?.plan || params.get('plan')
    const trigger = location.state?.triggerUpgrade || params.get('triggerUpgrade') === 'true'
    if (trigger && plan) setPendingUpgradePlan(plan)

    const savedResult = localStorage.getItem('roamie_last_result')
    if (savedResult) {
      setResult(JSON.parse(savedResult))
      setLoading(false)
      localStorage.removeItem('roamie_last_result')
    } else if (data.p1?.city && data.p2?.city) {
      fetchRecommendations()
    } else {
      navigate('/quiz', { state: { message: "Let's find your next trip" } })
    }
  }, [])

  useEffect(() => {
    const r = result || partialResult
    if (!r) return
    r.destinations?.forEach((dest, i) => {
      if (!fetchedPhotos.current.has(i)) {
        fetchedPhotos.current.add(i)
        fetchPhoto(dest.name, i)
      }
    })
    if (r.stretch_goal?.name && !fetchedPhotos.current.has('stretch')) {
      fetchedPhotos.current.add('stretch')
      fetchPhoto(r.stretch_goal.name, 'stretch')
    }
  }, [result, partialResult])

  useEffect(() => {
    setTripBasics(null)
    setExpanded(false)
    setTripSaved(false)
    setSignupExpandGate(false)
    setEmpathyExpanded(false)
    setProExpandGate(false)
  }, [activeCard])

  useEffect(() => {
    if (!tripSaved) return
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (!isStandalone && !localStorage.getItem('roamie_install_prompted')) {
      setShowInstallBanner(true)
    }
  }, [tripSaved])

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

  useEffect(() => {
    if (!costsLoading) return
    const interval = setInterval(() => {
      setDidYouKnowIndex(i => (i + 1) % DID_YOU_KNOW.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [costsLoading])

  async function startCheckout(plan) {
    if (!userId) {
      localStorage.setItem('roamie_upgrade_intent', plan)
      localStorage.setItem('roamie_last_result', JSON.stringify(result))
      localStorage.setItem('roamie_last_data', JSON.stringify(data))
      navigate('/login')
      return
    }
    try {
      localStorage.setItem('roamie_last_result', JSON.stringify(result))
      localStorage.setItem('roamie_last_data', JSON.stringify(data))
      const res = await fetch('https://roamie-61ib.onrender.com/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, mode: 'subscription', userId }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (e) {
      console.error('Checkout error:', e)
    }
  }

async function saveTripToSupabase() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('couple_id')
        .eq('id', session.user.id)
        .single()
      const activeDestination = allCards[activeCard]
      await supabase.from('trips').insert({
        user_id: session.user.id,
        couple_id: profile?.couple_id || null,
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
        destination_name: activeDestination.name,
        p1_cost: activeDestination.p1_cost,
        p2_cost: activeDestination.p2_cost,
        country_emoji: activeDestination.country_emoji,
        tagline: activeDestination.tagline,
        destinations: [activeDestination],
        stretch_goal: result?.stretch_goal ?? partialResult?.stretch_goal,
      })
      setTripSaved(true)
      posthog.capture('trip_saved', { archetype: activeDestination.archetype, destination: activeDestination.name })
    } catch (e) {
      console.error('Save trip error:', e)
    }
  }

function handleTouchStart(e) {
    startX.current = e.touches[0].clientX
    startX.startY = e.touches[0].clientY
  }

function handleTouchEnd(e) {
    if (!startX.current) return
    const diffX = startX.current - e.changedTouches[0].clientX
    const diffY = startX.startY - e.changedTouches[0].clientY
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY) * 2) {
      if (!expanded) {
        if (diffX > 0) {
          const next = Math.min(activeCard + 1, allCardsLength - 1)
          setActiveCard(next)
          posthog.capture('card_viewed', { archetype: allCards[next]?.archetype, card_index: next, destination: allCards[next]?.name })
        } else {
          const next = Math.max(activeCard - 1, 0)
          setActiveCard(next)
          posthog.capture('card_viewed', { archetype: allCards[next]?.archetype, card_index: next, destination: allCards[next]?.name })
        }
      }
    }
    startX.current = null
  }

async function fetchRecommendations() {
  if (data.tripMode === 'visit') {
    await fetchVisitPrices()
    return
  }

  const { data: { session: limitSession } } = await supabase.auth.getSession()
  if (limitSession && !isPro) {
    const tripCount = parseInt(localStorage.getItem('roamie_trip_count') || '0', 10)
    if (tripCount >= 3) {
      setLoading(false)
      setPaywallHit(true)
      return
    }
  }

  const p1sym = CURR_SYMBOLS[data.p1.currency] || data.p1.currency
  const p2sym = CURR_SYMBOLS[data.p2.currency] || data.p2.currency

  const destinationPrompt = `You are Roamie, a couples travel planner. Assign exactly one destination to each of three archetypes: Sanctuary, Odyssey, and Horizon.

PURCHASING POWER CONTEXT (use this to guide archetype assignment):
- Partner 1 home city: ${data.p1.city} | Cost of Living Index: ${getCOLIndex(data.p1.iata)}
- Partner 2 home city: ${data.p2.city} | Cost of Living Index: ${getCOLIndex(data.p2.iata)}
- A destination with COL significantly below both indices = Sanctuary territory
- A destination with COL above both indices = Odyssey territory
- A destination with COL between or near both indices = Horizon territory

Archetype definitions:
- Sanctuary: MUST be a purchasing power haven for BOTH partners. The destination COL must be meaningfully lower than both home cities — costs feel lighter than home for both people. Think beach towns, Southeast Asia, Southern Europe, affordable coastal cities. This is financial breathing room + relaxation combined. Never pick an expensive city for Sanctuary.
- Odyssey: Adventure, culture, activities. COL can be higher — the financial stretch is part of the adventure. It's okay if this destination costs more than home for one or both partners. The experience justifies it. Museums, hikes, street food, nightlife, high engagement.
- Horizon: The balanced middle. COL should be roughly comparable to or slightly below both partners' home cities. Neither a financial stretch nor a steal — comfortable and fair for both. The destination surprises them with both rest and exploration without breaking the bank.

PARTNER DETAILS:
- Partner 1: Lives in ${data.p1.city} | Currency: ${data.p1.currency} (${p1sym}) | Max budget: ${p1sym}${data.p1.maxSpend.toLocaleString()} TOTAL
- Partner 2: Lives in ${data.p2.city} | Currency: ${data.p2.currency} (${p2sym}) | Max budget: ${p2sym}${data.p2.maxSpend.toLocaleString()} TOTAL
- Travel dates: ${data.dates.from} to ${data.dates.to}
- Vibes: ${data.vibes?.join(', ') || 'open to anything'}
- Vibe context: foodie = culinary-focused destinations with great food scenes; nightlife = vibrant bars and clubs scene; history = heritage sites and ancient landmarks; winter = alpine/ski/snow destinations; wellness = spa, retreat, and slow-travel focused
- Routing: ${data.routing}
- Accommodation: ${data.accommodation}
- Region: ${data.region}

Return ONLY this JSON, no markdown, no explanation:
{
  "destinations": {
    "sanctuary": {
      "name": "City, Country",
      "iata": "LIS",
      "country_emoji": "🇵🇹",
      "tagline": "One warm sentence why this is their sanctuary",
      "archetype_vibe": "Pure Shared Time & Relaxation",
      "emotional_justification": "One sentence on why this archetype fits this couple specifically",
      "why_both": "One sentence on why this works for both partners given their cities and budgets",
      "vibes": ["relaxed", "coastal"],
      "best_months": ["Apr", "May"],
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
    },
    "odyssey": {
      "name": "City, Country",
      "iata": "BCN",
      "country_emoji": "🇪🇸",
      "tagline": "One warm sentence why this is their odyssey",
      "archetype_vibe": "Adventure & Discovery",
      "emotional_justification": "One sentence on why this archetype fits this couple specifically",
      "why_both": "One sentence on why this works for both partners given their cities and budgets",
      "vibes": ["adventure", "culture"],
      "best_months": ["Jun", "Sep"],
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
    },
    "horizon": {
      "name": "City, Country",
      "iata": "DUB",
      "country_emoji": "🇮🇪",
      "tagline": "One warm sentence why this is their horizon",
      "archetype_vibe": "The Best of Both",
      "emotional_justification": "One sentence on why this archetype fits this couple specifically",
      "why_both": "One sentence on why this works for both partners given their cities and budgets",
      "vibes": ["relaxed", "culture"],
      "best_months": ["May", "Jun"],
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
  },
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

    const { data: { session: s1 } } = await supabase.auth.getSession()
    const authHeaders = {
      'Content-Type': 'application/json',
      ...(s1?.access_token ? { 'Authorization': `Bearer ${s1.access_token}` } : {}),
    }
    const res1 = await fetch('https://roamie-61ib.onrender.com/api/messages', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3500,
        messages: [{ role: 'user', content: destinationPrompt }]
      })
    })

    const raw1 = await res1.text()
    const json1 = JSON.parse(raw1)
    const text1 = Array.isArray(json1.content)
      ? json1.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
      : raw1.replace(/```json|```/g, '').trim()

    const firstPassResult = JSON.parse(text1)
    if (firstPassResult.destinations && !Array.isArray(firstPassResult.destinations)) {
      firstPassResult.destinations = ['sanctuary', 'odyssey', 'horizon']
        .map(key => ({ archetype: key, ...firstPassResult.destinations[key] }))
        .filter(d => d.name)
    }
    const destNames = firstPassResult.destinations?.map(d => ({ name: d.name, iata: d.iata })) || []

    // Show cards immediately — costs will fill in after Call 2
    setPartialResult(firstPassResult)
    setLoading(false)

    setMessageIndex(2)
    setFlightLoadProgress(40)
    const progressTimer = setTimeout(() => setFlightLoadProgress(75), 2000)
    const flightPrices = await fetchRealFlightPrices(destNames)
    clearTimeout(progressTimer)
    if (flightPrices === null) return

    setFlightLoadProgress(100)
    setTimeout(() => setFlightLoadProgress(0), 400)

    // Flight prices now include pre-computed cost_breakdown fields — merge onto
    // partialResult immediately so flight costs appear before Call 2 finishes
    const enrichedDests = (firstPassResult.destinations || []).map(dest => ({
      ...dest,
      ...(flightPrices[dest.iata] || {}),
    }))
    setPartialResult({ ...firstPassResult, destinations: enrichedDests })

    setMessageIndex(4)
    const breakdownPrompt = buildBreakdownPrompt(firstPassResult, flightPrices, p1sym, p2sym)

    const { data: { session: s2 } } = await supabase.auth.getSession()
    const authHeaders2 = {
      'Content-Type': 'application/json',
      ...(s2?.access_token ? { 'Authorization': `Bearer ${s2.access_token}` } : {}),
    }
    const res2 = await fetch('https://roamie-61ib.onrender.com/api/messages', {
      method: 'POST',
      headers: authHeaders2,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: breakdownPrompt }],
        flightPrices,
        quizData: {
          p1: { city: data.p1.city, currency: data.p1.currency, maxSpend: data.p1.maxSpend },
          p2: { city: data.p2.city, currency: data.p2.currency, maxSpend: data.p2.maxSpend },
          dates: data.dates,
        },
      })
    })

    const raw2 = await res2.text()
    const json2 = JSON.parse(raw2)
    const text2 = Array.isArray(json2.content)
      ? json2.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
      : raw2.replace(/```json|```/g, '').trim()

    const fullResult = JSON.parse(text2)
    const secondPassDests = Array.isArray(fullResult) ? fullResult : (fullResult.destinations || [])
    const mergedDestinations = enrichedDests.map((enriched, i) => {
      const second = secondPassDests[i] || {}
      if (enriched.iata && second.iata && enriched.iata !== second.iata) {
        console.warn(`[merge mismatch] position ${i}: Call 1 iata=${enriched.iata}, Call 2 iata=${second.iata}`)
      }
      return {
        ...enriched,
        ...second,
        cost_breakdown: {
          ...enriched.cost_breakdown,
          ...second.cost_breakdown,
        },
      }
    })
    const mergedResult = { ...firstPassResult, destinations: mergedDestinations }
    setResult(mergedResult)
    setPartialResult(null)
    localStorage.setItem('roamie_trip_count', String(parseInt(localStorage.getItem('roamie_trip_count') || '0', 10) + 1))

  } catch (e) {
    console.error('Error:', e)
    setError(true)
    setResult(firstPassResult)
    setPartialResult(null)
  } finally {
    setLoading(false)
  }
}

  function dismissInstallBanner() {
    localStorage.setItem('roamie_install_prompted', 'true')
    setShowInstallBanner(false)
  }

  async function fetchVisitPrices() {
    try {
      const { data: { session: visitSession } } = await supabase.auth.getSession()
      const visitAuthHeaders = {
        'Content-Type': 'application/json',
        ...(visitSession?.access_token ? { 'Authorization': `Bearer ${visitSession.access_token}` } : {}),
      }
      const res = await fetch('https://roamie-61ib.onrender.com/api/flight-prices', {
        method: 'POST',
        headers: visitAuthHeaders,
        body: JSON.stringify({
          p1City: data.p1.city,
          p2City: data.p2.city,
          p1Iata: data.p1.iata || '',
          p2Iata: data.p2.iata || '',
          destinations: [data.p2.city, data.p1.city],
          dates: `${data.dates.from} to ${data.dates.to}`,
          routing: 'meet',
          sameCity: false,
          userId: userId || undefined,
        })
      })
      if (res.status === 402) { setPaywallHit(true); return }
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
      localStorage.setItem('roamie_trip_count', String(parseInt(localStorage.getItem('roamie_trip_count') || '0', 10) + 1))
    } catch (e) {
      console.error('Visit prices error:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  async function fetchRealFlightPrices(destNames) {
    try {
      const { data: { session: flightSession } } = await supabase.auth.getSession()
      const flightAuthHeaders = {
        'Content-Type': 'application/json',
        ...(flightSession?.access_token ? { 'Authorization': `Bearer ${flightSession.access_token}` } : {}),
      }
      const res = await fetch('https://roamie-61ib.onrender.com/api/flight-prices', {
        method: 'POST',
        headers: flightAuthHeaders,
        body: JSON.stringify({
  p1City: data.p1.city,
  p2City: data.p2.city,
  p1Iata: data.p1.iata || '',
  p2Iata: data.p2.iata || '',
  destinations: destNames,
  dates: `${data.dates.from} to ${data.dates.to}`,
  routing: data.routing,
  sameCity: data.sameCity,
  userId: userId || undefined,
  p1Currency: data.p1.currency,
  p2Currency: data.p2.currency,
  p1Budget: data.p1.maxSpend,
  p2Budget: data.p2.maxSpend,
  syncArrival: data.syncArrival || false,
})
      })
      if (res.status === 402) { setPaywallHit(true); return null }
      return await res.json()
    } catch (e) {
      console.error('Flight price fetch error:', e)
      return {}
    }
  }

  function buildBreakdownPrompt(destinations, flightPrices, p1sym, p2sym) {
    const flightContext = (destinations?.destinations || []).map(d => {
      const prices = flightPrices[d.iata] || {}
      return `${d.name}:
  - P1 total round trip from ${data.p1.city}: ${prices.p1 ? prices.p1 : 'estimate needed'} USD
  - P1 breakdown: leg1 (${data.p1.city}→${data.p2.city}): ${prices.p1_breakdown?.leg1 || 'N/A'} USD, leg2 (${data.p2.city}→destination): ${prices.p1_breakdown?.leg2 || 'N/A'} USD
  - P2 total round trip from ${data.p2.city}: ${prices.p2 ? prices.p2 : 'estimate needed'} USD`
    }).join('\n')

    const nights = data.dates.from && data.dates.to
      ? Math.max(1, Math.round((new Date(data.dates.to) - new Date(data.dates.from)) / 86400000))
      : 5

    const pricingGuidance = (destinations?.destinations || []).map(dest => `- Destination: ${dest.name} | Cost of Living Index: ${getCOLIndex(dest.iata)} (NYC = 100)
- Accommodation type requested: ${data.accommodation}
- Trip duration: ${nights} nights
- Budget context: P1 max spend ${data.p1.maxSpend.toLocaleString()} ${data.p1.currency}, P2 max spend ${data.p2.maxSpend.toLocaleString()} ${data.p2.currency}`).join('\n\n')

    return `You are a travel expert. Return a JSON array with one object per destination. Raw JSON only — no markdown, no backticks, no explanation, nothing before or after the array.

TRIP CONTEXT:
- Partner 1: ${data.p1.city} | ${data.p1.currency} | Budget ${p1sym}${data.p1.maxSpend.toLocaleString()}
- Partner 2: ${data.p2.city} | ${data.p2.currency} | Budget ${p2sym}${data.p2.maxSpend.toLocaleString()}
- Dates: ${data.dates.from} to ${data.dates.to}
- Accommodation: ${data.accommodation}

FLIGHT PRICES (use for routing_note context only):
${flightContext}

DESTINATIONS:
${(destinations?.destinations || []).map(d => d.name).join('\n')}

PRICING GUIDANCE (use these to anchor your estimates):
${pricingGuidance}

Use the COL index to calibrate your estimates:
- COL 40-55 (budget destinations like Lisbon, Porto, Bangkok): lodging $40-90/night, food $25-45/day
- COL 55-75 (mid-range like Prague, Barcelona, Dublin): lodging $80-160/night, food $40-70/day
- COL 75-90 (expensive like Amsterdam, Paris, Sydney): lodging $140-250/night, food $60-90/day
- COL 90+ (premium like London, NYC, Zurich): lodging $200-400/night, food $80-120/day

Scale within these ranges based on accommodation type: hostel/budget = lower end, hotel = mid, luxury = upper end.
All values in USD.

Return a JSON array where each object matches this exact shape:
[
  {
    "name": "<destination name exactly as listed above>",
    "iata": "<3-letter IATA code>",
    "cost_breakdown": {
      "lodging_per_night": 120,
      "food_per_day": 55,
      "activities_total": 180
    },
    "lodging_note": "Specific hotel name, neighbourhood, and price per night",
    "routing_note": "Airlines and approximate flight times for both partners",
    "fairness_note": "One sentence on whether this trip costs each partner a fair share of their budget",
    "savings_scenario": "Narrative advice on how this couple could save for this trip — no numbers or calculations",
    "trip_basics": {
      "neighborhood": { "name": "Area name", "why": "Why stay here" },
      "getting_around": [
        { "method": "Metro", "avg_cost": "$2/ride", "recommended": true },
        { "method": "Taxi", "avg_cost": "$15 avg", "recommended": false }
      ],
      "restaurants": [
        { "name": "Restaurant name", "cuisine": "Cuisine type", "price": "$$" },
        { "name": "Restaurant name", "cuisine": "Cuisine type", "price": "$" }
      ],
      "stay_tip": "One sentence on the best area to book accommodation"
    }
  }
]

All cost_breakdown values are plain USD numbers. Return ONLY the JSON array. Start your response with [ and end with ].`
  }

  async function fetchPhoto(cityName, index) {
    try {
      const city = cityName.split(',')[0].trim()
      const res = await fetch(`https://roamie-61ib.onrender.com/api/photo?city=${encodeURIComponent(city)}`)
      const json = await res.json()
      if (json.url) {
        setPhotos(prev => ({ ...prev, [index]: json.url }))
      }
    } catch (e) {
    }
  }


  async function shareTrip() {
    const currentDest = allCards[activeCard]
    if (!currentDest || currentDest.isStretch) return

    const shareText = `✈️ We're thinking ${currentDest.country_emoji} ${cleanDestName(currentDest.name)}!\n\n💰 P1: ${p1sym}${currentDest.p1_cost?.toLocaleString()}\n💰 P2: ${p2sym}${currentDest.p2_cost?.toLocaleString()}\n\n${currentDest.tagline}\n\n🔗 Plan yours free at roamietravel.app`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${cleanDestName(currentDest.name)} — Roamie`,
          text: shareText,
        })
      } catch (e) {
      }
    } else {
      navigator.clipboard.writeText(shareText)
      alert('Copied to clipboard!')
    }
  }

  const p1sym = CURR_SYMBOLS[data?.p1?.currency] || ''
  const p2sym = CURR_SYMBOLS[data?.p2?.currency] || ''

  const displayResult = result || partialResult

  // LOADING STATE
  if (loading && !partialResult) return (
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

  // PAYWALL STATE
  if (paywallHit) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '2rem', background: THEME.bg, textAlign: 'center' }}>
      <Starfield />
      <div style={{ fontSize: '40px', position: 'relative', zIndex: 1 }}>🔒</div>
      <h2 style={{ fontSize: '22px', fontWeight: '700', color: THEME.text, margin: 0, position: 'relative', zIndex: 1 }}>You've used your free searches</h2>
      <p style={{ fontSize: '14px', color: THEME.muted, margin: 0, maxWidth: '280px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>Upgrade to Roamie Pro to keep planning trips together.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px', position: 'relative', zIndex: 1 }}>
        <button
          onClick={() => startCheckout('founding')}
          style={{ padding: '14px', background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`, border: 'none', borderRadius: '14px', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: `0 0 24px rgba(244,114,182,0.3)` }}
        >
          Join Roamie Pro — $5.99/couple/month
        </button>
      </div>
    </div>
  )

  // ERROR STATE
  if (error || !displayResult) return (
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

  const allCards = [...(displayResult.destinations || []), { isStretch: true, ...(displayResult.stretch_goal || {}) }]
  const allCardsLength = allCards.length
  const dest = allCards[activeCard] || {}
  const isStretch = dest.isStretch || false

  // MAIN RESULTS VIEW
  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', background: THEME.bg }}>
      <Starfield />
      {cancelToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#16A34A',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '100px',
          fontSize: '14px',
          fontWeight: '500',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 9999,
        }}>
          No worries — you can upgrade anytime 👋
        </div>
      )}
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.8} }
        @keyframes skeletonPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes progressFill { from{width:0%} to{width:95%} }
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
              onClick={() => {
                setActiveCard(i)
                setExpanded(false)
                posthog.capture('card_viewed', { archetype: allCards[i]?.archetype, card_index: i, destination: allCards[i]?.name })
              }}
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
          {isStretch ? '✦ Stretch goal' : dest.archetype === 'sanctuary' ? '🌿 Sanctuary' : dest.archetype === 'odyssey' ? '⚡ Odyssey' : dest.archetype === 'horizon' ? '🌅 Horizon' : `Option ${activeCard + 1}`}
        </div>

        {/* ======================== */}
        {/* PREMIUM DESTINATION CARD */}
        {/* ======================== */}
        <div key={activeCard} style={{
          width: '100%',
          borderRadius: '24px',
          overflow: 'hidden',
          marginBottom: '1.25rem',
          position: 'relative',
          boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${isStretch ? 'rgba(124,106,239,0.15)' : 'rgba(244,114,182,0.15)'}`,
          animation: 'fadeSlideUp 0.4s ease both',
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
                {/* Fairness chip — static on Sanctuary, tappable on Odyssey/Horizon */}
                {dest.archetype === 'sanctuary' || !dest.cost_breakdown?.empathy_mirror ? (
                  <div style={{ background: 'rgba(30,32,48,0.85)', backdropFilter: 'blur(12px)', borderRadius: '100px', padding: '4px 10px', fontSize: '10px', color: THEME.text, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', border: `1px solid ${THEME.border}` }}>
                    ⚖️ {dest.reality_strip.fairness}
                  </div>
                ) : (
                  <div
                    onClick={() => setEmpathyExpanded(e => !e)}
                    style={{ background: empathyExpanded ? 'rgba(244,114,182,0.18)' : 'rgba(30,32,48,0.85)', backdropFilter: 'blur(12px)', borderRadius: '100px', padding: '4px 10px', fontSize: '10px', color: empathyExpanded ? THEME.accent : THEME.text, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', border: `1px solid ${empathyExpanded ? 'rgba(244,114,182,0.5)' : THEME.border}`, cursor: 'pointer', userSelect: 'none' }}
                  >
                    ⚖️ Fairness {empathyExpanded ? '▲' : '▼'}
                  </div>
                )}
                <div style={{ background: 'rgba(30,32,48,0.85)', backdropFilter: 'blur(12px)', borderRadius: '100px', padding: '4px 10px', fontSize: '10px', color: THEME.text, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap', border: `1px solid ${THEME.border}` }}>
                  💰 {dest.reality_strip.budget_stretch}
                </div>
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
                {dest.country_emoji} {cleanDestName(dest.name)}
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

            {/* Loading progress bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '3px',
              overflow: 'hidden',
              opacity: costsLoading ? 1 : 0,
              transition: 'opacity 0.5s ease',
              pointerEvents: 'none',
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #7C6AEF, #F472B6)',
                width: flightLoadProgress + '%',
                transition: flightLoadProgress === 0 ? 'none' : 'width 1.5s ease-out',
              }} />
            </div>
          </div>
        </div>

        {/* Empathy mirror panel */}
        {empathyExpanded && dest.cost_breakdown?.empathy_mirror && (
          <div style={{
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '0.5rem',
            fontSize: '13px',
            lineHeight: '1.6',
            animation: 'fadeSlideUp 0.25s ease both',
            ...(dest.cost_breakdown.empathy_mirror.type === 'win_win'
              ? { background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.25)', color: THEME.cyan }
              : { background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`, color: 'rgba(255,255,255,0.75)' }
            ),
          }}>
            {dest.cost_breakdown.empathy_mirror.type === 'win_win' ? (
              <>
                <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px', fontWeight: '600' }}>
                  ✦ High Leverage Destination
                </div>
                Your currencies both go further here — local costs are meaningfully cheaper than both your home cities. Enjoy the breathing room.
              </>
            ) : (
              (() => {
                const em = dest.cost_breakdown.empathy_mirror
                return (
                  <>
                    {em.verdict && (
                      <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '10px' }}>{em.verdict}</div>
                    )}
                    <div style={{ fontSize: '11px', opacity: 0.75, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div>A meal here costs you {p1sym}{em.p1.food_at_dest}. That same financial hit feels like {p2sym}{em.p1FoodFeelsToP2} to your partner in {em.p2.city}.</div>
                      <div>A meal here costs your partner {p2sym}{em.p2.food_at_dest}. That feels like {p1sym}{em.p2FoodFeelsToP1} to you in {em.p1.city}.</div>
                      <div>A night's stay costs you {p1sym}{em.p1.lodging_at_dest}. That feels like {p2sym}{em.p1LodgingFeelsToP2} to your partner in {em.p2.city}.</div>
                      <div>A night's stay costs your partner {p2sym}{em.p2.lodging_at_dest}. That feels like {p1sym}{em.p2LodgingFeelsToP1} to you in {em.p1.city}.</div>
                    </div>
                  </>
                )
              })()
            )}
          </div>
        )}

        {/* Glassmorphism info card */}
        <div style={{
          background: THEME.card,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px',
          padding: '1.25rem',
          border: `1px solid ${THEME.border}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          position: 'relative',
        }}>

          {/* Signup overlay — cards 2+3 for logged-out users, or expand gate on any card */}
          {((!userId && activeCard > 0) || signupExpandGate || proExpandGate) && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10, borderRadius: '20px',
              background: 'rgba(26,27,38,0.92)', backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: '12px', padding: '2rem', textAlign: 'center',
            }}>
              {proExpandGate ? (
                <>
                  <div style={{ fontSize: '28px' }}>✦</div>
                  <div style={{ fontSize: '15px', color: THEME.text, fontWeight: '500', lineHeight: '1.5' }}>
                    Unlock full breakdown with Pro
                  </div>
                  <button
                    onClick={() => startCheckout('founding')}
                    style={{ background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`, border: 'none', borderRadius: '100px', padding: '14px 32px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: `0 0 24px rgba(244,114,182,0.3)` }}
                  >
                    Upgrade to Pro →
                  </button>
                  <button
                    onClick={() => setProExpandGate(false)}
                    style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}
                  >
                    Not now
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '28px' }}>🔒</div>
                  <div style={{ fontSize: '15px', color: THEME.text, fontWeight: '500', lineHeight: '1.5' }}>
                    Create a free account to unlock all destinations
                  </div>
                  <button
                    onClick={() => navigate('/login')}
                    style={{ background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`, border: 'none', borderRadius: '100px', padding: '14px 32px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: `0 0 24px rgba(244,114,182,0.3)` }}
                  >
                    Create free account →
                  </button>
                  {signupExpandGate && (
                    <button
                      onClick={() => setSignupExpandGate(false)}
                      style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', marginTop: '4px' }}
                    >
                      Not now
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Cost pills */}
          {!isStretch && (
            costsLoading ? (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '140px', height: '44px', borderRadius: '100px', border: `1px solid ${THEME.border}`, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.5s ease-in-out infinite' }} />
                <div style={{ flex: 1, minWidth: '140px', height: '44px', borderRadius: '100px', border: `1px solid ${THEME.border}`, background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 75%)', backgroundSize: '400% 100%', animation: 'shimmer 1.5s ease-in-out infinite 0.25s' }} />
              </div>
            ) : !dest.p1_cost && !dest.p2_cost ? (
              <a
                href={`https://www.skyscanner.com/transport/flights/${data.p1.iata || 'anywhere'}/${dest.iata}/${data.dates.from?.slice(2).replace(/-/g, '') || ''}/`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => posthog.capture('affiliate_clicked', { provider: 'skyscanner', destination: dest.name })}
                style={{
                  display: 'block',
                  marginBottom: '1rem',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${THEME.border}`,
                  borderRadius: '14px',
                  fontSize: '13px',
                  color: THEME.muted,
                  lineHeight: '1.5',
                  textDecoration: 'none',
                  animation: 'fadeSlideUp 0.4s ease both',
                }}
              >
                Flight prices unavailable for these dates — check Skyscanner for live prices →
              </a>
            ) : (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap', animation: 'fadeSlideUp 0.4s ease both' }}>
                <div style={{ background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: '100px', padding: '10px 16px', fontSize: '13px', flex: 1, minWidth: '140px' }}>
                  <span style={{ color: THEME.muted, marginRight: '6px' }}>P1</span>
                  <span style={{ color: THEME.accent, fontWeight: '600', fontSize: '16px' }}>{p1sym}{dest.p1_cost?.toLocaleString()}</span>
                </div>
                <div style={{ background: 'rgba(124,106,239,0.12)', border: '1px solid rgba(124,106,239,0.3)', borderRadius: '100px', padding: '10px 16px', fontSize: '13px', flex: 1, minWidth: '140px' }}>
                  <span style={{ color: THEME.muted, marginRight: '6px' }}>P2</span>
                  <span style={{ color: THEME.primary, fontWeight: '600', fontSize: '16px' }}>{p2sym}{dest.p2_cost?.toLocaleString()}</span>
                </div>
              </div>
            )
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

          {/* Wise affiliate link */}
          {userId && data.p1.currency !== data.p2.currency && (
            <div style={{ textAlign: 'center', marginBottom: '0.75rem' }}>
              <a
                href="https://wi.se/roamietravel"
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '11px', color: THEME.muted, textDecoration: 'none' }}
              >
                💸 Sending money internationally? Save on transfers with Wise →
              </a>
            </div>
          )}

          {/* Expand button */}
          {!isStretch && !costsLoading && (
            <button
              onClick={() => {
                if (!userId) { setSignupExpandGate(true); return }
                if (!isPro) { setProExpandGate(true); return }
                if (!expanded) posthog.capture('details_expanded', { archetype: dest.archetype, destination: dest.name })
                setExpanded(e => !e)
                if (!expanded && dest.trip_basics) setTripBasics(dest.trip_basics)
              }}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${THEME.border}`,
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
              }}
            >
              {expanded ? 'Less details' : 'More details'}
            </button>
          )}

          {/* Expanded details */}
          {expanded && !isStretch && (
            <div style={{ animation: 'fadeSlideUp 0.3s ease', borderTop: `1px solid ${THEME.border}`, paddingTop: '1.25rem', marginTop: '1rem' }}>

              {dest.cost_breakdown && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '1.25rem' }}>
                 {[
  { label: 'P1 Flights', value: dest.cost_breakdown.flights_p1_total || ((dest.cost_breakdown.flights_p1_leg1 || 0) + (dest.cost_breakdown.flights_p1_leg2 || 0)) || dest.cost_breakdown.flights_p1, sym: p1sym, color: THEME.accent },
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

              {(() => {
                const p1Airline = dest.synchronized_arrival?.p1_airline || dest.p1_airline
                const p1Flight  = dest.synchronized_arrival?.p1_flight_number || dest.p1_flight_number
                const p2Airline = dest.synchronized_arrival?.p2_airline || dest.p2_airline
                const p2Flight  = dest.synchronized_arrival?.p2_flight_number || dest.p2_flight_number
                if (!p1Airline && !p2Airline) return null
                const fmtDur = iso => {
                  if (!iso) return null
                  const h = iso.match(/(\d+)H/)?.[1]
                  const m = iso.match(/(\d+)M/)?.[1]
                  if (!h && !m) return null
                  return [h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ')
                }
                const fmtStops = n => n === 0 ? 'Direct' : n === 1 ? '1 stop' : `${n} stops`
                const p1Parts = [p1Airline, fmtDur(dest.p1_duration), dest.p1_stops != null ? fmtStops(dest.p1_stops) : null].filter(Boolean)
                const p2Parts = [p2Airline, fmtDur(dest.p2_duration), dest.p2_stops != null ? fmtStops(dest.p2_stops) : null].filter(Boolean)
                return (
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.65)', border: `1px solid ${THEME.border}`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {p1Airline && <div>✈️ P1: {p1Parts.join(' · ')}{p1Flight ? ` · ${p1Flight}` : ''}</div>}
                    {p2Airline && <div>✈️ P2: {p2Parts.join(' · ')}{p2Flight ? ` · ${p2Flight}` : ''}</div>}
                  </div>
                )
              })()}

              {dest.synchronized_arrival && (
                <div style={{
                  background: 'rgba(34, 211, 238, 0.07)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '8px',
                  border: '1px solid rgba(34, 211, 238, 0.25)',
                  boxShadow: '0 0 20px rgba(34, 211, 238, 0.08)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px' }}>⏱️</span>
                    <span style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.cyan, fontWeight: '600' }}>
                      Synchronized Arrival
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    <div style={{ background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.2)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: THEME.muted, marginBottom: '4px' }}>Partner 1 lands</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.accent }}>
                        {new Date(dest.synchronized_arrival.p1_arrives).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(124,106,239,0.08)', border: '1px solid rgba(124,106,239,0.2)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '10px', color: THEME.muted, marginBottom: '4px' }}>Partner 2 lands</div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: THEME.primary }}>
                        {new Date(dest.synchronized_arrival.p2_arrives).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '12px', color: THEME.cyan }}>
                    {dest.synchronized_arrival.gap_minutes === 0
                      ? 'Landing at virtually the same time'
                      : `${dest.synchronized_arrival.gap_minutes} min apart — arriving together`}
                  </div>
                  {dest.synchronized_arrival.p1_airline && dest.synchronized_arrival.dest_iata && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ fontSize: '12px', color: THEME.accent, fontWeight: '500' }}>
                          ✈️ P1: {dest.synchronized_arrival.p1_airline} · {dest.synchronized_arrival.p1_flight_number}
                        </div>
                        <button
                          onClick={() => {
                            const date = dest.synchronized_arrival.p1_departs_at?.slice(2, 10).replace(/-/g, '')
                            window.open(`https://www.skyscanner.com/transport/flights/${data.p1.iata}/${dest.synchronized_arrival.dest_iata}/${date}/`, '_blank')
                          }}
                          style={{ padding: '7px 14px', background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.25)', borderRadius: '100px', color: THEME.accent, fontSize: '12px', fontWeight: '500', cursor: 'pointer', textAlign: 'center' }}
                        >
                          Search on Skyscanner →
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ fontSize: '12px', color: THEME.primary, fontWeight: '500' }}>
                          ✈️ P2: {dest.synchronized_arrival.p2_airline} · {dest.synchronized_arrival.p2_flight_number}
                        </div>
                        <button
                          onClick={() => {
                            const date = dest.synchronized_arrival.p2_departs_at?.slice(2, 10).replace(/-/g, '')
                            window.open(`https://www.skyscanner.com/transport/flights/${data.p2.iata}/${dest.synchronized_arrival.dest_iata}/${date}/`, '_blank')
                          }}
                          style={{ padding: '7px 14px', background: 'rgba(124,106,239,0.1)', border: '1px solid rgba(124,106,239,0.25)', borderRadius: '100px', color: THEME.primary, fontSize: '12px', fontWeight: '500', cursor: 'pointer', textAlign: 'center' }}
                        >
                          Search on Skyscanner →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

             
              {tripBasics && (
  <div style={{ marginBottom: '1.5rem' }}>
    <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.accent, marginBottom: '1rem', fontWeight: '500' }}>
      ✦ Trip basics
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
 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
  <div>
    <button onClick={() => { posthog.capture('affiliate_clicked', { provider: 'booking', destination: dest.name }); window.open(generateAffiliateLink('booking_flights', { from: data.p1.iata, to: data.p2.iata, depart: data.dates.from, return: data.dates.to }), '_blank') }} style={{ display: 'block', width: '100%', padding: '12px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '100px', color: '#FB923C', fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'center' }}>
      ✈️ Search flights on Booking.com
    </button>
    <div style={{ textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
      Opens in browser · complete booking there to confirm your price
    </div>
  </div>
  <button onClick={() => { posthog.capture('affiliate_clicked', { provider: 'booking', destination: dest.name }); window.open(generateAffiliateLink('booking', { city: dest.name, checkin: data.dates.from, checkout: data.dates.to }), '_blank') }} style={{ display: 'block', width: '100%', padding: '12px', background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '100px', color: THEME.cyan, fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'center' }}>
    🏨 Book your stay in {cleanDestName(dest.name)?.split(',')[0]}
  </button>
  <button onClick={() => window.open(generateAffiliateLink('viator', { city: dest.name }), '_blank')} style={{ display: 'block', width: '100%', padding: '12px', background: 'rgba(124,106,239,0.1)', border: '1px solid rgba(124,106,239,0.3)', borderRadius: '100px', color: THEME.primary, fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'center', opacity: 0.5, pointerEvents: 'none' }}>
    🎯 Find things to do in {cleanDestName(dest.name)?.split(',')[0]}
    <span style={{ marginLeft: '8px', fontSize: '10px', color: THEME.muted, background: 'rgba(255,255,255,0.08)', borderRadius: '100px', padding: '2px 7px', verticalAlign: 'middle' }}>Soon</span>
  </button>
  <button onClick={() => { posthog.capture('affiliate_clicked', { provider: 'wise', destination: dest.name }); window.open(generateAffiliateLink('wise'), '_blank') }} style={{ display: 'block', width: '100%', padding: '12px', background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: '100px', color: THEME.accent, fontSize: '13px', fontWeight: '500', cursor: 'pointer', textAlign: 'center' }}>
    💸 Send money fee-free with Wise
  </button>
</div>
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

      {/* Did you know */}
      {costsLoading && (
        <div style={{
          textAlign: 'center',
          padding: '0.5rem 1.5rem 1rem',
          fontSize: '12px',
          color: THEME.muted,
          lineHeight: '1.6',
          animation: 'fadeIn 0.5s ease',
          position: 'relative',
          zIndex: 1,
        }}>
          {DID_YOU_KNOW[didYouKnowIndex]}
        </div>
      )}

      {/* Couple summary */}
      {displayResult.couple_summary && (
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
          {displayResult.couple_summary}
        </div>
      )}


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
              <div style={{ fontSize: '13px', color: THEME.accent, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>✦ Roamie</div>
              <div style={{ fontSize: '2rem', lineHeight: '1.1', marginBottom: '8px', color: THEME.text, fontWeight: '600' }}>
                {dest.country_emoji} {cleanDestName(dest.name)}
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
              Planned with Roamie · roamietravel.app
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

      {showInstallBanner && (() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        return (
          <div style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'calc(100% - 3rem)',
            maxWidth: '400px',
            background: 'rgba(30, 32, 48, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${THEME.border}`,
            borderRadius: '20px',
            padding: '1rem 1.25rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            zIndex: 9999,
            animation: 'fadeSlideUp 0.35s ease both',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '4px',
                }}>
                  ✈️ Add Roamie to your home screen
                </div>
                <div style={{ fontSize: '12px', color: THEME.muted, lineHeight: '1.5' }}>
                  {isIOS
                    ? 'Tap the Share button then Add to Home Screen'
                    : 'Tap the menu then Add to Home Screen'}
                </div>
              </div>
              <button
                onClick={dismissInstallBanner}
                style={{
                  background: 'none',
                  border: `1px solid ${THEME.border}`,
                  borderRadius: '100px',
                  padding: '6px 14px',
                  color: THEME.muted,
                  fontSize: '12px',
                  cursor: 'pointer',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                Got it
              </button>
            </div>
          </div>
        )
      })()}

    </div>
  )
}