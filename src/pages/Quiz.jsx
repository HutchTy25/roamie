import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import posthog from 'posthog-js'
import { supabase } from '../supabase'

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
  { code: 'TWD', symbol: 'NT$', label: 'TWD' },
  { code: 'HKD', symbol: 'HK$', label: 'HKD' },
  { code: 'CHF', symbol: 'CHF', label: 'CHF' },
  { code: 'SEK', symbol: 'kr', label: 'SEK' },
  { code: 'NOK', symbol: 'kr', label: 'NOK' },
  { code: 'DKK', symbol: 'kr', label: 'DKK' },
  { code: 'PLN', symbol: 'zł', label: 'PLN' },
  { code: 'CZK', symbol: 'Kč', label: 'CZK' },
  { code: 'TRY', symbol: '₺', label: 'TRY' },
  { code: 'ILS', symbol: '₪', label: 'ILS' },
  { code: 'HUF', symbol: 'Ft', label: 'HUF' },
  { code: 'RON', symbol: 'lei', label: 'RON' },
]

const VIBES = [
  { id: 'beach',     label: '🏖️ Beach & Sun' },
  { id: 'city',      label: '🏙️ City & Culture' },
  { id: 'nature',    label: '🌿 Nature & Adventure' },
  { id: 'romantic',  label: '💑 Romantic Escape' },
  { id: 'foodie',    label: '🍜 Foodie Heaven' },
  { id: 'nightlife', label: '🎉 Nightlife & Party' },
  { id: 'history',   label: '🏛️ History & Landmarks' },
  { id: 'winter',    label: '❄️ Winter & Snow' },
  { id: 'wellness',  label: '🧘 Wellness & Relaxation' },
  { id: 'surprise',  label: '🎲 Surprise Us' },
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
  const location = useLocation()
  const [toast, setToast] = useState(null)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const msg = location.state?.message
    if (!msg) return
    setToast(msg)
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!session?.user?.id) return
    async function fetchProfiles() {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('home_city, home_iata, home_currency, couple_id')
          .eq('id', session.user.id)
          .single()

        if (!profile?.home_iata || !profile?.home_currency) return

        const city = (profile.home_city && profile.home_city !== 'skip') ? profile.home_city : ''
        setData(d => ({ ...d, p1: { ...d.p1, city, iata: profile.home_iata, currency: profile.home_currency } }))
        setP1Iata(profile.home_iata)
        setP1IataFound(true)
        setP1Prefilled(true)

        if (!profile.couple_id) return

        const { data: couple } = await supabase
          .from('couples')
          .select('partner1_id, partner2_id')
          .eq('id', profile.couple_id)
          .single()

        const partnerId = couple?.partner1_id === session.user.id ? couple?.partner2_id : couple?.partner1_id
        if (!partnerId) return

        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('home_city, home_iata, home_currency')
          .eq('id', partnerId)
          .single()

        if (!partnerProfile?.home_iata || !partnerProfile?.home_currency) return

        const partnerCity = (partnerProfile.home_city && partnerProfile.home_city !== 'skip') ? partnerProfile.home_city : ''
        setData(d => ({ ...d, p2: { ...d.p2, city: partnerCity, iata: partnerProfile.home_iata, currency: partnerProfile.home_currency } }))
        setP2Iata(partnerProfile.home_iata)
        setP2IataFound(true)
        setP2Prefilled(true)
      } catch {
        // silent fail — leave fields empty
      }
    }
    fetchProfiles()
  }, [session])
  const [p1Suggestions, setP1Suggestions] = useState([])
const [p2Suggestions, setP2Suggestions] = useState([])
const [p1IataFound, setP1IataFound] = useState(false)
const [p2IataFound, setP2IataFound] = useState(false)
const [p1Iata, setP1Iata] = useState('')
const [p2Iata, setP2Iata] = useState('')
const [p1Prefilled, setP1Prefilled] = useState(false)
const [p2Prefilled, setP2Prefilled] = useState(false)
  const [data, setData] = useState({
    p1: { city: '', iata: '', currency: 'USD', maxSpend: 1500 },
    p2: { city: '', iata: '', currency: 'GBP', maxSpend: 1200 },
    vibes: [],
    dates: { from: '', to: '' },
    routing: 'fly_together',
    tripMode: '',
    region: 'surprise',
    accommodation: 'mid',
    sameCity: false,
    syncArrival: false,
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

  async function lookupIata(city, partner) {
  if (city.length < 2) {
    if (partner === 'p1') { setP1Suggestions([]); setP1IataFound(false) }
    else { setP2Suggestions([]); setP2IataFound(false) }
    return
  }
  try {
    const res = await fetch(
      `https://roamie-61ib.onrender.com/api/airport-search?q=${encodeURIComponent(city)}`,
      { headers: {} }
    )
    const json = await res.json()
    if (partner === 'p1') {
      setP1Suggestions(json.suggestions || [])
      setP1IataFound(false)
    } else {
      setP2Suggestions(json.suggestions || [])
      setP2IataFound(false)
    }
  } catch {
    // silent fail
  }
}
  
  function next() {
    setStep(s => {
      if (s === 0 && p1Prefilled && p2Prefilled) return 2
      return s + 1
    })
  }
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
      {toast && (
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
          {toast}
        </div>
      )}
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
  { id: 'visit', icon: '💑', label: 'Visit each other', desc: 'Find the best price for one partner to visit the other', routing: 'visit', locked: false },
  { id: 'meet', icon: '🛬', label: 'Meet somewhere new', desc: 'Both fly independently to a destination you choose together', routing: 'meet', locked: false },
].map(m => (
  <div
    key={m.id}
    onClick={() => {
      if (m.locked) { navigate('/login'); return }
      setData(d => ({ ...d, tripMode: m.id, routing: m.routing, syncArrival: false }))
    }}
    style={{
      padding: '1.25rem',
      borderRadius: '16px',
      border: `1px solid ${data.tripMode === m.id ? THEME.accent : THEME.border}`,
      background: data.tripMode === m.id ? 'rgba(244, 114, 182, 0.1)' : THEME.card,
      backdropFilter: 'blur(20px)',
      cursor: m.locked ? 'pointer' : 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      
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
    
    
  </div>
))}
        </div>

        {data.tripMode === 'meet' && (
          <div
            onClick={() => setData(d => ({ ...d, syncArrival: !d.syncArrival }))}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '1.25rem',
              borderRadius: '16px',
              border: `1px solid ${data.syncArrival ? THEME.cyan : THEME.border}`,
              background: data.syncArrival ? 'rgba(34, 211, 238, 0.08)' : THEME.card,
              backdropFilter: 'blur(20px)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              marginBottom: '1rem',
              boxShadow: data.syncArrival ? '0 0 30px rgba(34, 211, 238, 0.15)' : 'none',
            }}
          >
            <div style={{ fontSize: '2rem', flexShrink: 0 }}>⏱️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: data.syncArrival ? THEME.cyan : THEME.text, marginBottom: '3px' }}>
                Sync Arrival
              </div>
              <div style={{ fontSize: '12px', color: THEME.muted, lineHeight: '1.5' }}>
                Find flights that land within 60 minutes of each other
              </div>
            </div>
            <div style={{
              width: '40px', height: '22px', borderRadius: '11px',
              background: data.syncArrival ? THEME.cyan : 'rgba(255,255,255,0.15)',
              position: 'relative', transition: 'all 0.2s', flexShrink: 0,
            }}>
              <div style={{
                width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                position: 'absolute', top: '2px',
                left: data.syncArrival ? '20px' : '2px',
                transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }} />
            </div>
          </div>
        )}

      <button
  onClick={() => navigate('/')}
  style={{ background: 'none', border: 'none', color: THEME.muted, fontSize: '13px', cursor: 'pointer', marginBottom: '1rem', display: 'block', width: '100%' }}
>
  ← Back to home
</button>

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
           <div style={{ position: 'relative' }}>
  <input
    type="text"
    placeholder="e.g. Memphis"
    value={data.p1.city}
    onChange={e => {
      const val = e.target.value
      setData(d => ({ ...d, p1: { ...d.p1, city: val }, p2: d.sameCity ? { ...d.p2, city: val } : d.p2 }))
      setP1IataFound(false)
      lookupIata(val, 'p1')
    }}
    style={{ ...inputStyle, border: `1px solid ${p1IataFound ? 'rgba(34,211,238,0.5)' : THEME.border}` }}
  />
  {p1IataFound && (
    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: '600', color: THEME.cyan, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '6px', padding: '2px 8px' }}>
      {p1Iata}
    </div>
  )}
  {p1Suggestions.length > 0 && !p1IataFound && (
    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'rgba(30,32,48,0.98)', border: `1px solid ${THEME.border}`, borderRadius: '14px', overflow: 'hidden', zIndex: 100 }}>
      {p1Suggestions.map((s, i) => (
        <div
          key={s.iata}
          onClick={() => {
  setData(d => ({ ...d, p1: { ...d.p1, city: s.city.charAt(0).toUpperCase() + s.city.slice(1), iata: s.iata }, p2: d.sameCity ? { ...d.p2, city: s.city.charAt(0).toUpperCase() + s.city.slice(1), iata: s.iata } : d.p2 }))
  setP1Iata(s.iata)
  setP1IataFound(true)
  setP1Suggestions([])
}}
          style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: i < p1Suggestions.length - 1 ? `1px solid ${THEME.border}` : 'none', fontSize: '14px', color: THEME.text }}
        >
          <div>
  <div style={{ textTransform: 'capitalize', fontSize: '14px', color: THEME.text }}>{s.city}</div>
  <div style={{ fontSize: '11px', color: THEME.muted }}>{s.airport}</div>
</div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.cyan, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '6px', padding: '2px 8px' }}>{s.iata}</span>
        </div>
      ))}
    </div>
  )}
</div> 
          </div>
          {!data.sameCity && (
            <div>
              <div style={{ fontSize: '11px', color: THEME.primary, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
                {data.tripMode === 'visit' ? "Partner's city" : 'Partner 2'}
              </div>
            <div style={{ position: 'relative' }}>
  <input
    type="text"
    placeholder="e.g. Manchester"
    value={data.p2.city}
    onChange={e => {
      const val = e.target.value
      setData(d => ({ ...d, p2: { ...d.p2, city: val } }))
      setP2IataFound(false)
      lookupIata(val, 'p2')
    }}
    style={{ ...inputStyle, border: `1px solid ${p2IataFound ? 'rgba(34,211,238,0.5)' : THEME.border}` }}
  />
  {p2IataFound && (
    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', fontWeight: '600', color: THEME.cyan, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '6px', padding: '2px 8px' }}>
      {p2Iata}
    </div>
  )}
  {p2Suggestions.length > 0 && !p2IataFound && (
    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'rgba(30,32,48,0.98)', border: `1px solid ${THEME.border}`, borderRadius: '14px', overflow: 'hidden', zIndex: 100 }}>
      {p2Suggestions.map((s, i) => (
        <div
          key={s.iata}
          onClick={() => {
  setData(d => ({ ...d, p2: { ...d.p2, city: s.city.charAt(0).toUpperCase() + s.city.slice(1), iata: s.iata } }))
  setP2Iata(s.iata)
  setP2IataFound(true)
  setP2Suggestions([])
}}
          style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: i < p2Suggestions.length - 1 ? `1px solid ${THEME.border}` : 'none', fontSize: '14px', color: THEME.text }}
        >
          <div>
  <div style={{ textTransform: 'capitalize', fontSize: '14px', color: THEME.text }}>{s.city}</div>
  <div style={{ fontSize: '11px', color: THEME.muted }}>{s.airport}</div>
</div>
          <span style={{ fontSize: '12px', fontWeight: '600', color: THEME.cyan, background: 'rgba(34,211,238,0.1)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '6px', padding: '2px 8px' }}>{s.iata}</span>
        </div>
      ))}
    </div>
  )}
</div>  
            </div>
          )}
        </div>

        {p1IataFound && p2IataFound && p1Iata && p2Iata && p1Iata === p2Iata && (
          <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: '13px', marginBottom: '8px', padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px' }}>
            Looks like you both selected the same airport — is that right?
          </div>
        )}

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
              { id: 'se_asia',   label: 'Southeast Asia' },
              { id: 'east_asia', label: 'East Asia' },
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
            posthog.capture('generate_trip_clicked', { mode: data.tripMode, p1_city: data.p1.city, p2_city: data.p2.city, region: data.region, vibes: data.vibes })
            posthog.capture('search_started', { routing: data.routing, vibes: data.vibes, has_partner: !!data.p2.city })
            // Discovery-first: land on the cheap pre-commit screen; the live path
            // (flight-prices + Call 2) runs only after a card is chosen.
            navigate('/discover', { state: { data } })
          }}
        >
          Find our trips
        </button>
      </div>
    </div>
  )

  return null
}
