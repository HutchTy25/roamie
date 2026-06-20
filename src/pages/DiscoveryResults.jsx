import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase'
import { buildArchetypePrompt } from '../utils/recommendationPrompt'
import { currencySymbol, formatMoney } from '../utils/format'

// Discovery (pre-commit) screen. Shows three destination cards built from
// cache-only data — NO live Duffel call, NO LLM cost breakdown. Call 1 (the
// archetype pick) runs here ungated; the expensive live path runs only after the
// couple chooses a card (handed off to Results via { data, preselected }).

const API_BASE = 'https://roamie-61ib.onrender.com'

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

const ARCHETYPE_LABEL = {
  sanctuary: 'Sanctuary',
  odyssey: 'Odyssey',
  horizon: 'Horizon',
}

function cleanDestName(name) {
  return name?.replace(/^[A-Z]{2,3}\s+/, '') ?? ''
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  }
}

export default function DiscoveryResults() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state?.data

  const [destinations, setDestinations] = useState(null) // Call 1 archetype objects
  const [discovery, setDiscovery] = useState(null)        // { [iata]: { dailyFoodUsd, isEstimated, flightBand } }
  const [photos, setPhotos] = useState({})                // { [iata]: url }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const coupleSummary = useRef(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    if (!data) { navigate('/'); return }
    // Visit mode has its own screen; discovery is the couples archetype flow.
    if (data.tripMode === 'visit') { navigate('/visit-results', { state: { data } }); return }
    if (!data.p1?.city || !data.p2?.city) {
      navigate('/quiz', { state: { message: "Let's find your next trip" } })
      return
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function run() {
    try {
      setLoading(true)
      setError(false)
      const dests = await runCall1()
      if (!dests.length) throw new Error('No destinations returned')
      setDestinations(dests)
      setLoading(false)

      // Photos and the cache-only discovery read fire in parallel; neither blocks
      // card render (cards show with skeletons until these resolve).
      dests.forEach(d => fetchPhoto(d.iata, d.name))
      const disco = await fetchDiscovery(dests)
      setDiscovery(disco)
    } catch (e) {
      console.error('[discovery] run error:', e)
      setError(true)
      setLoading(false)
    }
  }

  async function runCall1() {
    const p1sym = currencySymbol(data.p1.currency)
    const p2sym = currencySymbol(data.p2.currency)
    const prompt = buildArchetypePrompt(data, p1sym, p2sym)

    const res = await fetch(`${API_BASE}/api/messages`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const raw = await res.text()
    const json = JSON.parse(raw)
    const text = Array.isArray(json.content)
      ? json.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
      : raw.replace(/```json|```/g, '').trim()

    const parsed = JSON.parse(text)
    coupleSummary.current = parsed.couple_summary || null

    let dests = parsed.destinations
    if (dests && !Array.isArray(dests)) {
      dests = ['sanctuary', 'odyssey', 'horizon']
        .map(key => ({ archetype: key, ...parsed.destinations[key] }))
        .filter(d => d.name)
    }
    return dests || []
  }

  async function fetchDiscovery(dests) {
    const res = await fetch(`${API_BASE}/api/discovery`, {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        destinations: dests.map(d => ({ name: d.name, iata: d.iata })),
        p1Iata: data.p1.iata || '',
        p2Iata: data.p2.iata || '',
        month: data.dates?.from?.slice(0, 7),
        p1Budget: data.p1.maxSpend,
        p2Budget: data.p2.maxSpend,
        p1Currency: data.p1.currency,
        p2Currency: data.p2.currency,
      }),
    })
    if (!res.ok) throw new Error(`discovery ${res.status}`)
    const json = await res.json()
    return json.destinations || {}
  }

  async function fetchPhoto(iata, cityName) {
    try {
      const city = cityName.split(',')[0].trim()
      const res = await fetch(`${API_BASE}/api/photo?city=${encodeURIComponent(city)}`)
      const json = await res.json()
      if (json.url) setPhotos(prev => ({ ...prev, [iata]: json.url }))
    } catch { /* photo is best-effort */ }
  }

  function choose(dest) {
    // Hand off to the EXISTING live path for this ONE destination. Results reads
    // state.preselected, uses it as firstPassResult, and skips Call 1.
    navigate('/results', {
      state: { data, preselected: dest, coupleSummary: coupleSummary.current },
    })
  }

  // --- render ----------------------------------------------------------------
  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', color: THEME.muted, fontSize: 15, paddingTop: '40vh' }}>
          Finding three trips for you…
        </div>
      </div>
    )
  }

  if (error || !destinations) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', paddingTop: '35vh' }}>
          <div style={{ color: THEME.text, fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Couldn&apos;t load your trips
          </div>
          <div style={{ color: THEME.muted, fontSize: 14, marginBottom: 20 }}>Please try again.</div>
          <button style={primaryBtn} onClick={() => navigate('/quiz')}>Back to quiz</button>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px 48px' }}>
        <h1 style={{ color: THEME.text, fontSize: 'clamp(1.4rem, 5vw, 2rem)', fontWeight: 700, margin: '8px 0 4px' }}>
          Three trips to explore
        </h1>
        <p style={{ color: THEME.muted, fontSize: 14, margin: '0 0 20px' }}>
          Quick estimates — pick one and we&apos;ll price it live for both of you.
        </p>

        <div style={{ display: 'grid', gap: 16 }}>
          {destinations.map(dest => (
            <DiscoveryCard
              key={dest.iata || dest.name}
              dest={dest}
              info={discovery?.[dest.iata]}
              loadingInfo={!discovery}
              photo={photos[dest.iata]}
              onChoose={() => choose(dest)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DiscoveryCard({ dest, info, loadingInfo, photo, onChoose }) {
  const food = info?.dailyFoodUsd
  const isEstimated = info?.isEstimated
  const band = info?.flightBand

  const bandLow = band?.flight_band_low
  const bandCurrency = band?.currency || 'USD'

  return (
    <div style={{
      background: THEME.card,
      border: `1px solid ${THEME.border}`,
      borderRadius: 18,
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        height: 150,
        background: photo
          ? `url(${photo}) center/cover no-repeat`
          : 'linear-gradient(135deg, #2A2C42, #1E2030)',
        position: 'relative',
      }}>
        <span style={{
          position: 'absolute', top: 12, left: 12,
          background: 'rgba(0,0,0,0.55)', color: '#fff',
          fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
          padding: '4px 10px', borderRadius: 100,
        }}>
          {dest.country_emoji ? `${dest.country_emoji} ` : ''}{ARCHETYPE_LABEL[dest.archetype] || 'Trip'}
        </span>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ color: THEME.text, fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
          {cleanDestName(dest.name)}
        </div>
        {dest.tagline && (
          <div style={{ color: THEME.muted, fontSize: 13, marginBottom: 12, lineHeight: 1.4 }}>
            {dest.tagline}
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Flight band */}
          <Metric label="Flights">
            {loadingInfo ? (
              <Skeleton />
            ) : bandLow != null ? (
              <span style={{ color: THEME.text }}>from {formatMoney(bandLow, bandCurrency)}</span>
            ) : (
              <span style={{ color: THEME.muted, fontStyle: 'italic' }}>priced when you choose</span>
            )}
          </Metric>

          {/* Daily food — subtle 'approx.' when estimated */}
          <Metric label="Food / day">
            {loadingInfo ? (
              <Skeleton />
            ) : food != null ? (
              <span style={{
                color: isEstimated ? THEME.muted : THEME.text,
                fontStyle: isEstimated ? 'italic' : 'normal',
              }}>
                {isEstimated ? 'approx. ' : ''}{formatMoney(food, 'USD')}
              </span>
            ) : (
              <span style={{ color: THEME.muted }}>—</span>
            )}
          </Metric>
        </div>

        <button style={primaryBtn} onClick={onChoose}>Choose this trip</button>
      </div>
    </div>
  )
}

function Metric({ label, children }) {
  return (
    <div>
      <div style={{ color: THEME.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{children}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <span style={{
      display: 'inline-block', width: 70, height: 14, borderRadius: 6,
      background: 'rgba(255,255,255,0.08)',
    }} />
  )
}

const pageStyle = {
  minHeight: '100vh',
  background: THEME.bg,
}

const primaryBtn = {
  width: '100%',
  background: 'linear-gradient(135deg, #22D3EE, #7C6AEF)',
  border: 'none',
  borderRadius: 100,
  padding: '12px 16px',
  color: '#fff',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}
