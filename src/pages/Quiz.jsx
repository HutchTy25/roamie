import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import posthog from 'posthog-js'

// Moonly Theme Colors
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

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'CAD', symbol: 'C$', label: 'CAD' },
  { code: 'AUD', symbol: 'A$', label: 'AUD' },
  { code: 'NZD', symbol: 'NZ$', label: 'NZD' },
  { code: 'JPY', symbol: '¥', label: 'JPY' },
  { code: 'CNY', symbol: '¥', label: 'CNY' },
  { code: 'KRW', symbol: '₩', label: 'KRW' },
  { code: 'PHP', symbol: '₱', label: 'PHP' },
  { code: 'IDR', symbol: 'Rp', label: 'IDR' },
  { code: 'MYR', symbol: 'RM', label: 'MYR' },
  { code: 'THB', symbol: '฿', label: 'THB' },
  { code: 'VND', symbol: '₫', label: 'VND' },
  { code: 'SGD', symbol: 'S$', label: 'SGD' },
  { code: 'INR', symbol: '₹', label: 'INR' },
  { code: 'PKR', symbol: '₨', label: 'PKR' },
  { code: 'BDT', symbol: '৳', label: 'BDT' },
  { code: 'NGN', symbol: '₦', label: 'NGN' },
  { code: 'GHS', symbol: 'GH₵', label: 'GHS' },
  { code: 'KES', symbol: 'KSh', label: 'KES' },
  { code: 'ZAR', symbol: 'R', label: 'ZAR' },
  { code: 'EGP', symbol: 'E£', label: 'EGP' },
  { code: 'AED', symbol: 'AED', label: 'AED' },
  { code: 'SAR', symbol: '﷼', label: 'SAR' },
  { code: 'BRL', symbol: 'R$', label: 'BRL' },
  { code: 'MXN', symbol: 'MX$', label: 'MXN' },
  { code: 'COP', symbol: 'COL$', label: 'COP' },
  { code: 'ARS', symbol: 'AR$', label: 'ARS' },
  { code: 'CLP', symbol: 'CL$', label: 'CLP' },
]

const VIBES = [
  { id: 'beach', label: 'Beach & sun' },
  { id: 'city', label: 'City & culture' },
  { id: 'nature', label: 'Nature & adventure' },
  { id: 'romantic', label: 'Romantic escape' },
  { id: 'foodie', label: 'Foodie & nightlife' },
  { id: 'landmarks', label: 'Landmark chaser' },
  { id: 'surprise', label: 'Surprise us' },
]

// Starfield component
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
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}

function CalendarPicker({ label, selected, onChange, minDate }) {
  const [viewDate, setViewDate] = useState(() => selected ? new Date(selected) : new Date())
  const today = new Date()
  today.setHours(0,0,0,0)
  const min = minDate || today
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
  const dayNames = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  
  function prevMonth() { setViewDate(new Date(year, month - 1, 1)) }
  function nextMonth() { setViewDate(new Date(year, month + 1, 1)) }
  function selectDay(day) {
    if (!day) return
    const date = new Date(year, month, day)
    date.setHours(0,0,0,0)
    if (date < min) return
    onChange(date.toISOString().split('T')[0])
  }
  function isSelected(day) {
    if (!day || !selected) return false
    return new Date(year, month, day).toISOString().split('T')[0] === selected
  }
  function isDisabled(day) {
    if (!day) return true
    const d = new Date(year, month, day)
    d.setHours(0,0,0,0)
    return d < min
  }
  function isToday(day) {
    if (!day) return false
    return new Date(year, month, day).toISOString().split('T')[0] === today.toISOString().split('T')[0]
  }

  return (
    <div style={{ width: '100%', marginBottom: '1rem' }}>
      <div style={{ fontSize: '11px', color: THEME.muted, marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{
        background: THEME.card,
        backdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: `1px solid ${THEME.border}`,
        padding: '1.25rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        {/* Quick month jumps */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', justifyContent: 'center' }}>
          {[3, 6, 9].map(months => (
            <button
              key={months}
              onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + months); setViewDate(d) }}
              style={{
                background: 'rgba(124, 106, 239, 0.1)',
                border: `1px solid ${THEME.border}`,
                borderRadius: '100px',
                padding: '4px 12px',
                fontSize: '11px',
                color: THEME.muted,
                cursor: 'pointer',
              }}
            >
              +{months}mo
            </button>
          ))}
        </div>
        
        {/* Month navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button
            onClick={prevMonth}
            style={{
              background: 'rgba(124, 106, 239, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: THEME.text,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <div style={{ fontSize: '1rem', color: THEME.text, fontWeight: '500' }}>{monthNames[month]} {year}</div>
          <button
            onClick={nextMonth}
            style={{
              background: 'rgba(124, 106, 239, 0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              color: THEME.text,
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>
        
        {/* Day names */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
          {dayNames.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: THEME.muted, padding: '4px 0', fontWeight: '500' }}>{d}</div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {cells.map((day, i) => (
            <div
              key={i}
              onClick={() => selectDay(day)}
              style={{
                textAlign: 'center',
                padding: '10px 0',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: isSelected(day) ? '600' : '400',
                cursor: day && !isDisabled(day) ? 'pointer' : 'default',
                background: isSelected(day)
                  ? `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`
                  : isToday(day)
                  ? 'rgba(244, 114, 182, 0.15)'
                  : 'transparent',
                color: isSelected(day)
                  ? '#fff'
                  : isDisabled(day)
                  ? 'rgba(255,255,255,0.15)'
                  : isToday(day)
                  ? THEME.accent
                  : THEME.text,
                transition: 'all 0.15s',
                userSelect: 'none',
              }}
            >
              {day || ''}
            </div>
          ))}
        </div>
        
        {/* Selected date display */}
        {selected && (
          <div style={{
            marginTop: '1rem',
            textAlign: 'center',
            fontSize: '13px',
            color: THEME.accent,
            fontWeight: '500',
          }}>
            {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Quiz({ session }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    p1: { city: '', currency: 'USD', maxSpend: 1500 },
    p2: { city: '', currency: 'GBP', maxSpend: 1200 },
    vibes: [],
    dates: { from: '', to: '' },
    routing: 'fly_together',
    tripMode: '',
    region: 'surprise',
    accommodation: 'mid',
    sameCity: false,
  })

  function getCurrencySymbol(code) {
    return CURRENCIES.find(c => c.code === code)?.symbol || code
  }

  function getMaxSpend(currency) {
    const highs = { JPY: 2000000, KRW: 5000000, IDR: 50000000, VND: 100000000, CLP: 5000000, COP: 20000000, NGN: 5000000, PKR: 1000000, BDT: 500000 }
    return highs[currency] || 15000
  }

  function getStepSize(currency) {
    const steps = { JPY: 10000, KRW: 50000, IDR: 500000, VND: 1000000, CLP: 50000, COP: 200000, NGN: 50000, PKR: 10000, BDT: 5000 }
    return steps[currency] || 50
  }

  function toggleVibe(id) {
    setData(d => ({ ...d, vibes: d.vibes.includes(id) ? d.vibes.filter(v => v !== id) : [...d.vibes, id] }))
  }

  function next() { setStep(s => s + 1) }
  function back() { setStep(s => s - 1) }

  const totalSteps = data.tripMode === 'visit' ? 3 : 5
  const progress = Math.round(((step) / totalSteps) * 100)

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1.25rem',
    maxWidth: '520px',
    margin: '0 auto',
    width: '100%',
    position: 'relative',
    zIndex: 1,
  }

  const btnStyle = {
    width: '100%',
    padding: '16px',
    background: `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})`,
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    borderRadius: '100px',
    marginTop: '1.5rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: `0 0 30px rgba(244, 114, 182, 0.3)`,
  }

  const btnDisabledStyle = { opacity: 0.4, cursor: 'not-allowed', boxShadow: 'none' }

  const backBtnStyle = {
    background: 'none',
    border: 'none',
    color: THEME.muted,
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '2rem',
    padding: '0',
    display: 'block',
    width: '100%',
    textAlign: 'left',
  }

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    background: 'rgba(30, 32, 48, 0.8)',
    border: `1px solid ${THEME.border}`,
    borderRadius: '14px',
    color: THEME.text,
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  }

  const progressBar = (
    <div style={{
      width: '100%',
      height: '3px',
      background: 'rgba(124, 106, 239, 0.2)',
      borderRadius: '2px',
      marginBottom: '2.5rem',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        borderRadius: '2px',
        background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.primary})`,
        width: progress + '%',
        transition: 'width 0.4s ease',
        boxShadow: `0 0 10px ${THEME.accent}`,
      }} />
    </div>
  )

  // STEP 0 - Mode selector
  if (step === 0) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
      <Starfield />
      <div style={containerStyle}>
        <div style={{ width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: THEME.text, marginBottom: '8px', fontWeight: '600' }}>
            What&apos;s the plan?
          </div>
          <div style={{ fontSize: '14px', color: THEME.muted }}>
            Tell us what you&apos;re thinking and we&apos;ll handle the rest
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '2rem' }}>
        {[
  { id: 'visit', icon: '💑', label: 'Visit each other', desc: 'Find the best price for one partner to visit the other', routing: 'visit', locked: !session },
  { id: 'meet', icon: '🛬', label: 'Meet somewhere new', desc: 'Both fly independently to a destination you choose together', routing: 'meet', locked: !session },
  { id: 'explore', icon: '✈️', label: 'Explore together', desc: 'AI finds destinations and figures out the smartest way to get there', routing: 'fly_together', locked: false },
].map(m => (
  <div
    key={m.id}
    onClick={() => {
      if (m.locked) { navigate('/login'); return }
      setData(d => ({ ...d, tripMode: m.id, routing: m.routing }))
    }}
    style={{
      padding: '1.25rem',
      borderRadius: '16px',
      border: `1px solid ${data.tripMode === m.id ? THEME.accent : m.locked ? 'rgba(124,106,239,0.1)' : THEME.border}`,
      background: data.tripMode === m.id ? 'rgba(244, 114, 182, 0.1)' : THEME.card,
      backdropFilter: 'blur(20px)',
      cursor: m.locked ? 'pointer' : 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      opacity: m.locked ? 0.6 : 1,
      boxShadow: data.tripMode === m.id ? `0 0 30px rgba(244, 114, 182, 0.2)` : 'none',
      position: 'relative',
    }}
  >
    <div style={{ fontSize: '2rem', flexShrink: 0 }}>{m.icon}</div>
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: '15px',
        fontWeight: '600',
        color: data.tripMode === m.id ? THEME.accent : m.locked ? THEME.muted : THEME.text,
        marginBottom: '3px',
      }}>
        {m.label}
      </div>
      <div style={{ fontSize: '12px', color: THEME.muted, lineHeight: '1.5' }}>{m.desc}</div>
    </div>
    {m.locked && (
      <div style={{
        fontSize: '11px',
        fontWeight: '600',
        color: THEME.primary,
        background: 'rgba(124,106,239,0.15)',
        border: `1px solid rgba(124,106,239,0.3)`,
        borderRadius: '100px',
        padding: '4px 10px',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        Sign in
      </div>
    )}
  </div>
))}  
        </div>

        <button
          style={{ ...btnStyle, ...(!data.tripMode ? btnDisabledStyle : {}) }}
          disabled={!data.tripMode}
          onClick={next}
        >
          Continue
        </button>
      </div>
    </div>
  )

  // STEP 1 - City inputs
  if (step === 1) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
      <Starfield />
      <div style={containerStyle}>
        {progressBar}
        <button style={backBtnStyle} onClick={back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M15 18l-6-6 6-6"/></svg>
          back
        </button>

        <div style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: THEME.text, marginBottom: '8px', width: '100%', fontWeight: '600' }}>
          Where are you both based?
        </div>
        <div style={{ fontSize: '14px', color: THEME.muted, marginBottom: '1.75rem', width: '100%' }}>
          Enter your home cities so we can find real flight prices
        </div>

        {/* Same city toggle */}
        {data.tripMode !== 'visit' && (
          <div
            onClick={() => setData(d => ({ ...d, sameCity: !d.sameCity, p2: { ...d.p2, city: !d.sameCity ? d.p1.city : '' } }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '1rem',
              cursor: 'pointer',
              padding: '12px 16px',
              borderRadius: '14px',
              border: `1px solid ${data.sameCity ? THEME.accent : THEME.border}`,
              background: data.sameCity ? 'rgba(244, 114, 182, 0.1)' : THEME.card,
              width: '100%',
            }}
          >
            <div style={{
              width: '40px',
              height: '22px',
              borderRadius: '11px',
              background: data.sameCity ? `linear-gradient(135deg, ${THEME.accent}, ${THEME.primary})` : 'rgba(255,255,255,0.15)',
              position: 'relative',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}>
              <div style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: '2px',
                left: data.sameCity ? '20px' : '2px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }} />
            </div>
            <div style={{ fontSize: '13px', color: data.sameCity ? THEME.accent : THEME.muted }}>We&apos;re based in the same city</div>
          </div>
        )}

        {/* City inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: data.sameCity ? '1fr' : '1fr 1fr', gap: '12px', width: '100%', marginBottom: '1rem' }}>
          <div>
            <div style={{ fontSize: '11px', color: THEME.accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
              {data.sameCity ? 'Your city' : data.tripMode === 'visit' ? 'Your city' : 'Partner 1'}
            </div>
            <input
              type="text"
              placeholder="e.g. Memphis"
              value={data.p1.city}
              onChange={e => setData(d => ({ ...d, p1: { ...d.p1, city: e.target.value }, p2: d.sameCity ? { ...d.p2, city: e.target.value } : d.p2 }))}
              style={inputStyle}
            />
          </div>
          {!data.sameCity && (
            <div>
              <div style={{ fontSize: '11px', color: THEME.primary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
                {data.tripMode === 'visit' ? "Partner's city" : 'Partner 2'}
              </div>
              <input
                type="text"
                placeholder="e.g. Manchester"
                value={data.p2.city}
                onChange={e => setData(d => ({ ...d, p2: { ...d.p2, city: e.target.value } }))}
                style={inputStyle}
              />
            </div>
          )}
        </div>

        <button
          style={{ ...btnStyle, ...(!data.p1.city.trim() || (!data.sameCity && !data.p2.city.trim()) ? btnDisabledStyle : {}) }}
          disabled={!data.p1.city.trim() || (!data.sameCity && !data.p2.city.trim())}
          onClick={next}
        >
          Continue
        </button>
      </div>
    </div>
  )

  // STEP 2 - Visit mode: dates / Meet/Explore: budget
  if (step === 2) {
    if (data.tripMode === 'visit') {
      return (
        <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
          <Starfield />
          <div style={containerStyle}>
            {progressBar}
            <button style={backBtnStyle} onClick={back}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M15 18l-6-6 6-6"/></svg>
              back
            </button>
            <div style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: THEME.text, marginBottom: '8px', width: '100%', fontWeight: '600' }}>
              When are you visiting?
            </div>
            <div style={{ fontSize: '14px', color: THEME.muted, marginBottom: '1.75rem', width: '100%' }}>
              Pick your travel dates and we&apos;ll find real flight prices
            </div>
            <CalendarPicker label="Departure" selected={data.dates.from} onChange={v => setData(d => ({ ...d, dates: { ...d.dates, from: v } }))} />
            <CalendarPicker label="Return" selected={data.dates.to} onChange={v => setData(d => ({ ...d, dates: { ...d.dates, to: v } }))} minDate={data.dates.from ? new Date(data.dates.from + 'T00:00:01') : undefined} />
            <button
              style={{ ...btnStyle, ...(!data.dates.from || !data.dates.to ? btnDisabledStyle : {}) }}
              disabled={!data.dates.from || !data.dates.to}
              onClick={() => {
                const isPaid = localStorage.getItem('roamie_paid') === 'true'
                const isBeta = new URLSearchParams(window.location.search).get('beta') === 'true'
                const count = parseInt(localStorage.getItem('roamie_trip_count') || '0')
                if (!isPaid && !isBeta && count >= 3) { navigate('/gate', { state: { data } }); return }
                localStorage.setItem('roamie_trip_count', count + 1)
                posthog.capture('generate_trip_clicked', { mode: 'visit', p1_city: data.p1.city, p2_city: data.p2.city })
                navigate('/visit-results', { state: { data } })
              }}
            >
              Find flights
            </button>
          </div>
        </div>
      )
    }

    // Meet/Explore - budget step
    return (
      <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
        <Starfield />
        <div style={containerStyle}>
          {progressBar}
          <button style={backBtnStyle} onClick={back}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M15 18l-6-6 6-6"/></svg>
            back
          </button>
          <div style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: THEME.text, marginBottom: '8px', width: '100%', fontWeight: '600' }}>
            What&apos;s your budget?
          </div>
          <div style={{ fontSize: '14px', color: THEME.muted, marginBottom: '1.75rem', width: '100%' }}>
            Total per person including flights, stay and food
          </div>

          {/* Accommodation style */}
          <div style={{ width: '100%', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '11px', color: THEME.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Accommodation style</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'budget', label: 'Budget', desc: 'Hostels & budget hotels' },
                { id: 'mid', label: 'Mid-range', desc: '3-star hotels & Airbnbs' },
                { id: 'luxe', label: 'Luxe', desc: 'Boutique 4-5 star hotels' },
              ].map(a => (
                <div
                  key={a.id}
                  onClick={() => setData(d => ({ ...d, accommodation: a.id }))}
                  style={{
                    padding: '12px 8px',
                    borderRadius: '14px',
                    border: `1px solid ${data.accommodation === a.id ? THEME.accent : THEME.border}`,
                    background: data.accommodation === a.id ? 'rgba(244, 114, 182, 0.1)' : THEME.card,
                    backdropFilter: 'blur(12px)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: '600', color: data.accommodation === a.id ? THEME.accent : THEME.text, marginBottom: '2px' }}>{a.label}</div>
                  <div style={{ fontSize: '10px', color: THEME.muted }}>{a.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Budget sliders */}
          {[
            { key: 'p1', label: 'Partner 1 budget', color: THEME.accent },
            { key: 'p2', label: 'Partner 2 budget', color: THEME.primary },
          ].map(({ key, label, color }) => {
            const partner = data[key]
            const sym = getCurrencySymbol(partner.currency)
            const max = getMaxSpend(partner.currency)
            const stepSize = getStepSize(partner.currency)
            return (
              <div key={key} style={{ width: '100%', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '500' }}>{label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={partner.currency}
                      onChange={e => setData(d => ({ ...d, [key]: { ...d[key], currency: e.target.value, maxSpend: Math.min(d[key].maxSpend, getMaxSpend(e.target.value)) } }))}
                      style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        background: THEME.card,
                        border: `1px solid ${THEME.border}`,
                        borderRadius: '8px',
                        color: THEME.text,
                      }}
                    >
                      {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                    <span style={{ fontSize: '15px', fontWeight: '600', color }}>{sym}{partner.maxSpend.toLocaleString()}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={stepSize}
                  max={max}
                  step={stepSize}
                  value={partner.maxSpend}
                  onChange={e => setData(d => ({ ...d, [key]: { ...d[key], maxSpend: Number(e.target.value) } }))}
                  style={{ width: '100%', accentColor: color }}
                />
              </div>
            )
          })}

          <button style={btnStyle} onClick={next}>Continue</button>
        </div>
      </div>
    )
  }

  // STEP 3 - Region + vibes
  if (step === 3) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
      <Starfield />
      <div style={containerStyle}>
        {progressBar}
        <button style={backBtnStyle} onClick={back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M15 18l-6-6 6-6"/></svg>
          back
        </button>
        <div style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: THEME.text, marginBottom: '8px', width: '100%', fontWeight: '600' }}>
          What&apos;s the vibe?
        </div>
        <div style={{ fontSize: '14px', color: THEME.muted, marginBottom: '1.75rem', width: '100%' }}>
          Pick your region and travel vibe
        </div>

        {/* Region */}
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '11px', color: THEME.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Where in the world?</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { id: 'surprise', label: 'Surprise us' },
              { id: 'europe', label: 'Europe' },
              { id: 'se_asia', label: 'SE Asia' },
              { id: 'caribbean', label: 'Caribbean' },
              { id: 'latin_america', label: 'Latin America' },
              { id: 'middle_east', label: 'Middle East' },
              { id: 'north_america', label: 'North America' },
              { id: 'africa', label: 'Africa' },
              { id: 'oceania', label: 'Oceania' },
            ].map(r => (
              <div
                key={r.id}
                onClick={() => setData(d => ({ ...d, region: r.id }))}
                style={{
                  padding: '12px 8px',
                  borderRadius: '14px',
                  border: `1px solid ${data.region === r.id ? THEME.accent : THEME.border}`,
                  background: data.region === r.id ? 'rgba(244, 114, 182, 0.1)' : THEME.card,
                  backdropFilter: 'blur(12px)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '500', color: data.region === r.id ? THEME.accent : THEME.muted }}>{r.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Vibes */}
        <div style={{ width: '100%', marginBottom: '1rem' }}>
          <div style={{ fontSize: '11px', color: THEME.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Travel vibe</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {VIBES.map(v => (
              <div
                key={v.id}
                onClick={() => toggleVibe(v.id)}
                style={{
                  padding: '14px',
                  borderRadius: '14px',
                  border: `1px solid ${data.vibes.includes(v.id) ? THEME.accent : THEME.border}`,
                  background: data.vibes.includes(v.id) ? 'rgba(244, 114, 182, 0.1)' : THEME.card,
                  backdropFilter: 'blur(12px)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span style={{ fontSize: '13px', fontWeight: '500', color: data.vibes.includes(v.id) ? THEME.accent : THEME.text }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          style={{ ...btnStyle, ...(data.vibes.length === 0 ? btnDisabledStyle : {}) }}
          disabled={data.vibes.length === 0}
          onClick={next}
        >
          Continue
        </button>
      </div>
    </div>
  )

  // STEP 4 - Dates (meet/explore)
  if (step === 4) return (
    <div style={{ minHeight: '100vh', background: THEME.bg, position: 'relative' }}>
      <Starfield />
      <div style={containerStyle}>
        {progressBar}
        <button style={backBtnStyle} onClick={back}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '4px' }}><path d="M15 18l-6-6 6-6"/></svg>
          back
        </button>
        <div style={{ fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: THEME.text, marginBottom: '8px', width: '100%', fontWeight: '600' }}>
          When are you going?
        </div>
        <div style={{ fontSize: '14px', color: THEME.muted, marginBottom: '1.75rem', width: '100%' }}>
          Pick your travel dates
        </div>
        <CalendarPicker label="Departure" selected={data.dates.from} onChange={v => setData(d => ({ ...d, dates: { ...d.dates, from: v } }))} />
        <CalendarPicker label="Return" selected={data.dates.to} onChange={v => setData(d => ({ ...d, dates: { ...d.dates, to: v } }))} minDate={data.dates.from ? new Date(data.dates.from + 'T00:00:01') : undefined} />
        <button
          style={{ ...btnStyle, ...(!data.dates.from || !data.dates.to ? btnDisabledStyle : {}) }}
          disabled={!data.dates.from || !data.dates.to}
          onClick={() => {
            const isPaid = localStorage.getItem('roamie_paid') === 'true'
            const isBeta = new URLSearchParams(window.location.search).get('beta') === 'true'
            const count = parseInt(localStorage.getItem('roamie_trip_count') || '0')
            if (!isPaid && !isBeta && count >= 3) { navigate('/gate', { state: { data } }); return }
            localStorage.setItem('roamie_trip_count', count + 1)
            posthog.capture('generate_trip_clicked', { mode: data.tripMode, p1_city: data.p1.city, p2_city: data.p2.city, region: data.region, vibes: data.vibes })
            navigate('/results', { state: { data } })
          }}
        >
          Find our trips
        </button>
      </div>
    </div>
  )

  return null
}
