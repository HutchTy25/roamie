import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const THEME = {
  bg: '#1A1B26',
  card: 'rgba(30, 32, 48, 0.7)',
  primary: '#7C6AEF',
  accent: '#F472B6',
  cyan: '#22D3EE',
  text: '#E8E8ED',
  muted: '#8B8FA3',
  border: 'rgba(124, 106, 239, 0.2)',
}

function Starfield() {
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: Math.random() * 2 + 1,
    delay: Math.random() * 3,
  }))
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      <style>{`@keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:0.8} }`}</style>
      {stars.map(s => (
        <div key={s.id} style={{
          position: 'absolute',
          left: `${s.left}%`,
          top: `${s.top}%`,
          width: s.size,
          height: s.size,
          borderRadius: '50%',
          background: 'white',
          opacity: 0.3,
          animation: `twinkle 3s ease-in-out ${s.delay}s infinite`,
        }} />
      ))}
    </div>
  )
}

const STEPS = ['Welcome', 'Your name', 'Home city', 'Anniversary']

export default function Onboarding({ session, onComplete }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [displayName, setDisplayName] = useState(
    session?.user?.user_metadata?.full_name?.split(' ')[0] || ''
  )
  const [homeCity, setHomeCity] = useState('')
  const [homeIata, setHomeIata] = useState('')
  const [iataLoading, setIataLoading] = useState(false)
  const [iataFound, setIataFound] = useState(false)
  const [anniversaryDate, setAnniversaryDate] = useState('')
  const [suggestions, setSuggestions] = useState([])

useEffect(() => {
  if (homeCity.length < 3) {
    setHomeIata('')
    setIataFound(false)
    return
  }
  const timer = setTimeout(async () => {
    setIataLoading(true)
    try {
      const res = await fetch(
        `https://roamie-61ib.onrender.com/api/iata-lookup?city=${encodeURIComponent(homeCity)}`,
        { headers: { 'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET } }
      )
      const data = await res.json()
      if (data.iata) {
        setHomeIata(data.iata)
        setIataFound(true)
      } else {
        setHomeIata('')
        setIataFound(false)
      }
    } catch {
      setHomeIata('')
      setIataFound(false)
    } finally {
      setIataLoading(false)
    }
  }, 600)
  return () => clearTimeout(timer)
}, [homeCity])
  async function finish() {
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          home_city: homeCity.trim() || null,
          home_iata: homeIata || null,
          relationship_start_date: anniversaryDate || null,
        })
        .eq('id', session.user.id)
      if (err) throw err
await onComplete()
navigate('/dashboard')
    } catch (e) {
      setError('Something went wrong. Try again.')
      setSaving(false)
    }
  }

  async function skip() {
    await supabase
      .from('profiles')
      .update({ home_city: 'skip' })
      .eq('id', session.user.id)
    navigate('/dashboard')
  }

  const containerStyle = {
    position: 'relative',
    zIndex: 1,
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.5rem',
    maxWidth: '400px',
    margin: '0 auto',
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 18px',
    background: 'rgba(30,32,48,0.8)',
    border: `1px solid ${THEME.border}`,
    borderRadius: '14px',
    fontSize: '15px',
    color: THEME.text,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  }

  const btnStyle = {
    width: '100%',
    padding: '16px',
    background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
    border: 'none',
    borderRadius: '100px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 0 30px rgba(124,106,239,0.4)',
    transition: 'all 0.2s',
    marginTop: '8px',
  }

  const btnDisabledStyle = {
    opacity: 0.4,
    cursor: 'not-allowed',
    boxShadow: 'none',
  }

  const progressDots = (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '2.5rem' }}>
      {STEPS.map((_, i) => (
        <div key={i} style={{
          width: i === step ? '24px' : '8px',
          height: '8px',
          borderRadius: '4px',
          background: i === step
            ? `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`
            : i < step ? THEME.primary : THEME.border,
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  )

  if (step === 0) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
      <Starfield />
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1.5rem', animation: 'float 4s ease-in-out infinite' }}>
            <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }`}</style>
            🧡
          </div>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '2rem', fontWeight: '600', color: THEME.text, marginBottom: '12px', lineHeight: 1.2 }}>
            Welcome to Roamie
          </h1>
          <p style={{ fontSize: '15px', color: THEME.muted, lineHeight: 1.7, marginBottom: '2.5rem' }}>
            Let's set up your profile so we can make every trip feel effortless. Takes 30 seconds.
          </p>
          <button style={btnStyle} onClick={() => setStep(1)}>Let's go</button>
          <button onClick={skip} style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', marginTop: '1.25rem', display: 'block', width: '100%' }}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )

  if (step === 1) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
      <Starfield />
      <div style={containerStyle}>
        {progressDots}
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: '600', color: THEME.text, marginBottom: '8px' }}>
            What should we call you?
          </h2>
          <p style={{ fontSize: '14px', color: THEME.muted, marginBottom: '1.75rem', lineHeight: 1.6 }}>
            This is how you'll appear to your partner.
          </p>
          <input
            type="text"
            placeholder="Your first name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && displayName.trim() && setStep(2)}
            style={inputStyle}
            autoFocus
          />
          <button
            style={{ ...btnStyle, ...(displayName.trim() ? {} : btnDisabledStyle) }}
            disabled={!displayName.trim()}
            onClick={() => setStep(2)}
          >
            Continue
          </button>
          <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', marginTop: '1.25rem', display: 'block', width: '100%' }}>
            Back
          </button>
        </div>
      </div>
    </div>
  )

  if (step === 2) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
      <Starfield />
      <div style={containerStyle}>
        {progressDots}
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: '600', color: THEME.text, marginBottom: '8px' }}>
            Where do you live?
          </h2>
          <p style={{ fontSize: '14px', color: THEME.muted, marginBottom: '1rem', lineHeight: 1.6 }}>
  We use this to find flights from your city automatically.
</p>
<button
  onClick={async () => {
    if (!navigator.geolocation) return
    setIataLoading(true)
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(
          `https://roamie-61ib.onrender.com/api/nearest-airport?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
          { headers: { 'x-roamie-secret': import.meta.env.VITE_ROAMIE_SECRET } }
        )
        const data = await res.json()
        if (data.iata) {
          setHomeCity(data.city)
          setHomeIata(data.iata)
          setIataFound(true)
          setSuggestions([])
        }
      } catch {
        // silent fail, let them type
      } finally {
        setIataLoading(false)
      }
    }, () => setIataLoading(false))
  }}
  style={{
    background: 'none',
    border: `1px solid ${THEME.border}`,
    borderRadius: '100px',
    padding: '8px 16px',
    fontSize: '12px',
    color: THEME.muted,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '1rem',
  }}
>
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></svg>
  Detect my location
</button>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="e.g. Memphis, Manchester..."
              value={homeCity}
              onChange={e => setHomeCity(e.target.value)}
              style={inputStyle}
              autoFocus
            />
            {homeCity.length >= 3 && (
              <div style={{
                position: 'absolute',
                right: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '12px',
                fontWeight: '600',
                color: iataFound ? THEME.cyan : THEME.muted,
                background: iataFound ? 'rgba(34,211,238,0.1)' : 'transparent',
                border: iataFound ? '1px solid rgba(34,211,238,0.3)' : 'none',
                borderRadius: '6px',
                padding: iataFound ? '2px 8px' : '0',
                transition: 'all 0.3s',
              }}>
                {iataLoading ? '...' : iataFound ? homeIata : '?'}
              </div>
            )}
              {suggestions.length > 0 && !iataFound && (
  <div style={{
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '4px',
    background: 'rgba(30,32,48,0.98)',
    border: `1px solid ${THEME.border}`,
    borderRadius: '14px',
    overflow: 'hidden',
    zIndex: 100,
  }}>
    {suggestions.map((s, i) => (
      <div
        key={s.iata}
        onClick={() => {
          setHomeCity(s.city.charAt(0).toUpperCase() + s.city.slice(1))
          setHomeIata(s.iata)
          setIataFound(true)
          setSuggestions([])
        }}
        style={{
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          borderBottom: i < suggestions.length - 1 ? `1px solid ${THEME.border}` : 'none',
          fontSize: '14px',
          color: THEME.text,
        }}
      >
        <span style={{ textTransform: 'capitalize' }}>{s.city}</span>
        <span style={{
          fontSize: '12px',
          fontWeight: '600',
          color: THEME.cyan,
          background: 'rgba(34,211,238,0.1)',
          border: '1px solid rgba(34,211,238,0.3)',
          borderRadius: '6px',
          padding: '2px 8px',
        }}>
          {s.iata}
        </span>
      </div>
    ))}
  </div>
)}
            
          </div>
          {iataFound && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: THEME.cyan, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              Nearest airport: {homeIata}
            </div>
          )}
          {!iataFound && homeCity.length >= 3 && !iataLoading && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: THEME.muted }}>
              No airport found — try a nearby major city
            </div>
          )}
          <button
            style={{ ...btnStyle, marginTop: '1.25rem', ...(homeCity.trim() ? {} : btnDisabledStyle) }}
            disabled={!homeCity.trim()}
            onClick={() => setStep(3)}
          >
            Continue
          </button>
          <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', marginTop: '1.25rem', display: 'block', width: '100%' }}>
            Back
          </button>
        </div>
      </div>
    </div>
  )

  if (step === 3) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
      <Starfield />
      <div style={containerStyle}>
        {progressDots}
        <div style={{ width: '100%' }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: '600', color: THEME.text, marginBottom: '8px' }}>
            When did you become official?
          </h2>
          <p style={{ fontSize: '14px', color: THEME.muted, marginBottom: '1.75rem', lineHeight: 1.6 }}>
            We'll use this for your anniversary countdown. Skip if you're not sure.
          </p>
          <input
            type="date"
            value={anniversaryDate}
            onChange={e => setAnniversaryDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{ ...inputStyle, colorScheme: 'dark' }}
          />
          {anniversaryDate && (
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'rgba(244,114,182,0.08)',
              border: '1px solid rgba(244,114,182,0.2)',
              borderRadius: '12px',
              fontSize: '13px',
              color: THEME.accent,
            }}>
              {(() => {
                const start = new Date(anniversaryDate)
                const now = new Date()
                const days = Math.floor((now - start) / (1000 * 60 * 60 * 24))
                const years = Math.floor(days / 365)
                const remaining = days % 365
                if (years > 0) return `${years} year${years > 1 ? 's' : ''} and ${remaining} day${remaining !== 1 ? 's' : ''} together`
                return `${days} day${days !== 1 ? 's' : ''} together`
              })()}
            </div>
          )}
          {error && <div style={{ marginTop: '12px', fontSize: '13px', color: '#FF6B6B' }}>{error}</div>}
          <button
            style={{ ...btnStyle, marginTop: '1.5rem', ...(saving ? { opacity: 0.6, cursor: 'wait' } : {}) }}
            disabled={saving}
            onClick={finish}
          >
            {saving ? 'Saving...' : "Let's go ✈️"}
          </button>
          <button
            onClick={() => { setAnniversaryDate(''); finish() }}
            style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', marginTop: '1.25rem', display: 'block', width: '100%' }}
          >
            Skip anniversary date
          </button>
          <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', marginTop: '0.5rem', display: 'block', width: '100%' }}>
            Back
          </button>
        </div>
      </div>
    </div>
  )

  return null
}