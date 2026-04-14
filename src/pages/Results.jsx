import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import posthog from 'posthog-js'

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state?.data
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeCard, setActiveCard] = useState(0)
  const [expanded, setExpanded] = useState(false)
  const [photos, setPhotos] = useState({})
  const [messageIndex, setMessageIndex] = useState(0)

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
    fetchRecommendations()
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
    const p1sym = CURR_SYMBOLS[data.p1.currency] || data.p1.currency
    const p2sym = CURR_SYMBOLS[data.p2.currency] || data.p2.currency

    const prompt = `You are Roamie, a real-world couples travel planner with deep knowledge of actual flight prices, accommodation costs, and living expenses globally. Two partners need trip recommendations based on their REAL financial situation.

PARTNER DETAILS:
- Partner 1: Lives in ${data.p1.city} | Currency: ${data.p1.currency} (${p1sym}) | Max budget: ${p1sym}${data.p1.maxSpend.toLocaleString()} TOTAL for the entire trip
- Partner 2: Lives in ${data.p2.city} | Currency: ${data.p2.currency} (${p2sym}) | Max budget: ${p2sym}${data.p2.maxSpend.toLocaleString()} TOTAL for the entire trip
- Travel dates: ${data.dates.from} to ${data.dates.to}
- Vibes both want: ${data.vibes?.join(', ') || 'open to anything'}
- Region preference: ${data.region === 'surprise' ? 'Open to anywhere globally' : data.region.replace('_', ' ')}
- Accommodation preference: ${data.accommodation === 'budget' ? 'Budget — hostels and cheap hotels' : data.accommodation === 'luxe' ? 'Luxe — boutique hotels and 4-5 star properties' : 'Mid-range — 3 star hotels and private Airbnbs'}

REALISM REQUIREMENTS — NON NEGOTIABLE:
- You have deep knowledge of actual 2024/2025 flight prices, airline routes, and accommodation costs
- Always name specific airlines that actually fly these routes — never say "various airlines"
- Give realistic price ranges based on actual market rates not round numbers
- flights_p1 must reflect real economy fares FROM ${data.p1.city} — include layover cities
- flights_p2 must reflect real economy fares FROM ${data.p2.city} — include layover cities  
- lodging_total must be based on real nightly rates for ${data.accommodation === 'budget' ? 'hostels and budget hotels ($30-80/night)' : data.accommodation === 'luxe' ? 'boutique hotels ($200-400/night)' : '3-star hotels and Airbnbs ($80-180/night)'}
- food_per_day must reflect actual daily food costs at that destination
- NEVER recommend Paris, Barcelona, Rome, Amsterdam, or NYC as your first choice — find somewhere genuinely interesting
- Always include at least one destination most people haven't considered
- Account for ${data.region !== 'surprise' ? data.region.replace('_', ' ') + ' region preference' : 'global options'}
- Account for ${data.accommodation} accommodation preference throughout
- Weather must be specific to ${data.dates.from} to ${data.dates.to} — mention actual temperatures
- routing_note must name specific airlines and approximate flight times for BOTH partners
- NEVER exceed either partner's max budget in your recommendations
- If a destination is tight on budget say so honestly and explain what to cut
- Flag any safety concerns for the travel dates — political instability, high crime areas, travel advisories. If a destination has active travel warnings recommend an alternative.
- Add a safety_note field to each destination — one honest sentence on safety for this specific couple visiting in ${data.dates.from} to ${data.dates.to}

WEATHER: Avoid monsoon season, extreme heat above 38C, or hurricane risk during ${data.dates.from} to ${data.dates.to}

Respond ONLY with valid JSON no markdown no backticks no explanation:
{
  "destinations": [
    {
      "name": "City, Country",
      "country_emoji": "🇵🇹",
      "tagline": "One warm sentence why this is perfect for them specifically",
      "why_it_works": "2-3 sentences explaining why this fits their exact cities budgets and vibes",
      "p1_cost": 1200,
      "p2_cost": 950,
      "cost_breakdown": {
        "flights_p1": 400,
        "flights_p2": 350,
        "lodging_per_night": 120,
        "lodging_total": 600,
        "food_per_day": 50,
        "food_total": 250,
        "activities_total": 150
      },
      "lodging_note": "Specific recommendation with price per night",
      "p1_days_income": 4,
      "p2_days_income": 6,
      "fairness_note": "One honest sentence on currency fairness",
      "harder_partner": "p1 or p2",
      "vibe_match": ["vibe1", "vibe2"],
      "savings_scenario": "If both save X per week for Y weeks this becomes comfortable",
      "routing_note": "Specific airlines and approximate flight times from each city",
      "best_for": "weekend or week or two weeks",
      "season_note": "One sentence on weather for their specific travel dates"
      "safety_note": "One honest sentence on safety for this destination and time of year",
    }
  ],
  "stretch_goal": {
    "name": "City, Country",
    "country_emoji": "correct flag emoji for that country",
    "tagline": "Why this is the dream trip for them",
    "what_it_takes": "Exactly what both need to save weekly and how many weeks"
  },
  "couple_summary": "2 warm sentences about what kind of travelers they are together"
}
Return exactly 3 destinations. Be brutally specific — name airlines, give temperature ranges, mention neighborhoods. Users will actually book these trips so accuracy matters more than sounding impressive. Avoid obvious tourist traps unless they genuinely fit the budget and vibe better than alternatives.`

    try {
      const res = await fetch('https://roamie-61ib.onrender.com/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const json = await res.json()
      const text = json.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(text)
      setResult(parsed)
    } catch (e) {
      console.error('Error:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

function getPhotoQuery() {
  const vibes = data.vibes || []
  if (vibes.includes('romantic')) return 'romantic sunset golden hour couple travel'
  if (vibes.includes('beach')) return 'tropical beach aerial turquoise water paradise'
  if (vibes.includes('nature')) return 'dramatic landscape mountains scenic wilderness'
  if (vibes.includes('foodie')) return 'vibrant street food market city culture'
  if (vibes.includes('landmarks')) return 'iconic landmark architecture historic travel'
  if (vibes.includes('city')) return 'city skyline golden hour aerial architecture'
  if (vibes.includes('surprise')) return 'breathtaking travel destination scenic aerial'
  return 'stunning travel destination landscape aerial'
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
        onClick={() => setExpanded(e => !e)}
        style={{
          background: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '100px',
          padding: '10px 20px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '13px',
          cursor: 'pointer',
          alignSelf: 'flex-start',
          marginBottom: expanded ? '1rem' : '0',
          transition: 'all 0.2s',
          display: 'block',
        }}
      >
        {expanded ? 'Less details ↑' : 'More details ↓'}
      </button>
    )}

    {/* Expanded details */}
    {expanded && !isStretch && (
      <div style={{ animation: 'fadeSlideUp 0.3s ease', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem', marginTop: '1rem' }}>

        {dest.cost_breakdown && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '1.25rem' }}>
            {[
              { label: 'P1 Flight', value: dest.cost_breakdown.flights_p1, icon: '✈️' },
              { label: 'P2 Flight', value: dest.cost_breakdown.flights_p2, icon: '✈️' },
              { label: 'Lodging', value: dest.cost_breakdown.lodging_total, icon: '🏨' },
              { label: 'Food', value: dest.cost_breakdown.food_total, icon: '🍽️' },
              { label: 'Activities', value: dest.cost_breakdown.activities_total, icon: '🎯' },
            ].map(item => (
              <div key={item.label} style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 4px',
                textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <div style={{ fontSize: '14px', marginBottom: '3px' }}>{item.icon}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: '500' }}>${item.value}</div>
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

</div>
  )
}