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

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1))
  }

  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1))
  }

  function selectDay(day) {
    if (!day) return
    const date = new Date(year, month, day)
    date.setHours(0,0,0,0)
    if (date < min) return
    onChange(date.toISOString().split('T')[0])
  }

  function isSelected(day) {
    if (!day || !selected) return false
    const d = new Date(year, month, day)
    return d.toISOString().split('T')[0] === selected
  }

  function isDisabled(day) {
    if (!day) return true
    const d = new Date(year, month, day)
    d.setHours(0,0,0,0)
    return d < min
  }

  function isToday(day) {
    if (!day) return false
    const d = new Date(year, month, day)
    return d.toISOString().split('T')[0] === today.toISOString().split('T')[0]
  }

  const accent = '#FF6B35'

  return (
    <div style={{ width: '100%', marginBottom: '1rem' }}>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{
        background: 'rgba(20,20,20,0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '1.25rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}>
        {/* Quick jump pills */}
<div style={{ display: 'flex', gap: '6px', marginBottom: '1rem', justifyContent: 'center' }}>
  {[3, 6, 9].map(months => (
    <button
      key={months}
      onClick={() => {
        const d = new Date()
        d.setMonth(d.getMonth() + months)
        setViewDate(d)
      }}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '100px',
        padding: '4px 12px',
        fontSize: '11px',
        color: 'rgba(255,255,255,0.45)',
        cursor: 'pointer',
        letterSpacing: '0.05em',
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
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >←</button>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', color: 'rgba(255,255,255,0.9)' }}>
            {monthNames[month]} {year}
          </div>
          <button
            onClick={nextMonth}
            style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >→</button>
        </div>

        {/* Day names */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '6px' }}>
          {dayNames.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)', padding: '4px 0', fontWeight: '500' }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
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
                background: isSelected(day) ? accent : isToday(day) ? 'rgba(255,107,53,0.12)' : 'transparent',
                color: isSelected(day) ? '#0a0a0a' : isDisabled(day) ? 'rgba(255,255,255,0.15)' : isToday(day) ? accent : 'rgba(255,255,255,0.8)',
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
  region: 'surprise',
  accommodation: 'mid',
  sameCity: false,
})
  const accent = '#FF6B35'
  const accentSoft = 'rgba(255,107,53,0.12)'
  const accentBorder = 'rgba(255,107,53,0.35)'
  const totalSteps = 4

  function getCurrencySymbol(code) {
    return CURRENCIES.find(c => c.code === code)?.symbol || code
  }

  function getMaxSpend(currency) {
    const highs = {
      JPY: 2000000, KRW: 5000000, IDR: 50000000,
      VND: 100000000, CLP: 5000000, COP: 20000000,
      NGN: 5000000, PKR: 1000000, BDT: 500000,
    }
    return highs[currency] || 15000
  }

  function getStepSize(currency) {
    const steps = {
      JPY: 10000, KRW: 50000, IDR: 500000,
      VND: 1000000, CLP: 50000, COP: 200000,
      NGN: 50000, PKR: 10000, BDT: 5000,
    }
    return steps[currency] || 50
  }

  function toggleVibe(id) {
    const arr = data.vibes
    const next = arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id]
    setData(d => ({ ...d, vibes: next }))
  }

  function next() { setStep(s => s + 1) }
  function back() { setStep(s => s - 1) }

  const progress = Math.round(((step + 1) / totalSteps) * 100)

  const base = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.25rem',
      maxWidth: '520px',
      margin: '0 auto',
      width: '100%',
    },
    progress: {
      width: '100%',
      height: '3px',
      background: 'var(--border)',
      borderRadius: '2px',
      marginBottom: '2.5rem',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: '2px',
      background: accent,
      width: progress + '%',
      transition: 'width 0.4s ease',
    },
    question: {
      fontFamily: "'Playfair Display', serif",
      fontSize: 'clamp(1.6rem, 5vw, 2rem)',
      fontWeight: '400',
      lineHeight: '1.2',
      marginBottom: '0.4rem',
      color: 'var(--text-primary)',
      width: '100%',
    },
    sub: {
      fontSize: '14px',
      color: 'var(--text-secondary)',
      marginBottom: '1.75rem',
      width: '100%',
    },
    btn: {
      width: '100%',
      padding: '16px',
      background: accent,
      color: '#0a0a0a',
      fontSize: '15px',
      fontWeight: '600',
      borderRadius: '100px',
      marginTop: '1.5rem',
      border: 'none',
      cursor: 'pointer',
      transition: 'opacity 0.2s',
    },
    btnDisabled: {
      opacity: 0.4,
      cursor: 'not-allowed',
    },
    back: {
      background: 'none',
      border: 'none',
      color: 'var(--text-muted)',
      fontSize: '13px',
      cursor: 'pointer',
      marginBottom: '2rem',
      padding: '0',
      display: 'block',
      width: '100%',
      textAlign: 'left',
    },
  }

  const steps = [

    // Step 0 — Both cities side by side
    <div style={base.container}>
      <div style={base.progress}><div style={base.progressFill} /></div>
      {/* Region selector */}
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
      <div
        key={r.id}
        onClick={() => setData(d => ({ ...d, region: r.id }))}
        style={{
          padding: '10px 8px',
          borderRadius: 'var(--radius)',
          border: `1px solid ${data.region === r.id ? accentBorder : 'var(--border)'}`,
          background: data.region === r.id ? accentSoft : 'var(--bg-card)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '20px', marginBottom: '4px' }}>{r.emoji}</div>
        <div style={{ fontSize: '11px', fontWeight: '500', color: data.region === r.id ? accent : 'var(--text-secondary)' }}>{r.label}</div>
      </div>
    ))}
  </div>
</div>
      {/* Same city toggle */}
<div
  onClick={() => setData(d => ({ ...d, sameCity: !d.sameCity, p2: { ...d.p2, city: !d.sameCity ? d.p1.city : '' } }))}
  style={{
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '1rem',
    cursor: 'pointer',
    padding: '10px 14px',
    borderRadius: 'var(--radius)',
    border: `1px solid ${data.sameCity ? accentBorder : 'var(--border)'}`,
    background: data.sameCity ? accentSoft : 'var(--bg-card)',
  }}
>
  <div style={{
    width: '36px',
    height: '20px',
    borderRadius: '10px',
    background: data.sameCity ? accent : 'rgba(255,255,255,0.15)',
    position: 'relative',
    transition: 'all 0.2s',
    flexShrink: 0,
  }}>
    <div style={{
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: 'white',
      position: 'absolute',
      top: '2px',
      left: data.sameCity ? '18px' : '2px',
      transition: 'all 0.2s',
    }} />
  </div>
  <div style={{ fontSize: '13px', color: data.sameCity ? accent : 'var(--text-secondary)' }}>
    We're based in the same city
  </div>
</div>

{/* City inputs */}
<div style={{ display: 'grid', gridTemplateColumns: data.sameCity ? '1fr' : '1fr 1fr', gap: '12px', width: '100%', marginBottom: '1rem', transition: 'all 0.3s' }}>
  <div>
    <div style={{ fontSize: '11px', color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>
      {data.sameCity ? 'Your city' : 'Partner 1'}
    </div>
    <input
      type="text"
      placeholder="e.g. Memphis"
      value={data.p1.city}
      onChange={e => setData(d => ({
        ...d,
        p1: { ...d.p1, city: e.target.value },
        p2: d.sameCity ? { ...d.p2, city: e.target.value } : d.p2
      }))}
    />
  </div>
  {!data.sameCity && (
    <div>
      <div style={{ fontSize: '11px', color: '#9c7ec4', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '500' }}>Partner 2</div>
      <input
        type="text"
        placeholder="e.g. London"
        value={data.p2.city}
        onChange={e => setData(d => ({ ...d, p2: { ...d.p2, city: e.target.value } }))}
      />
    </div>
  )}
</div>
      {/* Routing selector */}
      <div style={{ width: '100%', marginTop: '0.5rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>How are you getting there?</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
  !data.sameCity && { id: 'fly_together', label: '✈️ Fly to each other first, then together', desc: 'One flies to the other, then you both fly to destination' },
  { id: 'meet', label: data.sameCity ? '✈️ Fly together from same city' : '🛬 Meet at the destination', desc: data.sameCity ? 'Both flying from the same origin' : 'Both fly separately to the same place' },
  { id: 'drive', label: '🚗 Drive', desc: 'One or both partners driving' },
].filter(Boolean).map(r => (
            <div
              key={r.id}
              onClick={() => setData(d => ({ ...d, routing: r.id }))}
              style={{
                padding: '12px 14px',
                borderRadius: 'var(--radius)',
                border: `1px solid ${data.routing === r.id ? accentBorder : 'var(--border)'}`,
                background: data.routing === r.id ? accentSoft : 'var(--bg-card)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: '500', color: data.routing === r.id ? accent : 'var(--text-primary)', marginBottom: '2px' }}>{r.label}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <button
        style={{ ...base.btn, ...((!data.p1.city.trim() || !data.p2.city.trim()) ? base.btnDisabled : {}) }}
        disabled={!data.p1.city.trim() || !data.p2.city.trim()}
        onClick={next}
      >
        Continue
      </button>
    </div>,

    // Step 1 — Both budgets side by side
    <div style={base.container}>
      <div style={base.progress}><div style={base.progressFill} /></div>
      <button style={base.back} onClick={back}>← back</button>
      {/* Accommodation tier */}
<div style={{ width: '100%', marginBottom: '1.5rem' }}>
  <div style={{ fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' }}>Accommodation style</div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
    {[
      { id: 'budget', label: 'Budget', emoji: '🎒', desc: 'Hostels & budget hotels' },
      { id: 'mid', label: 'Mid-range', emoji: '🏨', desc: '3-star & Airbnbs' },
      { id: 'luxe', label: 'Luxe', emoji: '🥂', desc: 'Boutique & 4-5 star' },
    ].map(t => (
      <div
        key={t.id}
        onClick={() => setData(d => ({ ...d, accommodation: t.id }))}
        style={{
          padding: '12px 8px',
          borderRadius: 'var(--radius)',
          border: `1px solid ${data.accommodation === t.id ? accentBorder : 'var(--border)'}`,
          background: data.accommodation === t.id ? accentSoft : 'var(--bg-card)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '22px', marginBottom: '4px' }}>{t.emoji}</div>
        <div style={{ fontSize: '12px', fontWeight: '500', color: data.accommodation === t.id ? accent : 'var(--text-primary)', marginBottom: '2px' }}>{t.label}</div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t.desc}</div>
      </div>
    ))}
  </div>
</div>
      <div style={base.question}>What are your budgets?</div>
      <div style={base.sub}>Max each person wants to spend — this is a hard ceiling</div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%' }}>
        {/* Partner 1 budget */}
        <div style={{ background: 'var(--bg-card)', border: `1px solid ${accentBorder}`, borderRadius: 'var(--radius)', padding: '1rem' }}>
          <div style={{ fontSize: '11px', color: accent, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '500' }}>Partner 1</div>
          <select
            value={data.p1.currency}
            onChange={e => setData(d => ({ ...d, p1: { ...d.p1, currency: e.target.value, maxSpend: 1500 } }))}
            style={{ marginBottom: '12px', fontSize: '13px', padding: '8px 10px' }}
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input
            type="range"
            min="100"
            max={getMaxSpend(data.p1.currency)}
            step={getStepSize(data.p1.currency)}
            value={data.p1.maxSpend}
            onChange={e => setData(d => ({ ...d, p1: { ...d.p1, maxSpend: parseInt(e.target.value) } }))}
          />
          <div style={{ fontSize: '22px', fontWeight: '500', color: accent, fontFamily: "'Playfair Display', serif", marginTop: '8px' }}>
            {getCurrencySymbol(data.p1.currency)}{data.p1.maxSpend.toLocaleString()}
          </div>
        </div>

        {/* Partner 2 budget */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(156,126,196,0.35)', borderRadius: 'var(--radius)', padding: '1rem' }}>
          <div style={{ fontSize: '11px', color: '#9c7ec4', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px', fontWeight: '500' }}>Partner 2</div>
          <select
            value={data.p2.currency}
            onChange={e => setData(d => ({ ...d, p2: { ...d.p2, currency: e.target.value, maxSpend: 1200 } }))}
            style={{ marginBottom: '12px', fontSize: '13px', padding: '8px 10px' }}
          >
            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input
            type="range"
            min="100"
            max={getMaxSpend(data.p2.currency)}
            step={getStepSize(data.p2.currency)}
            value={data.p2.maxSpend}
            onChange={e => setData(d => ({ ...d, p2: { ...d.p2, maxSpend: parseInt(e.target.value) } }))}
          />
          <div style={{ fontSize: '22px', fontWeight: '500', color: '#9c7ec4', fontFamily: "'Playfair Display', serif", marginTop: '8px' }}>
            {getCurrencySymbol(data.p2.currency)}{data.p2.maxSpend.toLocaleString()}
          </div>
        </div>
      </div>

      <button style={base.btn} onClick={next}>Continue</button>
    </div>,

    // Step 2 — Vibe selection
    <div style={base.container}>
      <div style={base.progress}><div style={base.progressFill} /></div>
      <button style={base.back} onClick={back}>← back</button>
      <div style={base.question}>What's the vibe?</div>
      <div style={base.sub}>Pick everything that feels right for both of you</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', marginBottom: '0.5rem' }}>
        {VIBES.map(v => {
          const selected = data.vibes.includes(v.id)
          return (
            <div
              key={v.id}
              onClick={() => toggleVibe(v.id)}
              style={{
                background: selected ? accentSoft : v.bg,
                border: `1px solid ${selected ? accent : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '1.1rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '6px' }}>{v.emoji}</div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: selected ? accent : 'var(--text-primary)' }}>{v.label}</div>
            </div>
          )
        })}
      </div>
      <button
        style={{ ...base.btn, ...(data.vibes.length === 0 ? base.btnDisabled : {}) }}
        disabled={data.vibes.length === 0}
        onClick={next}
      >
        Continue
      </button>
    </div>,

   // Step 3 — Dates
<div style={base.container}>
  <div style={base.progress}><div style={base.progressFill} /></div>
  <button style={base.back} onClick={back}>← back</button>
  <div style={base.question}>When are you thinking?</div>
  <div style={base.sub}>Approximate window is fine</div>

  <CalendarPicker
    label="Departure"
    selected={data.dates.from}
    onChange={date => setData(d => ({ ...d, dates: { ...d.dates, from: date } }))}
    minDate={new Date()}
  />
  <CalendarPicker
    label="Return"
    selected={data.dates.to}
    onChange={date => setData(d => ({ ...d, dates: { ...d.dates, to: date } }))}
    minDate={data.dates.from ? new Date(data.dates.from) : new Date()}
  />

  <button
    style={{ ...base.btn, ...(!data.dates.from || !data.dates.to ? base.btnDisabled : {}) }}
    disabled={!data.dates.from || !data.dates.to}
    onClick={() => {
      const count = parseInt(localStorage.getItem('roamie_trip_count') || '0')
      localStorage.setItem('roamie_trip_count', count + 1)
      posthog.capture('generate_trip_clicked', {
        p1_city: data.p1.city,
        p2_city: data.p2.city,
        region: data.region,
        vibe_count: data.vibes.length,
        accommodation: data.accommodation,
        trip_number: count + 1,
      })
      navigate('/results', { state: { data } })
    }}
  >
    Find our trips ✦
  </button>
</div>,
  ]

  const currentStep = steps[step]
  return currentStep
    ? <div key={step} style={{ animation: 'fadeSlideUp 0.4s ease forwards', display: 'flex', justifyContent: 'center', width: '100%' }}>{currentStep}</div>
    : null
}