import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import posthog from 'posthog-js'

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
  { id: 'beach', label: 'Beach & sun', emoji: '🏖️', bg: '#0d1f1a' },
  { id: 'city', label: 'City & culture', emoji: '🏙️', bg: '#0d1520' },
  { id: 'nature', label: 'Nature & adventure', emoji: '🏔️', bg: '#111a0d' },
  { id: 'romantic', label: 'Romantic escape', emoji: '💫', bg: '#1a0d14' },
  { id: 'foodie', label: 'Foodie & nightlife', emoji: '🍜', bg: '#1a100d' },
  { id: 'landmarks', label: 'Landmark chaser', emoji: '🏛️', bg: '#1a160d' },
  { id: 'surprise', label: 'Surprise us', emoji: '✨', bg: '#12101a' },
]

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
  const accent = '#FF6B35'
  return (
    <div style={{ width: '100%', marginBottom: '1rem' }}>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ background: 'rgba(20,20,20,0.95)', backdropFilter: 'blur(20px)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '1.25rem', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', justifyContent: 'center' }}>
          {[3, 6, 9].map(months => (
            <button key={months} onClick={() => { const d = new Date(); d.setMonth(d.getMonth() + months); setViewDate(d) }} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '100px', padding: '4px 12px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', cursor: 'pointer' }}>+{months}mo</button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <button onClick={prevMonth} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', color: 'rgba(255,255,255,0.9)' }}>{monthNames[month]} {year}</div>
          <button onClick={nextMonth} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
          {dayNames.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)', padding: '4px 0', fontWeight: '500' }}>{d}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
          {cells.map((day, i) => (
            <div key={i} onClick={() => selectDay(day)} style={{ textAlign: 'center', padding: '10px 0', borderRadius: '10px', fontSize: '13px', fontWeight: isSelected(day) ? '600' : '400', cursor: day && !isDisabled(day) ? 'pointer' : 'default', background: isSelected(day) ? accent : isToday(day) ? 'rgba(255,107,53,0.12)' : 'transparent', color: isSelected(day) ? '#0a0a0a' : isDisabled(day) ? 'rgba(255,255,255,0.15)' : isToday(day) ? accent : 'rgba(255,255,255,0.8)', transition: 'all 0.15s', userSelect: 'none' }}>
              {day || ''}
            </div>
          ))}
        </div>
        {selected && (
          <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '13px', color: accent, fontWeight: '500' }}>
            {new Date(selected + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Quiz() {
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
  const accent = '#FF6B35'
  const accentSoft = 'rgba(255,107,53,0.12)'
  const accentBorder = 'rgba(255,107,53,0.35)'
  const purple = '#9c7ec4'
  const purpleSoft = 'rgba(156,126,196,0.12)'
  const purpleBorder = 'rgba(156,126,196,0.35)'

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

  const base = {
    container: { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', maxWidth: '520px', margin: '0 auto', width: '100%' },
    btn: { width: '100%', padding: '16px', background: accent, color: '#0a0a0a', fontSize: '15px', fontWeight: '600', borderRadius: '100px', marginTop: '1.5rem', border: 'none', cursor: 'pointer', transition: 'opacity 0.2s' },
    btnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
    back: { background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer', marginBottom: '2rem', padding: '0', display: 'block', width: '100%', textAlign: 'left' },
  }

  // Total steps depends on mode
  const totalSteps = data.tripMode === 'visit' ? 3 : 5

  const progress = Math.round(((step) / totalSteps) * 100)

  const progressBar = (
    <div style={{ width: '100%', height: '3px', background: 'var(--border)', borderRadius: '2px', marginBottom: '2.5rem', overflow: 'hidden' }}>
      <div style={{ height: '100%', borderRadius: '2px', background: accent, width: progress + '%', transition: 'width 0.4s ease' }} />
    </div>
  )

  // STEP 0 — Mode selector + cities
  if (step === 0) return (
    <div style={base.container}>
      <div style={{ width: '100%', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: 'var(--text-primary)', marginBottom: '8px' }}>
          What's the plan?
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Tell us what you're thinking and we'll handle the rest
        </div>
      </div>

      {/* Three mode buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', marginBottom: '2rem' }}>
        {[
          { id: 'visit', emoji: '💑', label: 'Visit each other', desc: 'Find the best price for one partner to visit the other', routing: 'visit' },
          { id: 'meet', emoji: '🛬', label: 'Meet somewhere new', desc: 'Both fly independently to a destination you choose together', routing: 'meet' },
          { id: 'explore', emoji: '✈️', label: 'Explore together', desc: 'AI finds destinations and figures out the smartest way to get there', routing: 'fly_together' },
        ].map(m => (
          <div
            key={m.id}
            onClick={() => setData(d => ({ ...d, tripMode: m.id, routing: m.routing }))}
            style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius)',
              border: `1px solid ${data.tripMode === m.id ? accentBorder : 'var(--border)'}`,
              background: data.tripMode === m.id ? accentSoft : 'var(--bg-card)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
            }}
          >
            <div style={{ fontSize: '2rem', flexShrink: 0 }}>{m.emoji}</div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: data.tripMode === m.id ? accent : 'var(--text-primary)', marginBottom: '3px' }}>{m.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{m.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        style={{ ...base.btn, ...(!data.tripMode ? base.btnDisabled : {}) }}
        disabled={!data.tripMode}
        onClick={next}
      >
        Continue
      </button>
    </div>
  )

  // STEP 1 — City inputs (all modes)
  if (step === 1) return (
    <div style={base.container}>
      {progressBar}
      <button style={base.back} onClick={back}>← back</button>

      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: 'var(--text-primary)', marginBottom: '8px', width: '100%' }}>
        Where are you both based?
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1.75rem', width: '100%' }}>
        Enter your home cities so we can find real flight prices
      </div>

      {/* Same city toggle — only for meet/explore */}
      {data.tripMode !== 'visit' && (
        <div
          onClick={() => setData(d => ({ ...d, sameCity: !d.sameCity, p2: { ...d.p2, city: !d.sameCity ? d.p1.city : '' } }))}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem', cursor: 'pointer', padding: '10px 14px', borderRadius: 'var(--radius)', border: `1px solid ${data.sameCity ? accentBorder : 'var(--border)'}`, background: data.sameCity ? accentSoft : 'var(--bg-card)', width: '100%' }}
        >
          <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: data.sameCity ? accent : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'all 0.2s', flexShrink: 0 }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: data.sameCity ? '18px' : '2px', transition: 'all 0.2s' }} />
          </div>
          <div style={{ fontSize: '13px', color: data.sameCity ? accent : 'var(--text-secondary)' }}>We're based in the same city</div>
        </div>
      )}

      {/* City inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: data.sameCity ? '1fr' : '1fr 1fr', gap: '12px', width: '100%', marginBottom: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
            {data.sameCity ? 'Your city' : data.tripMode === 'visit' ? 'Your city' : 'Partner 1'}
          </div>
          <input
            type="text"
            placeholder="e.g. Memphis"
            value={data.p1.city}
            onChange={e => setData(d => ({ ...d, p1: { ...d.p1, city: e.target.value }, p2: d.sameCity ? { ...d.p2, city: e.target.value } : d.p2 }))}
          />
        </div>
        {!data.sameCity && (
          <div>
            <div style={{ fontSize: '11px', color: purple, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
              {data.tripMode === 'visit' ? "Partner's city" : 'Partner 2'}
            </div>
            <input
              type="text"
              placeholder="e.g. Manchester"
              value={data.p2.city}
              onChange={e => setData(d => ({ ...d, p2: { ...d.p2, city: e.target.value } }))}
            />
          </div>
        )}
      </div>

      <button
        style={{ ...base.btn, ...(!data.p1.city.trim() || (!data.sameCity && !data.p2.city.trim()) ? base.btnDisabled : {}) }}
        disabled={!data.p1.city.trim() || (!data.sameCity && !data.p2.city.trim())}
        onClick={next}
      >
        Continue
      </button>
    </div>
  )

  // STEP 2 — Visit mode: just dates. Meet/Explore: budget
  if (step === 2) {
    
    // VISIT MODE — just dates
    if (data.tripMode === 'visit') return (
      <div style={base.container}>
        {progressBar}
        <button style={base.back} onClick={back}>← back</button>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: 'var(--text-primary)', marginBottom: '8px', width: '100%' }}>
          When are you visiting?
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1.75rem', width: '100%' }}>
          Pick your travel dates and we'll find real flight prices
        </div>
        <CalendarPicker label="Departure" selected={data.dates.from} onChange={v => setData(d => ({ ...d, dates: { ...d.dates, from: v } }))} />
        <CalendarPicker label="Return" selected={data.dates.to} onChange={v => setData(d => ({ ...d, dates: { ...d.dates, to: v } }))} minDate={data.dates.from ? new Date(data.dates.from + 'T00:00:01') : undefined} />
        <button
          style={{ ...base.btn, ...(!data.dates.from || !data.dates.to ? base.btnDisabled : {}) }}
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
          Find flights ✦
        </button>
      </div>
    )

    // MEET/EXPLORE MODE — budget
    return (
      <div style={base.container}>
        {progressBar}
        <button style={base.back} onClick={back}>← back</button>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: 'var(--text-primary)', marginBottom: '8px', width: '100%' }}>
          What's your budget?
        </div>
        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1.75rem', width: '100%' }}>
          Total per person including flights, stay and food
        </div>

        {/* Accommodation */}
        <div style={{ width: '100%', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Accommodation style</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { id: 'budget', label: 'Budget', emoji: '🏡', desc: 'Hostels & budget hotels' },
              { id: 'mid', label: 'Mid-range', emoji: '🏨', desc: '3★ hotels & Airbnbs' },
              { id: 'luxe', label: 'Luxe', emoji: '🏰', desc: 'Boutique 4-5★ hotels' },
            ].map(a => (
              <div key={a.id} onClick={() => setData(d => ({ ...d, accommodation: a.id }))} style={{ padding: '10px 8px', borderRadius: 'var(--radius)', border: `1px solid ${data.accommodation === a.id ? accentBorder : 'var(--border)'}`, background: data.accommodation === a.id ? accentSoft : 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{a.emoji}</div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: data.accommodation === a.id ? accent : 'var(--text-primary)', marginBottom: '2px' }}>{a.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget sliders */}
        {[
          { key: 'p1', label: 'Partner 1 budget', color: accent },
          { key: 'p2', label: 'Partner 2 budget', color: purple },
        ].map(({ key, label, color }) => {
          const partner = data[key]
          const sym = getCurrencySymbol(partner.currency)
          const max = getMaxSpend(partner.currency)
          const step = getStepSize(partner.currency)
          return (
            <div key={key} style={{ width: '100%', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: '500' }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select value={partner.currency} onChange={e => setData(d => ({ ...d, [key]: { ...d[key], currency: e.target.value, maxSpend: Math.min(d[key].maxSpend, getMaxSpend(e.target.value)) } }))} style={{ fontSize: '12px', padding: '4px 8px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}>
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                  <span style={{ fontSize: '15px', fontWeight: '600', color }}>{sym}{partner.maxSpend.toLocaleString()}</span>
                </div>
              </div>
              <input type="range" min={step} max={max} step={step} value={partner.maxSpend} onChange={e => setData(d => ({ ...d, [key]: { ...d[key], maxSpend: Number(e.target.value) } }))} style={{ width: '100%', accentColor: color }} />
            </div>
          )
        })}

        <button style={base.btn} onClick={next}>Continue</button>
      </div>
    )
  }

  // STEP 3 — Meet/Explore: region + vibes
  if (step === 3) return (
    <div style={base.container}>
      {progressBar}
      <button style={base.back} onClick={back}>← back</button>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: 'var(--text-primary)', marginBottom: '8px', width: '100%' }}>
        What's the vibe?
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1.75rem', width: '100%' }}>
        Pick your region and travel vibe
      </div>

      {/* Region */}
      <div style={{ width: '100%', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Where in the world?</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {[
            { id: 'surprise', label: 'Surprise us', emoji: '🌍' },
            { id: 'europe', label: 'Europe', emoji: '🏰' },
            { id: 'se_asia', label: 'SE Asia', emoji: '🌏' },
            { id: 'caribbean', label: 'Caribbean', emoji: '🏝️' },
            { id: 'latin_america', label: 'Latin America', emoji: '🌎' },
            { id: 'middle_east', label: 'Middle East', emoji: '🕌' },
            { id: 'north_america', label: 'North America', emoji: '🗽' },
            { id: 'africa', label: 'Africa', emoji: '🦁' },
            { id: 'oceania', label: 'Oceania', emoji: '🦘' },
          ].map(r => (
            <div key={r.id} onClick={() => setData(d => ({ ...d, region: r.id }))} style={{ padding: '10px 8px', borderRadius: 'var(--radius)', border: `1px solid ${data.region === r.id ? accentBorder : 'var(--border)'}`, background: data.region === r.id ? accentSoft : 'var(--bg-card)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{r.emoji}</div>
              <div style={{ fontSize: '11px', fontWeight: '500', color: data.region === r.id ? accent : 'var(--text-secondary)' }}>{r.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Vibes */}
      <div style={{ width: '100%', marginBottom: '1rem' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Travel vibe</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {VIBES.map(v => (
            <div key={v.id} onClick={() => toggleVibe(v.id)} style={{ padding: '14px', borderRadius: 'var(--radius)', border: `1px solid ${data.vibes.includes(v.id) ? accentBorder : 'var(--border)'}`, background: data.vibes.includes(v.id) ? accentSoft : v.bg, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>{v.emoji}</span>
              <span style={{ fontSize: '13px', fontWeight: '500', color: data.vibes.includes(v.id) ? accent : 'var(--text-primary)' }}>{v.label}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        style={{ ...base.btn, ...(data.vibes.length === 0 ? base.btnDisabled : {}) }}
        disabled={data.vibes.length === 0}
        onClick={next}
      >
        Continue
      </button>
    </div>
  )

  // STEP 4 — Dates (meet/explore)
  if (step === 4) return (
    <div style={base.container}>
      {progressBar}
      <button style={base.back} onClick={back}>← back</button>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 5vw, 2rem)', color: 'var(--text-primary)', marginBottom: '8px', width: '100%' }}>
        When are you going?
      </div>
      <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '1.75rem', width: '100%' }}>
        Pick your travel dates
      </div>
      <CalendarPicker label="Departure" selected={data.dates.from} onChange={v => setData(d => ({ ...d, dates: { ...d.dates, from: v } }))} />
      <CalendarPicker label="Return" selected={data.dates.to} onChange={v => setData(d => ({ ...d, dates: { ...d.dates, to: v } }))} minDate={data.dates.from ? new Date(data.dates.from + 'T00:00:01') : undefined} />
      <button
        style={{ ...base.btn, ...(!data.dates.from || !data.dates.to ? base.btnDisabled : {}) }}
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
        Find our trips ✦
      </button>
    </div>
  )

  return null
}