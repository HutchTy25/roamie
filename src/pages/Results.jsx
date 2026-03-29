import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state?.data
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const CURR_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
  NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
  IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
  INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
  KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
  BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
}
  useEffect(() => {
    console.log('Data received:', data)
    if (!data) { navigate('/'); return }
    fetchRecommendations()
  }, [])

  async function fetchRecommendations() {
    const p1sym = CURR_SYMBOLS[data.p1.currency] || data.p1.currency
    const p2sym = CURR_SYMBOLS[data.p2.currency] || data.p2.currency

    const prompt = `You are Roamie, a couples travel planner. Two partners want to plan a trip together. Give warm, specific, realistic recommendations based on their actual situation.

Partner 1: Based in ${data.p1.city}, currency ${data.p1.currency} (${p1sym}), max spend ${p1sym}${data.p1.maxSpend.toLocaleString()}, travel vibes: ${data.p1.vibes.join(', ')}.
Partner 2: Based in ${data.p2.city}, currency ${data.p2.currency} (${p2sym}), max spend ${p2sym}${data.p2.maxSpend.toLocaleString()}, travel vibes: ${data.p2.vibes.join(', ')}.
Travel window: ${data.dates.from} to ${data.dates.to}.
Routing: ${data.routing === 'fly_together' ? 'Partner 1 flies to Partner 2 first, then they fly to destination together' : data.routing === 'meet' ? 'Both fly to destination separately' : 'Driving preferred'}.

Consider actual flight routes, realistic costs in each partner's currency, currency fairness, and seasonal weather for the travel window. Avoid recommending destinations with poor weather conditions during their travel dates (e.g. monsoon season, extreme heat, hurricane season). Be specific about why each destination works for THIS couple based on their cities, vibes, and time of year.

Respond ONLY with valid JSON, no markdown, no backticks, no explanation:
{
  "destinations": [
    {
      "name": "City, Country",
      "tagline": "One warm sentence why this is perfect for them specifically",
      "why_it_works": "2-3 sentences explaining why this destination fits their cities, budgets, and vibes",
      "p1_cost": 1200,
      "p2_cost": 950,
      "p1_days_income": 4,
      "p2_days_income": 6,
      "fairness_note": "One honest sentence on currency fairness between the two partners",
      "harder_partner": "p1 or p2 — whoever this trip is harder on financially",
      "vibe_match": ["vibe1", "vibe2"],
      "savings_scenario": "Specific actionable sentence — if both save X per week for Y weeks this unlocks comfortably",
      "routing_note": "One specific sentence on best way to get there given their exact cities",
      "best_for": "anniversary or birthday or weekend or week or two weeks"
    }
  ],
  "stretch_goal": {
    "name": "City, Country",
    "tagline": "Why this is the dream trip for them",
    "what_it_takes": "Exactly what both need to save and how long it realistically takes"
  },
  "overlap_vibes": ["shared vibe1", "shared vibe2"],
  "couple_summary": "2 warm sentences summarizing what kind of travelers they are together based on their inputs"
}
CRITICAL RULES:
1. Never recommend a destination where either partner's cost exceeds their max spend
2. If budgets are very low or incompatible, be honest — suggest the closest realistic option and lead with a strong savings scenario
3. All costs must be realistic and in each partner's actual currency
4. Rank destinations by joint affordability first, vibe match second
Return exactly 3 destinations ranked best to good. Be realistic with costs.`

    try {
      const res = await fetch('https://roamie-61ib.onrender.com/api/messages', {
        method: 'POST',
        headers: { 
  'Content-Type': 'application/json',
},
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      const json = await res.json()
      const text = json.content.map(b => b.text || '').join('').replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(text)
      setResult(parsed)
    } catch (e) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const p1sym = CURR_SYMBOLS[data?.p1?.currency] || ''
  const p2sym = CURR_SYMBOLS[data?.p2?.currency] || ''

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '1.5rem',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(201,149,108,0.06) 0%, transparent 70%)'
    }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: 'var(--accent)',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`
          }} />
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '8px' }}>
          Finding your trips...
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Checking budgets, currencies, and routes
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-8px);opacity:1} }`}</style>
    </div>
  )

  if (error || !result) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem' }}>Something went wrong</div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Couldn't generate recommendations. Try again.</div>
      <button onClick={() => navigate('/quiz')} style={{ marginTop: '1rem', padding: '12px 32px', background: 'var(--accent)', color: '#0a0a0a', borderRadius: '100px', fontSize: '14px', fontWeight: '600' }}>
        Try again
      </button>
    </div>
  )

  const dest = result.destinations[activeTab]

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '520px', margin: '0 auto' }}>

      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem', animation: 'fadeSlideUp 0.6s ease forwards' }}>
  <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '1rem', fontWeight: '500' }}>
    ✦ Your trips
  </div>
  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 6vw, 2.8rem)', lineHeight: '1.1', marginBottom: '1rem' }}>
    Here's what works<br /><em style={{ color: 'var(--accent)' }}>for both of you.</em>
  </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {result.couple_summary}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {result.destinations.map((d, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 1, padding: '10px 8px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${activeTab === i ? 'var(--accent)' : 'var(--border)'}`,
              background: activeTab === i ? 'var(--accent-soft)' : 'var(--bg-card)',
              color: activeTab === i ? 'var(--accent)' : 'var(--text-muted)',
              fontSize: '12px', fontWeight: '500',
              transition: 'all 0.2s', cursor: 'pointer',
            }}
          >
            {i === 0 ? '✦ Best match' : `Option ${i + 1}`}
          </button>
        ))}
      </div>

      {/* Main destination card */}
      <div key={activeTab} style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '1.5rem',
        marginBottom: '1rem', animation: 'fadeIn 0.4s ease'
      }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(2rem, 6vw, 2.8rem)', lineHeight: '1.1', marginBottom: '8px', letterSpacing: '-0.01em' }}>
  {dest.name}
</div>  
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.6' }}>
          {dest.tagline}
        </div>

        {/* Cost breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1.25rem' }}>
          {[
            { label: 'Partner 1', cost: dest.p1_cost, sym: p1sym, days: dest.p1_days_income, color: 'var(--accent)' },
            { label: 'Partner 2', cost: dest.p2_cost, sym: p2sym, days: dest.p2_days_income, color: '#9c7ec4' },
          ].map(p => (
            <div key={p.label} style={{
              background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
              padding: '1rem', border: '1px solid var(--border)'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '500', color: p.color, fontFamily: "'Playfair Display', serif" }}>
                {p.sym}{p.cost.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{p.days} days income</div>
            </div>
          ))}
        </div>

        {/* Fairness bar */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{dest.fairness_note}</div>
          <div style={{ height: '4px', borderRadius: '2px', background: 'var(--bg-elevated)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '2px',
              background: 'linear-gradient(90deg, var(--accent), #9c7ec4)',
              width: `${Math.round((dest.p1_days_income / (dest.p1_days_income + dest.p2_days_income)) * 100)}%`
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>P1 — {dest.p1_days_income}d</span>
            <span>P2 — {dest.p2_days_income}d</span>
          </div>
        </div>

        {/* Why it works */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Why it works</div>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.7' }}>{dest.why_it_works}</div>
        </div>

        {/* Routing note */}
        <div style={{
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
          padding: '12px 14px', marginBottom: '1rem',
          border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)'
        }}>
          ✈ {dest.routing_note}
        </div>

        {/* Savings scenario */}
        {dest.savings_scenario && (
          <div style={{
            borderLeft: '2px solid var(--accent)', paddingLeft: '12px',
            fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6'
          }}>
            {dest.savings_scenario}
          </div>
        )}
      </div>

      {/* Stretch goal */}
      {result.stretch_goal && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1.5rem'
        }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Stretch goal
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '4px' }}>
            {result.stretch_goal.name}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {result.stretch_goal.tagline}
          </div>
          <div style={{ borderLeft: '2px solid #9c7ec4', paddingLeft: '12px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            {result.stretch_goal.what_it_takes}
          </div>
        </div>
      )}

      {/* Plan again */}
      <button
        onClick={() => navigate('/quiz')}
        style={{
          width: '100%', padding: '16px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: '100px',
          color: 'var(--text-secondary)',
          fontSize: '14px', fontWeight: '500',
          marginBottom: '3rem',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)' }}
        onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-secondary)' }}
      >
        Plan another trip
      </button>

    </div>
  )
}