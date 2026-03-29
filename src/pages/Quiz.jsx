import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD — US Dollar' },
  { code: 'GBP', symbol: '£', label: 'GBP — British Pound' },
  { code: 'EUR', symbol: '€', label: 'EUR — Euro' },
  { code: 'CAD', symbol: 'C$', label: 'CAD — Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD — Australian Dollar' },
  { code: 'NZD', symbol: 'NZ$', label: 'NZD — New Zealand Dollar' },
  { code: 'JPY', symbol: '¥', label: 'JPY — Japanese Yen' },
  { code: 'CNY', symbol: '¥', label: 'CNY — Chinese Yuan' },
  { code: 'KRW', symbol: '₩', label: 'KRW — South Korean Won' },
  { code: 'PHP', symbol: '₱', label: 'PHP — Philippine Peso' },
  { code: 'IDR', symbol: 'Rp', label: 'IDR — Indonesian Rupiah' },
  { code: 'MYR', symbol: 'RM', label: 'MYR — Malaysian Ringgit' },
  { code: 'THB', symbol: '฿', label: 'THB — Thai Baht' },
  { code: 'VND', symbol: '₫', label: 'VND — Vietnamese Dong' },
  { code: 'SGD', symbol: 'S$', label: 'SGD — Singapore Dollar' },
  { code: 'INR', symbol: '₹', label: 'INR — Indian Rupee' },
  { code: 'PKR', symbol: '₨', label: 'PKR — Pakistani Rupee' },
  { code: 'BDT', symbol: '৳', label: 'BDT — Bangladeshi Taka' },
  { code: 'NGN', symbol: '₦', label: 'NGN — Nigerian Naira' },
  { code: 'GHS', symbol: 'GH₵', label: 'GHS — Ghanaian Cedi' },
  { code: 'KES', symbol: 'KSh', label: 'KES — Kenyan Shilling' },
  { code: 'ZAR', symbol: 'R', label: 'ZAR — South African Rand' },
  { code: 'EGP', symbol: 'E£', label: 'EGP — Egyptian Pound' },
  { code: 'AED', symbol: 'AED', label: 'AED — UAE Dirham' },
  { code: 'SAR', symbol: '﷼', label: 'SAR — Saudi Riyal' },
  { code: 'BRL', symbol: 'R$', label: 'BRL — Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', label: 'MXN — Mexican Peso' },
  { code: 'COP', symbol: 'COL$', label: 'COP — Colombian Peso' },
  { code: 'ARS', symbol: 'AR$', label: 'ARS — Argentine Peso' },
  { code: 'CLP', symbol: 'CL$', label: 'CLP — Chilean Peso' },
]

const VIBES = [
  { id: 'beach', label: 'Beach & sun', emoji: '🏖️', bg: '#0d1f1a' },
  { id: 'city', label: 'City & culture', emoji: '🏙️', bg: '#0d1520' },
  { id: 'nature', label: 'Nature & adventure', emoji: '🏔️', bg: '#111a0d' },
  { id: 'romantic', label: 'Romantic escape', emoji: '💫', bg: '#1a0d14' },
  { id: 'history', label: 'History & art', emoji: '🏛️', bg: '#1a160d' },
  { id: 'food', label: 'Food & nightlife', emoji: '🍷', bg: '#1a0d0d' },
]

const ROUTING = [
  { id: 'fly_together', label: 'Fly to each other first, then together', desc: 'Partner 1 flies to Partner 2, then you fly to destination together' },
  { id: 'meet', label: 'Meet at the destination', desc: 'Both fly separately to the same place' },
  { id: 'drive', label: 'Drive', desc: 'One or both partners driving to the destination' },
]

export default function Quiz() {
  const fadeStyle = {
  animation: 'fadeSlideUp 0.4s ease forwards',
}
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    p1: { city: '', currency: 'USD', maxSpend: 1500, vibes: [] },
    p2: { city: '', currency: 'GBP', maxSpend: 1200, vibes: [] },
    dates: { from: '', to: '' },
    routing: 'fly_together',
  })

  const totalSteps = 10
  const progress = Math.round((step / totalSteps) * 100)

  function updateP1(key, val) { setData(d => ({ ...d, p1: { ...d.p1, [key]: val } })) }
  function updateP2(key, val) { setData(d => ({ ...d, p2: { ...d.p2, [key]: val } })) }

  function toggleVibe(partner, id) {
    const arr = data[partner].vibes
    const next = arr.includes(id) ? arr.filter(v => v !== id) : [...arr, id]
    if (partner === 'p1') updateP1('vibes', next)
    else updateP2('vibes', next)
  }

  function getCurrencySymbol(code) {
    return CURRENCIES.find(c => c.code === code)?.symbol || code
  }
function getCurrencySymbol(code) {
    return CURRENCIES.find(c => c.code === code)?.symbol || code
  }

  function getMaxSpend(currency) {
    const highs = {
      JPY: 2000000,
      KRW: 5000000,
      IDR: 50000000,
      VND: 100000000,
      CLP: 5000000,
      COP: 20000000,
      NGN: 5000000,
      PKR: 1000000,
      BDT: 500000,
    }
    return highs[currency] || 15000
  }

  function getStepSize(currency) {
    const steps = {
      JPY: 10000,
      KRW: 50000,
      IDR: 500000,
      VND: 1000000,
      CLP: 50000,
      COP: 200000,
      NGN: 50000,
      PKR: 10000,
      BDT: 5000,
    }
    return steps[currency] || 50
  }

  function next() { setStep(s => s + 1) }
  function back() { setStep(s => s - 1) }

  function goToResults() {
    setStep(8)
  }

  const s = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      maxWidth: '480px',
      width: '100%',
    },
    progressWrap: {
      width: '100%',
      height: '2px',
      background: 'var(--border)',
      borderRadius: '2px',
      marginBottom: '3rem',
    },
    progressFill: {
      height: '100%',
      borderRadius: '2px',
      background: 'var(--accent)',
      width: progress + '%',
      transition: 'width 0.4s ease',
    },
    badge: {
      fontSize: '11px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--accent)',
      marginBottom: '1rem',
      fontWeight: '500',
    },
    question: {
      fontFamily: "'Playfair Display', serif",
      fontSize: 'clamp(1.6rem, 5vw, 2rem)',
      fontWeight: '400',
      lineHeight: '1.2',
      marginBottom: '0.5rem',
      color: 'var(--text-primary)',
      width: '100%',
    },
    sub: {
      fontSize: '14px',
      color: 'var(--text-secondary)',
      marginBottom: '2rem',
      width: '100%',
    },
    btnPrimary: {
      width: '100%',
      padding: '16px',
      background: 'var(--accent)',
      color: '#0a0a0a',
      fontSize: '15px',
      fontWeight: '600',
      borderRadius: '100px',
      marginTop: '1.5rem',
      transition: 'opacity 0.2s',
    },
    btnBack: {
      background: 'none',
      color: 'var(--text-muted)',
      fontSize: '13px',
      marginBottom: '2rem',
      padding: '0',
      display: 'block',
      width: '100%',
      textAlign: 'left',
    },
    vibeGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      width: '100%',
      marginBottom: '0.5rem',
    },
    routingOption: (selected) => ({
      padding: '16px',
      borderRadius: 'var(--radius)',
      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
      background: selected ? 'var(--accent-soft)' : 'var(--bg-card)',
      cursor: 'pointer',
      marginBottom: '10px',
      transition: 'all 0.2s',
      width: '100%',
    }),
  }

  const steps = [
    // Step 0 — Partner 1 city
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <div style={s.badge}>Partner 1</div>
      <div style={s.question}>Where are you based?</div>
      <div style={s.sub}>Your home city</div>
      <input
        type="text"
        placeholder="e.g. New York, Lagos, Toronto..."
        value={data.p1.city}
        onChange={e => updateP1('city', e.target.value)}
      />
      <button
        style={s.btnPrimary}
        disabled={!data.p1.city.trim()}
        onClick={next}
      >
        Continue
      </button>
    </div>,

    // Step 1 — Partner 1 currency + max spend
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <button style={s.btnBack} onClick={back}>← back</button>
      <div style={s.badge}>Partner 1</div>
      <div style={s.question}>Your budget</div>
      <div style={s.sub}>Currency and max you want to spend on this trip</div>
      <select value={data.p1.currency} onChange={e => {
  updateP1('currency', e.target.value)
  updateP1('maxSpend', 1500)
}} style={{ marginBottom: '1rem' }}>
        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <div style={{ width: '100%', marginBottom: '0.5rem' }}>
        <input
  type="range"
  min="100"
  max={getMaxSpend(data.p1.currency)}
  step={getStepSize(data.p1.currency)}
  value={data.p1.maxSpend}
  onChange={e => updateP1('maxSpend', parseInt(e.target.value))}
        />
        <div style={{ fontSize: '32px', fontWeight: '500', color: 'var(--accent)', marginTop: '0.5rem', fontFamily: "'Playfair Display', serif" }}>
          {getCurrencySymbol(data.p1.currency)}{data.p1.maxSpend.toLocaleString()}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>maximum spend</div>
      </div>
      <button style={s.btnPrimary} onClick={next}>Continue</button>
    </div>,

    // Step 2 — Partner 1 vibes
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <button style={s.btnBack} onClick={back}>← back</button>
      <div style={s.badge}>Partner 1</div>
      <div style={s.question}>What's your travel vibe?</div>
      <div style={s.sub}>Pick everything that fits</div>
      <div style={s.vibeGrid}>
        {VIBES.map(v => {
          const selected = data.p1.vibes.includes(v.id)
          return (
            <div
              key={v.id}
              onClick={() => toggleVibe('p1', v.id)}
              style={{
                background: selected ? 'var(--accent-soft)' : v.bg,
                border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{v.emoji}</div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: selected ? 'var(--accent)' : 'var(--text-primary)' }}>{v.label}</div>
            </div>
          )
        })}
      </div>
      <button style={s.btnPrimary} disabled={data.p1.vibes.length === 0} onClick={next}>Continue</button>
    </div>,

    // Step 3 — Partner 2 city
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <button style={s.btnBack} onClick={back}>← back</button>
      <div style={{ ...s.badge, color: '#9c7ec4' }}>Partner 2</div>
      <div style={s.question}>Where are you based?</div>
      <div style={s.sub}>Their home city</div>
      <input
        type="text"
        placeholder="e.g. London, Manchester, Dublin..."
        value={data.p2.city}
        onChange={e => updateP2('city', e.target.value)}
      />
      <button style={s.btnPrimary} disabled={!data.p2.city.trim()} onClick={next}>Continue</button>
    </div>,

    // Step 4 — Partner 2 currency + max spend
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <button style={s.btnBack} onClick={back}>← back</button>
      <div style={{ ...s.badge, color: '#9c7ec4' }}>Partner 2</div>
      <div style={s.question}>Their budget</div>
      <div style={s.sub}>Currency and max they want to spend</div>
      <select value={data.p2.currency} onChange={e => {
  updateP2('currency', e.target.value)
  updateP2('maxSpend', 1200)
}} style={{ marginBottom: '1rem' }}>
        {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
      </select>
      <div style={{ width: '100%', marginBottom: '0.5rem' }}>
        <input
  type="range"
  min="100"
  max={getMaxSpend(data.p2.currency)}
  step={getStepSize(data.p2.currency)}
  value={data.p2.maxSpend}
  onChange={e => updateP2('maxSpend', parseInt(e.target.value))}
/>
        <div style={{ fontSize: '32px', fontWeight: '500', color: '#9c7ec4', marginTop: '0.5rem', fontFamily: "'Playfair Display', serif" }}>
          {getCurrencySymbol(data.p2.currency)}{data.p2.maxSpend.toLocaleString()}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>maximum spend</div>
      </div>
      <button style={s.btnPrimary} onClick={next}>Continue</button>
    </div>,

    // Step 5 — Partner 2 vibes
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <button style={s.btnBack} onClick={back}>← back</button>
      <div style={{ ...s.badge, color: '#9c7ec4' }}>Partner 2</div>
      <div style={s.question}>Their travel vibe?</div>
      <div style={s.sub}>Pick everything that fits</div>
      <div style={s.vibeGrid}>
        {VIBES.map(v => {
          const selected = data.p2.vibes.includes(v.id)
          return (
            <div
              key={v.id}
              onClick={() => toggleVibe('p2', v.id)}
              style={{
                background: selected ? 'rgba(156,126,196,0.12)' : v.bg,
                border: `1px solid ${selected ? '#9c7ec4' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                padding: '1.25rem 1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{v.emoji}</div>
              <div style={{ fontSize: '13px', fontWeight: '500', color: selected ? '#9c7ec4' : 'var(--text-primary)' }}>{v.label}</div>
            </div>
          )
        })}
      </div>
      <button style={{ ...s.btnPrimary, background: '#9c7ec4' }} disabled={data.p2.vibes.length === 0} onClick={next}>Continue</button>
    </div>,

    // Step 6 — Travel dates
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <button style={s.btnBack} onClick={back}>← back</button>
      <div style={s.badge}>Trip details</div>
      <div style={s.question}>When are you thinking?</div>
      <div style={s.sub}>Select your travel window</div>
      <div style={{ width: '100%', marginBottom: '1rem' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>From</div>
        <DatePicker
          selected={data.dates.from ? new Date(data.dates.from) : null}
          onChange={date => setData(d => ({ ...d, dates: { ...d.dates, from: date.toISOString().split('T')[0] } }))}
          minDate={new Date()}
          placeholderText="Departure date"
          dateFormat="MMM d, yyyy"
          customInput={
            <input style={{
              width: '100%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              padding: '14px 16px',
              cursor: 'pointer',
            }} />
          }
        />
      </div>
      <div style={{ width: '100%', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>To</div>
        <DatePicker
          selected={data.dates.to ? new Date(data.dates.to) : null}
          onChange={date => setData(d => ({ ...d, dates: { ...d.dates, to: date.toISOString().split('T')[0] } }))}
          minDate={data.dates.from ? new Date(data.dates.from) : new Date()}
          placeholderText="Return date"
          dateFormat="MMM d, yyyy"
          customInput={
            <input style={{
              width: '100%',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: '15px',
              padding: '14px 16px',
              cursor: 'pointer',
            }} />
          }
        />
      </div>
      <button style={s.btnPrimary} disabled={!data.dates.from || !data.dates.to} onClick={next}>Continue</button>
    </div>,

    // Step 7 — Routing
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <button style={s.btnBack} onClick={back}>← back</button>
      <div style={s.badge}>Trip details</div>
      <div style={s.question}>How do you plan to get there?</div>
      <div style={s.sub}>This changes the full cost calculation</div>
      {ROUTING.map(r => (
        <div key={r.id} style={s.routingOption(data.routing === r.id)} onClick={() => setData(d => ({ ...d, routing: r.id }))}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: data.routing === r.id ? 'var(--accent)' : 'var(--text-primary)', marginBottom: '4px' }}>{r.label}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.desc}</div>
        </div>
      ))}
      <button style={s.btnPrimary} onClick={goToResults}>Find our trips ✦</button>
    </div>,
 
    // Step 8 — Review
    <div style={s.container}>
      <div style={s.progressWrap}><div style={s.progressFill} /></div>
      <button style={s.btnBack} onClick={back}>← back</button>
      <div style={s.badge}>Review</div>
      <div style={s.question}>Looks good?</div>
      <div style={s.sub}>Check your details before we find your trips</div>

      <div style={{ width: '100%', marginBottom: '1rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '10px' }}>Partner 1</div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>City</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{data.p1.city}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Max spend</span>
            <span style={{ fontSize: '13px', color: 'var(--accent)' }}>{getCurrencySymbol(data.p1.currency)}{data.p1.maxSpend.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Vibes</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{data.p1.vibes.join(', ')}</span>
          </div>
        </div>

        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9c7ec4', marginBottom: '10px', marginTop: '1rem' }}>Partner 2</div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>City</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{data.p2.city}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Max spend</span>
            <span style={{ fontSize: '13px', color: '#9c7ec4' }}>{getCurrencySymbol(data.p2.currency)}{data.p2.maxSpend.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Vibes</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{data.p2.vibes.join(', ')}</span>
          </div>
        </div>

        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px', marginTop: '1rem' }}>Trip</div>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Dates</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{data.dates.from} → {data.dates.to}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Routing</span>
            <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
              {data.routing === 'fly_together' ? 'Fly together' : data.routing === 'meet' ? 'Meet there' : 'Drive'}
            </span>
          </div>
        </div>
      </div>

      <button style={s.btnPrimary} onClick={() => navigate('/results', { state: { data } })}>
        Find our trips ✦
      </button>
    </div> 
]

console.log('Current step:', step, 'Steps length:', steps.length)
const currentStep = steps[step]
return currentStep 
  ? <div key={step} style={{
      animation: 'fadeSlideUp 0.4s ease forwards',
      display: 'flex',
      justifyContent: 'center',
      width: '100%',
    }}>{currentStep}</div>
  : <div style={{color:'white', padding:'2rem'}}>Step {step} not found</div>
}