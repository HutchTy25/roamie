import { useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'

const CURR_SYMBOLS = {
  USD: '$', GBP: '£', EUR: '€', CAD: 'C$', AUD: 'A$',
  NZD: 'NZ$', JPY: '¥', CNY: '¥', KRW: '₩', PHP: '₱',
  IDR: 'Rp', MYR: 'RM', THB: '฿', VND: '₫', SGD: 'S$',
  INR: '₹', PKR: '₨', BDT: '৳', NGN: '₦', GHS: 'GH₵',
  KES: 'KSh', ZAR: 'R', EGP: 'E£', AED: 'AED', SAR: '﷼',
  BRL: 'R$', MXN: 'MX$', COP: 'COL$', ARS: 'AR$', CLP: 'CL$',
}

export default function VisitResults() {
  const location = useLocation()
  const navigate = useNavigate()
  const data = location.state?.data
  const [prices, setPrices] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [messageIndex, setMessageIndex] = useState(0)
  const accent = '#FF6B35'
  const purple = '#9c7ec4'

  const loadingMessages = [
    'Checking real flight prices...',
    'Searching airlines for your route...',
    'Finding the best fares...',
    'Almost there...',
  ]

  const p1sym = CURR_SYMBOLS[data?.p1?.currency] || '$'
  const p2sym = CURR_SYMBOLS[data?.p2?.currency] || '£'

  useEffect(() => {
    if (!data) { navigate('/'); return }
    fetchPrices()
  }, [])

  useEffect(() => {
    if (!loading) return
    const interval = setInterval(() => {
      setMessageIndex(i => (i + 1) % loadingMessages.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [loading])

  async function fetchPrices() {
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
      const result = await res.json()
      console.log('Visit prices:', result)
      setPrices(result)
    } catch (e) {
      console.error('Visit prices error:', e)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.06) 0%, transparent 70%)',
      padding: '2rem',
    }}>
      <style>{`
        @keyframes pulse { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-8px);opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>
      <div style={{ fontSize: '2.5rem', animation: 'float 3s ease-in-out infinite' }}>✈️</div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', marginBottom: '12px' }}>
          Finding your flights...
        </div>
        <div style={{ fontSize: '14px', color: accent, fontStyle: 'italic' }}>
          {loadingMessages[messageIndex]}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: accent, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  )

  if (error || !prices) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '2rem' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem' }}>Something went wrong</div>
      <button onClick={() => navigate('/quiz')} style={{ padding: '12px 32px', background: accent, color: '#0a0a0a', borderRadius: '100px', fontSize: '14px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
        Try again
      </button>
    </div>
  )

  const p1ToP2Price = prices[data.p2.city]?.p1
  const p2ToP1Price = prices[data.p1.city]?.p2

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '2rem 1.5rem', maxWidth: '520px', margin: '0 auto' }}>
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/quiz')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
          ← back
        </button>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
          Dashboard →
        </button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: accent, marginBottom: '8px', fontWeight: '500' }}>
          ✦ Visit each other
        </div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', lineHeight: '1.2', marginBottom: '8px' }}>
          {data.p1.city} ↔ {data.p2.city}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          {data.dates.from} → {data.dates.to}
        </div>
      </div>

      {/* P1 flies to P2 */}
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid rgba(255,107,53,0.2)`,
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        marginBottom: '1rem',
        animation: 'fadeSlideUp 0.4s ease',
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: accent, marginBottom: '1rem', fontWeight: '500' }}>
          {data.p1.city} → {data.p2.city}
        </div>

        {p1ToP2Price ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '0.5rem' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: accent, fontWeight: '400' }}>
                {p1sym}{p1ToP2Price.toLocaleString()}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>round trip</div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              ✈️ Real price from FlightAPI
            </div>

            {/* Money saver */}
            <div style={{
              background: 'rgba(255,107,53,0.08)',
              border: '1px solid rgba(255,107,53,0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
            }}>
              <div style={{ fontSize: '11px', color: accent, fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                💰 Money Saver Tip
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Book 6-8 weeks in advance for this route. Flying Tuesday or Wednesday typically saves 15-20% vs weekends.
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', padding: '1rem 0' }}>
            No direct flights found for these dates. Try flexible dates or check Google Flights for connecting routes.
          </div>
        )}
      </div>

      {/* P2 flies to P1 */}
      <div style={{
        background: 'var(--bg-card)',
        border: `1px solid rgba(156,126,196,0.2)`,
        borderRadius: 'var(--radius)',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        animation: 'fadeSlideUp 0.4s ease 0.1s forwards',
        opacity: 0,
      }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: purple, marginBottom: '1rem', fontWeight: '500' }}>
          {data.p2.city} → {data.p1.city}
        </div>

        {p2ToP1Price ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '0.5rem' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', color: purple, fontWeight: '400' }}>
                {p2sym}{p2ToP1Price.toLocaleString()}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>round trip</div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              ✈️ Real price from FlightAPI
            </div>

            {/* Money saver */}
            <div style={{
              background: 'rgba(156,126,196,0.08)',
              border: '1px solid rgba(156,126,196,0.15)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px',
            }}>
              <div style={{ fontSize: '11px', color: purple, fontWeight: '600', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                💰 Money Saver Tip
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Book 6-8 weeks in advance for this route. Flying Tuesday or Wednesday typically saves 15-20% vs weekends.
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '14px', color: 'var(--text-muted)', padding: '1rem 0' }}>
            No direct flights found for these dates. Try flexible dates or check Google Flights for connecting routes.
          </div>
        )}
      </div>

      {/* Exchange rate context */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        fontSize: '12px',
        color: 'var(--text-muted)',
        lineHeight: '1.6',
      }}>
        💱 Prices shown in each partner's currency. Exchange rates updated daily.
      </div>

      {/* Actions */}
      <button
        onClick={() => navigate('/quiz')}
        style={{
          width: '100%',
          padding: '14px',
          background: accent,
          border: 'none',
          borderRadius: '100px',
          color: '#0a0a0a',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '10px',
        }}
      >
        Plan a trip together ✦
      </button>

      <button
        onClick={() => navigate('/dashboard')}
        style={{
          width: '100%',
          padding: '14px',
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: '100px',
          color: 'var(--text-muted)',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Back to dashboard
      </button>
    </div>
  )
}