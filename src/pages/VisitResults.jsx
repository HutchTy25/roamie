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

  // Loading state
  if (loading) return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '1.5rem',
      background: '#1A1B26',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes pulse { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-8px);opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes orbit { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Stars */}
      {[...Array(15)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          background: '#fff',
          borderRadius: '50%',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: 0.3,
          animation: `twinkle ${3 + Math.random() * 2}s ease-in-out infinite`,
        }} />
      ))}

      {/* Animated plane with orbit */}
      <div style={{ position: 'relative', width: '80px', height: '80px' }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '2px dashed rgba(124,106,239,0.3)',
          animation: 'orbit 3s linear infinite',
        }}>
          <div style={{
            position: 'absolute',
            top: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#7C6AEF"/>
            </svg>
          </div>
        </div>
        <div style={{
          position: 'absolute',
          inset: '20px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
          opacity: 0.3,
        }} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontFamily: "'Geist', sans-serif", 
          fontSize: '1.4rem', 
          fontWeight: '600',
          marginBottom: '12px',
          color: '#E8E8ED',
        }}>
          Finding your flights...
        </div>
        <div style={{ fontSize: '14px', color: '#F472B6', fontStyle: 'italic' }}>
          {loadingMessages[messageIndex]}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, #F472B6, #7C6AEF)', 
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` 
          }} />
        ))}
      </div>
    </div>
  )

  // Error state
  if (error || !prices) return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      gap: '1rem', 
      padding: '2rem',
      background: '#1A1B26',
    }}>
      <div style={{ 
        fontFamily: "'Geist', sans-serif", 
        fontSize: '1.4rem',
        fontWeight: '600',
        color: '#E8E8ED',
      }}>
        Something went wrong
      </div>
      <button 
        onClick={() => navigate('/quiz')} 
        style={{ 
          padding: '14px 32px', 
          background: 'linear-gradient(135deg, #F472B6, #7C6AEF)', 
          color: '#fff', 
          borderRadius: '100px', 
          fontSize: '14px', 
          fontWeight: '600', 
          border: 'none', 
          cursor: 'pointer',
          boxShadow: '0 0 24px rgba(124,106,239,0.4)',
        }}
      >
        Try again
      </button>
    </div>
  )

  const p1ToP2Price = prices[data.p2.city]?.p1
  const p2ToP1Price = prices[data.p1.city]?.p2

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1A1B26', 
      padding: '2rem 1.5rem', 
      maxWidth: '520px', 
      margin: '0 auto',
      position: 'relative',
    }}>
      <style>{`
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
      `}</style>

      {/* Stars */}
      {[...Array(10)].map((_, i) => (
        <div key={i} style={{
          position: 'fixed',
          width: '1px',
          height: '1px',
          background: '#fff',
          borderRadius: '50%',
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: 0.3,
          animation: `twinkle ${3 + Math.random() * 2}s ease-in-out infinite`,
        }} />
      ))}

      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button 
          onClick={() => navigate('/quiz')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#8B8FA3', 
            fontSize: '13px', 
            cursor: 'pointer', 
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          back
        </button>
        <button 
          onClick={() => navigate('/dashboard')} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#8B8FA3', 
            fontSize: '13px', 
            cursor: 'pointer', 
            padding: 0 
          }}
        >
          Dashboard
        </button>
      </div>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ 
          fontSize: '11px', 
          letterSpacing: '0.15em', 
          textTransform: 'uppercase', 
          background: 'linear-gradient(135deg, #F472B6, #22D3EE)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px', 
          fontWeight: '600' 
        }}>
          Visit each other
        </div>
        <div style={{ 
          fontFamily: "'Geist', sans-serif", 
          fontSize: '1.8rem', 
          fontWeight: '600',
          lineHeight: '1.2', 
          marginBottom: '8px',
          color: '#E8E8ED',
        }}>
          {data.p1.city} ↔ {data.p2.city}
        </div>
        <div style={{ fontSize: '13px', color: '#8B8FA3' }}>
          {data.dates.from} → {data.dates.to}
        </div>
      </div>

      {/* P1 flies to P2 */}
      <div style={{
        background: 'rgba(30,32,48,0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(244,114,182,0.25)',
        borderRadius: '20px',
        padding: '1.5rem',
        marginBottom: '1rem',
        animation: 'fadeSlideUp 0.4s ease',
      }}>
        <div style={{ 
          fontSize: '11px', 
          letterSpacing: '0.12em', 
          textTransform: 'uppercase', 
          color: '#F472B6', 
          marginBottom: '1rem', 
          fontWeight: '600' 
        }}>
          {data.p1.city} → {data.p2.city}
        </div>

        {p1ToP2Price ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '0.5rem' }}>
              <div style={{ 
                fontFamily: "'Geist', sans-serif", 
                fontSize: '2.5rem', 
                fontWeight: '600',
                background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {p1sym}{p1ToP2Price.toLocaleString()}
              </div>
              <div style={{ fontSize: '13px', color: '#8B8FA3' }}>round trip</div>
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#8B8FA3', 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8H2M14 8L10 4M14 8L10 12" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Real price from FlightAPI
            </div>

            {/* Money saver */}
            <div style={{
              background: 'rgba(244,114,182,0.1)',
              border: '1px solid rgba(244,114,182,0.2)',
              borderRadius: '12px',
              padding: '12px 14px',
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#F472B6', 
                fontWeight: '600', 
                marginBottom: '4px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em' 
              }}>
                Money Saver Tip
              </div>
              <div style={{ fontSize: '12px', color: '#8B8FA3', lineHeight: '1.6' }}>
                Book 6-8 weeks in advance for this route. Flying Tuesday or Wednesday typically saves 15-20% vs weekends.
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '14px', color: '#8B8FA3', padding: '1rem 0' }}>
            No direct flights found for these dates. Try flexible dates or check Google Flights for connecting routes.
          </div>
        )}
      </div>

      {/* P2 flies to P1 */}
      <div style={{
        background: 'rgba(30,32,48,0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(34,211,238,0.25)',
        borderRadius: '20px',
        padding: '1.5rem',
        marginBottom: '1.5rem',
        animation: 'fadeSlideUp 0.4s ease 0.1s forwards',
        opacity: 0,
      }}>
        <div style={{ 
          fontSize: '11px', 
          letterSpacing: '0.12em', 
          textTransform: 'uppercase', 
          color: '#22D3EE', 
          marginBottom: '1rem', 
          fontWeight: '600' 
        }}>
          {data.p2.city} → {data.p1.city}
        </div>

        {p2ToP1Price ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '0.5rem' }}>
              <div style={{ 
                fontFamily: "'Geist', sans-serif", 
                fontSize: '2.5rem', 
                fontWeight: '600',
                background: 'linear-gradient(135deg, #22D3EE, #7C6AEF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {p2sym}{p2ToP1Price.toLocaleString()}
              </div>
              <div style={{ fontSize: '13px', color: '#8B8FA3' }}>round trip</div>
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: '#8B8FA3', 
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 8H2M14 8L10 4M14 8L10 12" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Real price from FlightAPI
            </div>

            {/* Money saver */}
            <div style={{
              background: 'rgba(34,211,238,0.1)',
              border: '1px solid rgba(34,211,238,0.2)',
              borderRadius: '12px',
              padding: '12px 14px',
            }}>
              <div style={{ 
                fontSize: '11px', 
                color: '#22D3EE', 
                fontWeight: '600', 
                marginBottom: '4px', 
                textTransform: 'uppercase', 
                letterSpacing: '0.08em' 
              }}>
                Money Saver Tip
              </div>
              <div style={{ fontSize: '12px', color: '#8B8FA3', lineHeight: '1.6' }}>
                Book 6-8 weeks in advance for this route. Flying Tuesday or Wednesday typically saves 15-20% vs weekends.
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '14px', color: '#8B8FA3', padding: '1rem 0' }}>
            No direct flights found for these dates. Try flexible dates or check Google Flights for connecting routes.
          </div>
        )}
      </div>

      {/* Exchange rate context */}
      <div style={{
        background: 'rgba(30,32,48,0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(124,106,239,0.15)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        fontSize: '12px',
        color: '#8B8FA3',
        lineHeight: '1.6',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="#7C6AEF" strokeWidth="2"/>
          <path d="M5 8H11M8 5V11" stroke="#7C6AEF" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        {"Prices shown in each partner's currency. Exchange rates updated daily."}
      </div>

      {/* Actions */}
      <button
        onClick={() => navigate('/quiz')}
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
          border: 'none',
          borderRadius: '100px',
          color: '#fff',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '10px',
          boxShadow: '0 0 30px rgba(124,106,239,0.4)',
        }}
      >
        Plan a trip together
      </button>

      <button
        onClick={() => navigate('/dashboard')}
        style={{
          width: '100%',
          padding: '16px',
          background: 'none',
          border: '1px solid rgba(124,106,239,0.2)',
          borderRadius: '100px',
          color: '#8B8FA3',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Back to dashboard
      </button>
    </div>
  )
}