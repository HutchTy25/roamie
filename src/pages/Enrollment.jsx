import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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

const CURR_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
  NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
  IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
  INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
  KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
  BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
}

const IATA_CURRENCY = {
  LHR:'GBP',LGW:'GBP',MAN:'GBP',STN:'GBP',LTN:'GBP',EDI:'GBP',GLA:'GBP',BHX:'GBP',BRS:'GBP',NCL:'GBP',
  CDG:'EUR',ORY:'EUR',NCE:'EUR',MRS:'EUR',LYS:'EUR',BOD:'EUR',TLS:'EUR',NTE:'EUR',
  MAD:'EUR',BCN:'EUR',VLC:'EUR',AGP:'EUR',SVQ:'EUR',PMI:'EUR',IBZ:'EUR',
  FRA:'EUR',MUC:'EUR',BER:'EUR',HAM:'EUR',DUS:'EUR',STR:'EUR',CGN:'EUR',
  FCO:'EUR',MXP:'EUR',VCE:'EUR',NAP:'EUR',PSA:'EUR',CTA:'EUR',PMO:'EUR',
  AMS:'EUR',BRU:'EUR',ATH:'EUR',HER:'EUR',RHO:'EUR',LIS:'EUR',OPO:'EUR',
  HEL:'EUR',VIE:'EUR',DUB:'EUR',PRG:'EUR',
  JFK:'USD',LGA:'USD',EWR:'USD',LAX:'USD',SFO:'USD',SJC:'USD',OAK:'USD',
  ORD:'USD',MDW:'USD',DFW:'USD',IAH:'USD',HOU:'USD',ATL:'USD',MIA:'USD',
  FLL:'USD',MCO:'USD',TPA:'USD',BOS:'USD',DCA:'USD',IAD:'USD',BWI:'USD',
  PHL:'USD',SEA:'USD',PDX:'USD',DEN:'USD',SLC:'USD',PHX:'USD',LAS:'USD',
  MSP:'USD',DTW:'USD',CLT:'USD',RDU:'USD',MCI:'USD',AUS:'USD',SAT:'USD',
  HNL:'USD',OGG:'USD',KOA:'USD',
  YYZ:'CAD',YVR:'CAD',YUL:'CAD',YYC:'CAD',YEG:'CAD',YOW:'CAD',YHZ:'CAD',
  SYD:'AUD',MEL:'AUD',BNE:'AUD',PER:'AUD',ADL:'AUD',CBR:'AUD',DRW:'AUD',
  AKL:'NZD',CHC:'NZD',WLG:'NZD',ZQN:'NZD',
  NRT:'JPY',HND:'JPY',KIX:'JPY',ITM:'JPY',CTS:'JPY',FUK:'JPY',OKA:'JPY',NGO:'JPY',
  PEK:'CNY',PKX:'CNY',PVG:'CNY',SHA:'CNY',CAN:'CNY',SZX:'CNY',CTU:'CNY',
  ICN:'KRW',GMP:'KRW',PUS:'KRW',
  SIN:'SGD',
  KUL:'MYR',PEN:'MYR',BKI:'MYR',
  BKK:'THB',DMK:'THB',HKT:'THB',CNX:'THB',USM:'THB',KBV:'THB',
  CGK:'IDR',DPS:'IDR',SUB:'IDR',
  MNL:'PHP',CEB:'PHP',DVO:'PHP',
  DEL:'INR',BOM:'INR',MAA:'INR',BLR:'INR',CCU:'INR',HYD:'INR',GOI:'INR',
  SGN:'VND',HAN:'VND',DAD:'VND',
  LOS:'NGN',ABV:'NGN',PHC:'NGN',
  ACC:'GHS',
  NBO:'KES',MBA:'KES',
  JNB:'ZAR',CPT:'ZAR',DUR:'ZAR',
  CAI:'EGP',HRG:'EGP',SSH:'EGP',
  DXB:'AED',AUH:'AED',SHJ:'AED',
  RUH:'SAR',JED:'SAR',DMM:'SAR',
  GRU:'BRL',GIG:'BRL',BSB:'BRL',REC:'BRL',
  MEX:'MXN',CUN:'MXN',GDL:'MXN',PVR:'MXN',
  BOG:'COP',MDE:'COP',CTG:'COP',
  EZE:'ARS',AEP:'ARS',
  SCL:'CLP',
  KHI:'PKR',LHE:'PKR',ISB:'PKR',
  DAC:'BDT',CGP:'BDT',
}

function currencyFromIata(iata) {
  return IATA_CURRENCY[iata] || 'USD'
}

function getMaxSpend(currency) {
  const highs = { JPY: 2000000, KRW: 5000000, IDR: 50000000, VND: 100000000, CLP: 5000000, COP: 20000000, NGN: 5000000, PKR: 1000000, BDT: 500000 }
  return highs[currency] || 15000
}

function getStepSize(currency) {
  const steps = { JPY: 10000, KRW: 50000, IDR: 500000, VND: 1000000, CLP: 50000, COP: 200000, NGN: 50000, PKR: 10000, BDT: 5000 }
  return steps[currency] || 50
}

function cleanDestName(name) {
  return name?.replace(/^[A-Z]{2,3}\s+/, '') ?? ''
}

function archetypeLabel(archetype) {
  if (archetype === 'sanctuary') return '🌿 Sanctuary'
  if (archetype === 'odyssey') return '⚡ Odyssey'
  if (archetype === 'horizon') return '🌅 Horizon'
  return archetype || ''
}

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
        <div key={star.id} style={{
          position: 'absolute',
          left: `${star.left}%`,
          top: `${star.top}%`,
          width: star.size,
          height: star.size,
          borderRadius: '50%',
          background: 'white',
          opacity: 0.3,
          animation: `twinkle 3s ease-in-out ${star.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

function CityInput({ label, value, onChange, suggestions, onSelect, placeholder }) {
  return (
    <div style={{ position: 'relative', marginBottom: '1rem' }}>
      <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.accent, marginBottom: '8px', fontWeight: '500' }}>
        {label}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          fontSize: '15px',
          padding: '14px 18px',
          background: 'rgba(30,32,48,0.9)',
          border: `1px solid ${THEME.border}`,
          borderRadius: '14px',
          color: THEME.text,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          background: 'rgba(26,27,38,0.98)',
          border: `1px solid ${THEME.border}`,
          borderRadius: '12px',
          overflow: 'hidden',
          zIndex: 50,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {suggestions.map(s => (
            <div
              key={s.iata}
              onClick={() => onSelect(s)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                cursor: 'pointer',
                borderBottom: `1px solid ${THEME.border}`,
              }}
            >
              <div>
                <div style={{ textTransform: 'capitalize', fontSize: '14px', color: THEME.text }}>{s.city}</div>
                <div style={{ fontSize: '11px', color: THEME.muted }}>{s.airport}</div>
              </div>
              <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.cyan, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '6px', padding: '2px 8px' }}>
                {s.iata}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DestCardPreview({ dest, photo, p1sym, p2sym, costsLoading, blurred, onUnlock }) {
  const label = archetypeLabel(dest.archetype)
  const card = (
    <div style={{
      width: '100%',
      borderRadius: '24px',
      overflow: 'hidden',
      position: 'relative',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(244,114,182,0.12)',
      marginBottom: '1rem',
    }}>
      {/* Photo hero */}
      <div style={{
        width: '100%',
        height: '260px',
        background: photo
          ? `url(${photo}) center 30%/cover no-repeat`
          : `linear-gradient(135deg, ${THEME.bg} 0%, #2A2D42 100%)`,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '65%',
          background: 'linear-gradient(to top, rgba(26,27,38,0.98) 0%, rgba(26,27,38,0.7) 40%, transparent 100%)',
        }} />
        <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem', right: '1.25rem' }}>
          <div style={{ fontSize: 'clamp(1.6rem, 6vw, 2.2rem)', lineHeight: '1.1', color: '#fff', fontWeight: '600', textShadow: '0 2px 20px rgba(0,0,0,0.5)', marginBottom: '6px' }}>
            {dest.country_emoji} {cleanDestName(dest.name)}
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5', maxWidth: '90%' }}>
            {dest.tagline}
          </div>
        </div>
      </div>

      {/* Info section */}
      <div style={{ background: THEME.card, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '1.25rem', border: `1px solid ${THEME.border}`, borderTop: 'none' }}>
        {/* Archetype badge */}
        <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: THEME.accent, marginBottom: '1rem', fontWeight: '500' }}>
          {label}
        </div>

        {/* Cost pills */}
        {costsLoading ? (
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ flex: 1, height: '44px', borderRadius: '100px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`, animation: 'skeletonPulse 1.5s ease-in-out infinite' }} />
            <div style={{ flex: 1, height: '44px', borderRadius: '100px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${THEME.border}`, animation: 'skeletonPulse 1.5s ease-in-out infinite 0.3s' }} />
          </div>
        ) : dest.p1_cost || dest.p2_cost ? (
          <div style={{ display: 'flex', gap: '8px', animation: 'fadeSlideUp 0.4s ease both' }}>
            <div style={{ background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.3)', borderRadius: '100px', padding: '10px 16px', fontSize: '13px', flex: 1 }}>
              <span style={{ color: THEME.muted, marginRight: '6px' }}>P1</span>
              <span style={{ color: THEME.accent, fontWeight: '600', fontSize: '16px' }}>{p1sym}{dest.p1_cost?.toLocaleString()}</span>
            </div>
            <div style={{ background: 'rgba(124,106,239,0.12)', border: '1px solid rgba(124,106,239,0.3)', borderRadius: '100px', padding: '10px 16px', fontSize: '13px', flex: 1 }}>
              <span style={{ color: THEME.muted, marginRight: '6px' }}>P2</span>
              <span style={{ color: THEME.primary, fontWeight: '600', fontSize: '16px' }}>{p2sym}{dest.p2_cost?.toLocaleString()}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )

  if (!blurred) return card

  return (
    <div style={{ position: 'relative', marginBottom: '1rem' }}>
      <div style={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }}>
        {card}
      </div>
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26,27,38,0.55)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        borderRadius: '24px',
        gap: '10px',
        padding: '1.5rem',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '28px' }}>🔒</div>
        <div style={{ fontSize: '14px', color: THEME.text, fontWeight: '500', lineHeight: '1.5' }}>
          Create a free account to unlock all 3 destinations
        </div>
        <button
          onClick={onUnlock}
          style={{
            marginTop: '6px',
            background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
            border: 'none',
            borderRadius: '100px',
            padding: '11px 24px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: `0 0 20px rgba(244,114,182,0.3)`,
          }}
        >
          See all destinations →
        </button>
      </div>
    </div>
  )
}

export default function Enrollment() {
  const navigate = useNavigate()
  const UNSPLASH_KEY = import.meta.env.VITE_UNSPLASH_KEY

  const [step, setStep] = useState(1)

  // Step 1 state
  const [p1City, setP1City] = useState('')
  const [p1Iata, setP1Iata] = useState('')
  const [p1Currency, setP1Currency] = useState('USD')
  const [p1Suggestions, setP1Suggestions] = useState([])

  const [p2City, setP2City] = useState('')
  const [p2Iata, setP2Iata] = useState('')
  const [p2Currency, setP2Currency] = useState('GBP')
  const [p2Suggestions, setP2Suggestions] = useState([])

  // Step 2 state
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [p1Budget, setP1Budget] = useState(1500)
  const [p2Budget, setP2Budget] = useState(1200)

  // Step 3 state
  const [result, setResult] = useState(null)
  const [partialResult, setPartialResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [photos, setPhotos] = useState({})
  const [messageIndex, setMessageIndex] = useState(0)
  const fetchedPhotos = useRef(new Set())

  const loadingMessages = [
    'Checking flight routes from both cities...',
    'Comparing currencies and budgets...',
    'Finding hidden gems for your vibe...',
    'Checking weather for your dates...',
    'Calculating fairness between partners...',
    'Almost there — building your breakdown...',
  ]

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % loadingMessages.length)
    }, 2500)
    return () => clearInterval(interval)
  }, [loading])

  const displayResult = result || partialResult
  const costsLoading = !!partialResult && !result

  useEffect(() => {
    if (!displayResult) return
    displayResult.destinations?.forEach((dest, i) => {
      if (!fetchedPhotos.current.has(i)) {
        fetchedPhotos.current.add(i)
        fetchPhoto(dest.name, i)
      }
    })
  }, [displayResult])

  async function searchCity(q, setSuggestions) {
    if (!q || q.length < 2) { setSuggestions([]); return }
    try {
      const res = await fetch(
        `https://roamie-61ib.onrender.com/api/airport-search?q=${encodeURIComponent(q)}`,
        { headers: { 'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET } }
      )
      const json = await res.json()
      console.log('[airport-search]', json)
      setSuggestions(Array.isArray(json) ? json.slice(0, 5) : [])
    } catch {
      setSuggestions([])
    }
  }

  function handleP1Change(val) {
    setP1City(val)
    setP1Iata('')
    searchCity(val, setP1Suggestions)
  }

  function handleP2Change(val) {
    setP2City(val)
    setP2Iata('')
    searchCity(val, setP2Suggestions)
  }

  function selectP1(s) {
    const city = s.city.charAt(0).toUpperCase() + s.city.slice(1)
    setP1City(city)
    setP1Iata(s.iata)
    setP1Currency(currencyFromIata(s.iata))
    setP1Budget(1500)
    setP1Suggestions([])
  }

  function selectP2(s) {
    const city = s.city.charAt(0).toUpperCase() + s.city.slice(1)
    setP2City(city)
    setP2Iata(s.iata)
    setP2Currency(currencyFromIata(s.iata))
    setP2Budget(1200)
    setP2Suggestions([])
  }

  async function fetchPhoto(cityName, index) {
    try {
      const city = cityName.split(',')[0].trim()
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(city + ' travel destination')}&per_page=3&orientation=landscape&order_by=relevant&content_filter=high`,
        { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } }
      )
      const json = await res.json()
      if (json.results?.length > 0) {
        const best = json.results.reduce((prev, cur) => cur.likes > prev.likes ? cur : prev)
        setPhotos(prev => ({ ...prev, [index]: best.urls.regular }))
      }
    } catch {}
  }

  function buildQuizData() {
    return {
      p1: { city: p1City, iata: p1Iata, currency: p1Currency, maxSpend: p1Budget },
      p2: { city: p2City, iata: p2Iata, currency: p2Currency, maxSpend: p2Budget },
      dates: { from: dateFrom, to: dateTo },
      vibes: ['relaxed', 'adventure'],
      routing: 'meet',
      accommodation: 'hotel',
      syncArrival: false,
      sameCity: false,
      region: null,
    }
  }

  async function fetchRealFlightPrices(destNames, qd) {
    try {
      const res = await fetch('https://roamie-61ib.onrender.com/api/flight-prices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({
          p1City: qd.p1.city,
          p2City: qd.p2.city,
          p1Iata: qd.p1.iata || '',
          p2Iata: qd.p2.iata || '',
          destinations: destNames,
          dates: `${qd.dates.from} to ${qd.dates.to}`,
          routing: qd.routing,
          sameCity: qd.sameCity,
          p1Currency: qd.p1.currency,
          p2Currency: qd.p2.currency,
          p1Budget: qd.p1.maxSpend,
          p2Budget: qd.p2.maxSpend,
          syncArrival: false,
        }),
      })
      if (!res.ok) return {}
      return await res.json()
    } catch {
      return {}
    }
  }

  function buildBreakdownPrompt(firstPassResult, flightPrices, qd) {
    const p1sym = CURR_SYMBOLS[qd.p1.currency] || qd.p1.currency
    const p2sym = CURR_SYMBOLS[qd.p2.currency] || qd.p2.currency
    const flightContext = (firstPassResult.destinations || []).map(d => {
      const prices = flightPrices[d.iata] || {}
      return `${d.name}:
  - P1 total round trip from ${qd.p1.city}: ${prices.p1 ?? 'estimate needed'} USD
  - P1 breakdown: leg1: ${prices.p1_breakdown?.leg1 || 'N/A'} USD, leg2: ${prices.p1_breakdown?.leg2 || 'N/A'} USD
  - P2 total round trip from ${qd.p2.city}: ${prices.p2 ?? 'estimate needed'} USD`
    }).join('\n')

    return `You are a travel expert. Return a JSON array with one object per destination. Raw JSON only — no markdown, no backticks, no explanation, nothing before or after the array.

TRIP CONTEXT:
- Partner 1: ${qd.p1.city} | ${qd.p1.currency} | Budget ${p1sym}${qd.p1.maxSpend.toLocaleString()}
- Partner 2: ${qd.p2.city} | ${qd.p2.currency} | Budget ${p2sym}${qd.p2.maxSpend.toLocaleString()}
- Dates: ${qd.dates.from} to ${qd.dates.to}
- Accommodation: ${qd.accommodation}

FLIGHT PRICES (use for routing_note context only):
${flightContext}

DESTINATIONS:
${(firstPassResult.destinations || []).map(d => d.name).join('\n')}

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
        { "method": "Metro", "avg_cost": "$2/ride", "recommended": true }
      ],
      "restaurants": [
        { "name": "Restaurant name", "cuisine": "Cuisine type", "price": "$$" }
      ],
      "stay_tip": "One sentence on the best area to book accommodation"
    }
  }
]

All cost_breakdown values are plain USD numbers. Return ONLY the JSON array. Start your response with [ and end with ].`
  }

  async function runSearch() {
    setLoading(true)
    setError(false)
    setResult(null)
    setPartialResult(null)
    fetchedPhotos.current = new Set()
    setPhotos({})
    setMessageIndex(0)
    setStep(3)

    const qd = buildQuizData()
    const p1sym = CURR_SYMBOLS[qd.p1.currency] || qd.p1.currency
    const p2sym = CURR_SYMBOLS[qd.p2.currency] || qd.p2.currency

    const destinationPrompt = `You are Roamie, a couples travel planner. Assign exactly one destination to each of three archetypes: Sanctuary, Odyssey, and Horizon.

Archetype definitions:
- Sanctuary: Low friction, relaxation-focused. A place to decompress together — coastal ease, slow mornings, minimal planning.
- Odyssey: Adventure, culture, activities. A destination that gives them stories — museums, hikes, street food, nightlife. High engagement.
- Horizon: The balanced mix. Neither pure rest nor pure adventure — a destination that surprises them with both.

PARTNER DETAILS:
- Partner 1: Lives in ${qd.p1.city} | Currency: ${qd.p1.currency} (${p1sym}) | Max budget: ${p1sym}${qd.p1.maxSpend.toLocaleString()} TOTAL
- Partner 2: Lives in ${qd.p2.city} | Currency: ${qd.p2.currency} (${p2sym}) | Max budget: ${p2sym}${qd.p2.maxSpend.toLocaleString()} TOTAL
- Travel dates: ${qd.dates.from} to ${qd.dates.to}
- Vibes: ${qd.vibes.join(', ')}
- Routing: ${qd.routing}
- Accommodation: ${qd.accommodation}
- Region: any

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

    let firstPassResult = null

    try {
      const res1 = await fetch('https://roamie-61ib.onrender.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 3500,
          messages: [{ role: 'user', content: destinationPrompt }],
        }),
      })

      const raw1 = await res1.text()
      const json1 = JSON.parse(raw1)
      const text1 = Array.isArray(json1.content)
        ? json1.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
        : raw1.replace(/```json|```/g, '').trim()

      firstPassResult = JSON.parse(text1)
      if (firstPassResult.destinations && !Array.isArray(firstPassResult.destinations)) {
        firstPassResult.destinations = ['sanctuary', 'odyssey', 'horizon']
          .map(key => ({ archetype: key, ...firstPassResult.destinations[key] }))
          .filter(d => d.name)
      }

      const destNames = firstPassResult.destinations?.map(d => ({ name: d.name, iata: d.iata })) || []
      setPartialResult(firstPassResult)
      setLoading(false)

      setMessageIndex(2)
      const flightPrices = await fetchRealFlightPrices(destNames, qd)

      const enrichedDests = (firstPassResult.destinations || []).map(dest => ({
        ...dest,
        ...(flightPrices[dest.iata] || {}),
      }))
      setPartialResult({ ...firstPassResult, destinations: enrichedDests })

      setMessageIndex(4)
      const breakdownPrompt = buildBreakdownPrompt(firstPassResult, flightPrices, qd)

      const res2 = await fetch('https://roamie-61ib.onrender.com/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET,
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages: [{ role: 'user', content: breakdownPrompt }],
          flightPrices,
          quizData: {
            p1: { currency: qd.p1.currency, maxSpend: qd.p1.maxSpend },
            p2: { currency: qd.p2.currency, maxSpend: qd.p2.maxSpend },
            dates: qd.dates,
          },
        }),
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

      localStorage.setItem('roamie_enrollment_result', JSON.stringify({ result: mergedResult, data: qd }))

    } catch (e) {
      console.error('Enrollment search error:', e)
      if (firstPassResult) {
        setResult(firstPassResult)
        setPartialResult(null)
        localStorage.setItem('roamie_enrollment_result', JSON.stringify({ result: firstPassResult, data: qd }))
      } else {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleUnlock() {
    navigate('/login', { state: { fromEnrollment: true } })
  }

  const p1sym = CURR_SYMBOLS[p1Currency] || ''
  const p2sym = CURR_SYMBOLS[p2Currency] || ''
  const canProceedStep1 = p1Iata && p2Iata
  const canProceedStep2 = dateFrom && dateTo && p1Budget > 0 && p2Budget > 0

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden', background: THEME.bg }}>
      <Starfield />
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.8} }
        @keyframes skeletonPulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes pulse { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-8px);opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        input[type=range] { -webkit-appearance:none; appearance:none; height:4px; border-radius:2px; outline:none; cursor:pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:20px; height:20px; border-radius:50%; cursor:pointer; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.7); cursor:pointer; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: '3.5rem 1.5rem 3rem',
        position: 'relative',
        zIndex: 1,
        maxWidth: '480px',
        margin: '0 auto',
      }}>

        {/* ============ STEP 1 — Cities ============ */}
        {step === 1 && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease both' }}>
            <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: THEME.accent, marginBottom: '12px', fontWeight: '500' }}>
                ✦ Roamie
              </div>
              <h1 style={{ fontSize: 'clamp(1.8rem, 7vw, 2.4rem)', color: THEME.text, fontWeight: '600', lineHeight: '1.2', margin: '0 0 10px' }}>
                Find your trip together
              </h1>
              <p style={{ fontSize: '15px', color: THEME.muted, lineHeight: '1.6', margin: 0 }}>
                Two cities. One perfect destination.
              </p>
            </div>

            <CityInput
              label="Where are you?"
              value={p1City}
              onChange={handleP1Change}
              suggestions={p1Suggestions}
              onSelect={selectP1}
              placeholder="Your city or airport..."
            />

            {p1Iata && (
              <div style={{ marginTop: '-6px', marginBottom: '1rem', fontSize: '12px', color: THEME.cyan }}>
                ✓ {p1Iata} · {p1Currency}
              </div>
            )}

            <CityInput
              label="Where are they?"
              value={p2City}
              onChange={handleP2Change}
              suggestions={p2Suggestions}
              onSelect={selectP2}
              placeholder="Their city or airport..."
            />

            {p2Iata && (
              <div style={{ marginTop: '-6px', marginBottom: '1rem', fontSize: '12px', color: THEME.cyan }}>
                ✓ {p2Iata} · {p2Currency}
              </div>
            )}

            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              style={{
                marginTop: '1rem',
                width: '100%',
                padding: '16px',
                background: canProceedStep1
                  ? `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`
                  : 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '14px',
                color: canProceedStep1 ? '#fff' : THEME.muted,
                fontSize: '15px',
                fontWeight: '600',
                cursor: canProceedStep1 ? 'pointer' : 'not-allowed',
                boxShadow: canProceedStep1 ? `0 0 28px rgba(244,114,182,0.3)` : 'none',
                transition: 'all 0.2s',
              }}
            >
              Find our trip →
            </button>
          </div>
        )}

        {/* ============ STEP 2 — Dates & Budget ============ */}
        {step === 2 && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease both' }}>
            <button
              onClick={() => setStep(1)}
              style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', padding: 0, marginBottom: '1.5rem' }}
            >
              ← back
            </button>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: THEME.accent, marginBottom: '8px', fontWeight: '500' }}>
                ✦ When are you going?
              </div>
              <h2 style={{ fontSize: '1.5rem', color: THEME.text, fontWeight: '600', margin: '0 0 6px' }}>
                {p1City} meets {p2City}
              </h2>
              <p style={{ fontSize: '13px', color: THEME.muted, margin: 0 }}>
                Set your dates and budget for each partner.
              </p>
            </div>

            {/* Dates */}
            <div style={{ background: THEME.card, borderRadius: '16px', padding: '1.25rem', border: `1px solid ${THEME.border}`, marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.muted, marginBottom: '1rem', fontWeight: '500' }}>
                Travel dates
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'From', value: dateFrom, setter: setDateFrom },
                  { label: 'To', value: dateTo, setter: setDateTo },
                ].map(({ label, value, setter }) => (
                  <div key={label}>
                    <div style={{ fontSize: '11px', color: THEME.muted, marginBottom: '6px' }}>{label}</div>
                    <input
                      type="date"
                      value={value}
                      min={new Date().toISOString().slice(0, 10)}
                      onChange={e => setter(e.target.value)}
                      style={{
                        width: '100%',
                        fontSize: '13px',
                        padding: '10px 12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${THEME.border}`,
                        borderRadius: '10px',
                        color: THEME.text,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Budgets */}
            {[
              { label: `${p1City} budget`, currency: p1Currency, sym: p1sym, value: p1Budget, setter: setP1Budget, color: THEME.accent },
              { label: `${p2City} budget`, currency: p2Currency, sym: p2sym, value: p2Budget, setter: setP2Budget, color: THEME.primary },
            ].map(({ label, currency, sym, value, setter, color }) => {
              const max = getMaxSpend(currency)
              const step = getStepSize(currency)
              return (
                <div key={label} style={{ background: THEME.card, borderRadius: '16px', padding: '1.25rem', border: `1px solid ${THEME.border}`, marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: THEME.muted, fontWeight: '500' }}>{label}</div>
                    <div style={{ fontSize: '18px', fontWeight: '600', color }}>{sym}{value.toLocaleString()}</div>
                  </div>
                  <input
                    type="range"
                    min={step}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => setter(Number(e.target.value))}
                    style={{
                      width: '100%',
                      background: `linear-gradient(to right, ${color} 0%, ${color} ${(value / max) * 100}%, rgba(255,255,255,0.1) ${(value / max) * 100}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: THEME.muted, marginTop: '6px' }}>
                    <span>{sym}{step.toLocaleString()}</span>
                    <span>{sym}{max.toLocaleString()}</span>
                  </div>
                </div>
              )
            })}

            <button
              onClick={runSearch}
              disabled={!canProceedStep2}
              style={{
                width: '100%',
                padding: '16px',
                background: canProceedStep2
                  ? `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`
                  : 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '14px',
                color: canProceedStep2 ? '#fff' : THEME.muted,
                fontSize: '15px',
                fontWeight: '600',
                cursor: canProceedStep2 ? 'pointer' : 'not-allowed',
                boxShadow: canProceedStep2 ? `0 0 28px rgba(244,114,182,0.3)` : 'none',
                transition: 'all 0.2s',
                marginTop: '0.5rem',
              }}
            >
              Search destinations
            </button>
          </div>
        )}

        {/* ============ STEP 3 — Results preview ============ */}
        {step === 3 && (
          <div style={{ animation: 'fadeSlideUp 0.4s ease both' }}>

            {/* Loading state — before partialResult arrives */}
            {loading && !partialResult && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', animation: 'float 3s ease-in-out infinite' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={THEME.accent} strokeWidth="1.5">
                    <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                  </svg>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.3rem', color: THEME.text, fontWeight: '500', marginBottom: '10px' }}>Finding your trips...</div>
                  <div style={{ fontSize: '13px', color: THEME.accent, fontStyle: 'italic', minHeight: '20px' }}>
                    {loadingMessages[messageIndex]}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Results */}
            {displayResult && !error && (
              <>
                <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: THEME.accent, marginBottom: '8px', fontWeight: '500' }}>
                    ✦ Your three destinations
                  </div>
                  <div style={{ fontSize: '1.2rem', color: THEME.text, fontWeight: '500' }}>
                    {p1City} + {p2City}
                  </div>
                  {costsLoading && (
                    <div style={{ fontSize: '12px', color: THEME.muted, marginTop: '6px' }}>
                      Fetching real flight prices...
                    </div>
                  )}
                </div>

                {/* Card 0 — fully revealed */}
                {displayResult.destinations?.[0] && (
                  <DestCardPreview
                    dest={displayResult.destinations[0]}
                    photo={photos[0]}
                    p1sym={p1sym}
                    p2sym={p2sym}
                    costsLoading={costsLoading}
                    blurred={false}
                  />
                )}

                {/* Cards 1 & 2 — blurred with lock */}
                {displayResult.destinations?.[1] && (
                  <DestCardPreview
                    dest={displayResult.destinations[1]}
                    photo={photos[1]}
                    p1sym={p1sym}
                    p2sym={p2sym}
                    costsLoading={costsLoading}
                    blurred
                    onUnlock={handleUnlock}
                  />
                )}

                {displayResult.destinations?.[2] && (
                  <DestCardPreview
                    dest={displayResult.destinations[2]}
                    photo={photos[2]}
                    p1sym={p1sym}
                    p2sym={p2sym}
                    costsLoading={costsLoading}
                    blurred
                    onUnlock={handleUnlock}
                  />
                )}

                {/* CTA */}
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                  <button
                    onClick={handleUnlock}
                    style={{
                      width: '100%',
                      padding: '16px',
                      background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
                      border: 'none',
                      borderRadius: '14px',
                      color: '#fff',
                      fontSize: '15px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: `0 0 28px rgba(244,114,182,0.3)`,
                      marginBottom: '12px',
                    }}
                  >
                    See all destinations →
                  </button>
                  <div style={{ fontSize: '12px', color: THEME.muted }}>
                    Free account · No card required
                  </div>
                </div>
              </>
            )}

            {/* Error state */}
            {error && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', color: THEME.text, fontWeight: '500' }}>Something went wrong</div>
                <div style={{ fontSize: '13px', color: THEME.muted }}>Couldn't generate recommendations. Try again.</div>
                <button
                  onClick={() => setStep(1)}
                  style={{ marginTop: '0.5rem', padding: '12px 28px', background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`, color: '#fff', borderRadius: '100px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}
                >
                  Start over
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  )
}
