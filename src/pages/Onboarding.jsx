import { useState, useEffect } from 'react'
import { useNavigate, useNavigationType } from 'react-router-dom'
import { supabase } from '../supabase'

const C = {
  bg: '#000000',
  card: '#121214',
  gold: '#C9A05C',
  goldSoft: 'rgba(201,160,92,0.14)',
  blue: '#6FA8C9',
  text: '#F2F1ED',
  muted: '#5E6066',
  border: 'rgba(255,255,255,0.10)',
}
const serif = "'Playfair Display', Georgia, serif"

const CURRENCIES = [
  { code: 'USD', symbol: '$' }, { code: 'GBP', symbol: '£' }, { code: 'EUR', symbol: '€' },
  { code: 'CAD', symbol: 'C$' }, { code: 'AUD', symbol: 'A$' }, { code: 'NZD', symbol: 'NZ$' },
  { code: 'JPY', symbol: '¥' }, { code: 'CNY', symbol: '¥' }, { code: 'KRW', symbol: '₩' },
  { code: 'PHP', symbol: '₱' }, { code: 'IDR', symbol: 'Rp' }, { code: 'MYR', symbol: 'RM' },
  { code: 'THB', symbol: '฿' }, { code: 'VND', symbol: '₫' }, { code: 'SGD', symbol: 'S$' },
  { code: 'INR', symbol: '₹' }, { code: 'PKR', symbol: '₨' }, { code: 'BDT', symbol: '৳' },
  { code: 'NGN', symbol: '₦' }, { code: 'GHS', symbol: 'GH₵' }, { code: 'KES', symbol: 'KSh' },
  { code: 'ZAR', symbol: 'R' }, { code: 'EGP', symbol: 'E£' }, { code: 'AED', symbol: 'AED' },
  { code: 'SAR', symbol: '﷼' }, { code: 'BRL', symbol: 'R$' }, { code: 'MXN', symbol: 'MX$' },
  { code: 'COP', symbol: 'COL$' }, { code: 'ARS', symbol: 'AR$' }, { code: 'CLP', symbol: 'CL$' },
]

// Staggered content-entrance per element, matching the rest of the app.
const rise = (delay) => ({ className: 'roamie-rise', style: { animationDelay: `${delay}ms` } })

// Gold CTA with a satisfying press (subtle scale + glow). Inline styles only.
function GoldButton({ children, onClick, disabled, style }) {
  const [pressed, setPressed] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        width: '100%', padding: '16px', border: 'none', borderRadius: '16px',
        background: disabled ? 'rgba(201,160,92,0.25)' : C.gold,
        color: disabled ? 'rgba(0,0,0,0.5)' : '#1a1408',
        fontSize: '15px', fontWeight: '600', letterSpacing: '-0.01em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transform: pressed && !disabled ? 'scale(0.97)' : 'scale(1)',
        boxShadow: disabled ? 'none' : (pressed ? '0 0 0 rgba(201,160,92,0)' : '0 8px 28px -10px rgba(201,160,92,0.7)'),
        transition: 'transform 0.12s ease, box-shadow 0.2s ease, background 0.2s ease',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

const textBtn = {
  background: 'none', border: 'none', color: C.muted, fontSize: '13px',
  cursor: 'pointer', marginTop: '20px', display: 'block', width: '100%', padding: '4px',
}

export default function Onboarding({ session, onComplete }) {
  const navigate = useNavigate()
  const navType = useNavigationType()
  const [step, setStep] = useState(0)
  // Slide direction: seeded from how we arrived (POP = back), then driven by the
  // wizard step direction. 1 = forward (slide from right), -1 = back (from left).
  const [dir, setDir] = useState(navType === 'POP' ? -1 : 1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cityFocus, setCityFocus] = useState(false)
  const [nameFocus, setNameFocus] = useState(false)

  const [displayName, setDisplayName] = useState(
    session?.user?.user_metadata?.full_name?.split(' ')[0] || ''
  )
  const [homeCity, setHomeCity] = useState('')
  const [homeCurrency, setHomeCurrency] = useState('USD')

  // Onboarding writes to the signed-in user's profile, so it requires a session.
  // Reaching it logged out (or after the session lapses) redirects to login —
  // matching the guard Dashboard/TripDetail use.
  useEffect(() => {
    if (!session) navigate('/login')
  }, [session, navigate])

  const go = (next) => { setDir(next > step ? 1 : -1); setStep(next) }

  async function finish() {
    if (!session?.user?.id) { navigate('/login'); return }
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim() || null,
          home_city: homeCity.trim() || null,
          home_iata: null,
          home_currency: homeCurrency || null,
        })
        .eq('id', session.user.id)
      if (err) {
        // Full Supabase error object (message / details / hint / code).
        console.error('[Onboarding] profiles UPDATE failed:', err, {
          code: err.code, message: err.message, details: err.details, hint: err.hint,
          userId: session?.user?.id,
        })
        throw err
      }
      await onComplete()
      navigate('/dashboard')
    } catch (e) {
      // Catches the Supabase error above, or a JS error (e.g. missing session,
      // onComplete/navigate throwing) — log before the user-facing message.
      console.error('[Onboarding] finish() failed:', e, '| had session.user.id:', !!session?.user?.id)
      setError('Something went wrong. Try again.')
      setSaving(false)
    }
  }

  const page = {
    position: 'relative', zIndex: 1, minHeight: '100vh',
    display: 'flex', flexDirection: 'column',
    padding: 'calc(56px + env(safe-area-inset-top)) 28px calc(40px + env(safe-area-inset-bottom))',
    maxWidth: '430px', margin: '0 auto', background: C.bg,
  }

  const input = (focused) => ({
    width: '100%', padding: '16px 0', background: 'transparent',
    border: 'none', borderBottom: `1.5px solid ${focused ? C.gold : C.border}`,
    fontSize: '20px', color: C.text, outline: 'none',
    fontFamily: 'inherit', letterSpacing: '-0.01em',
    transition: 'border-color 0.25s ease',
  })

  const helper = { fontSize: '13px', color: C.muted, marginTop: '14px', lineHeight: 1.6 }
  const question = { fontFamily: serif, fontSize: '30px', fontWeight: '600', color: C.text, lineHeight: 1.18, letterSpacing: '-0.01em', margin: 0 }

  // Progress dots for steps 1-2 (welcome has none).
  const dots = (active) => (
    <div style={{ display: 'flex', gap: '7px', marginBottom: '36px' }}>
      {[1, 2].map(i => (
        <div key={i} style={{
          width: i === active ? '22px' : '7px', height: '7px', borderRadius: '4px',
          background: i === active ? C.gold : (i < active ? 'rgba(201,160,92,0.45)' : C.border),
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  )

  return (
    <div style={{ background: C.bg, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Keyed per step: re-mounts on step change to run the directional screen
          slide (forward from right / back from left), matching the rest of the app. */}
      <div key={step} className={dir === 1 ? 'roamie-screen-forward' : 'roamie-screen-back'}>
        {/* ===== Screen 0 — Welcome ===== */}
        {step === 0 && (
          <div style={page}>
            <div style={{ textAlign: 'center', paddingTop: '8px' }} {...rise(0)}>
              <span style={{ fontFamily: serif, fontSize: '17px', fontWeight: '600', letterSpacing: '0.04em', color: C.text }}>
                Roamie
              </span>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <h1 style={{ fontFamily: serif, fontSize: '40px', fontWeight: '600', color: C.text, lineHeight: 1.12, letterSpacing: '-0.015em', margin: 0, maxWidth: '300px', animationDelay: '80ms' }} className="roamie-rise">
                Your trips, finally organized.
              </h1>
              <p style={{ fontSize: '15px', color: C.muted, lineHeight: 1.6, margin: '20px 0 0', maxWidth: '280px', animationDelay: '160ms' }} className="roamie-rise">
                Every reservation, every cost, every detail — in one calm place you and your partner share.
              </p>
            </div>

            <div {...rise(240)}>
              <GoldButton onClick={() => go(1)}>Get started</GoldButton>
            </div>
          </div>
        )}

        {/* ===== Screen 1 — Your name ===== */}
        {step === 1 && (
          <div style={page}>
            {dots(1)}
            <div style={{ flex: 1 }}>
              <h2 style={{ ...question, animationDelay: '40ms' }} className="roamie-rise">What should we call you?</h2>
              <input
                type="text"
                placeholder="Your first name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                onFocus={() => setNameFocus(true)}
                onBlur={() => setNameFocus(false)}
                onKeyDown={e => e.key === 'Enter' && displayName.trim() && go(2)}
                className="roamie-rise"
                style={{ ...input(nameFocus), marginTop: '36px', animationDelay: '110ms' }}
                autoFocus
              />
              <p style={{ ...helper, animationDelay: '170ms' }} className="roamie-rise">This is how your partner will see you.</p>
            </div>
            <div {...rise(230)}>
              <GoldButton onClick={() => go(2)} disabled={!displayName.trim()}>Continue</GoldButton>
              <button onClick={() => go(0)} style={textBtn}>Back</button>
            </div>
          </div>
        )}

        {/* ===== Screen 2 — Your home base ===== */}
        {step === 2 && (
          <div style={page}>
            {dots(2)}
            <div style={{ flex: 1 }}>
              <h2 style={{ ...question, animationDelay: '40ms' }} className="roamie-rise">Where are you based?</h2>

              <input
                type="text"
                placeholder="Your city"
                value={homeCity}
                onChange={e => setHomeCity(e.target.value)}
                onFocus={() => setCityFocus(true)}
                onBlur={() => setCityFocus(false)}
                className="roamie-rise"
                style={{ ...input(cityFocus), marginTop: '36px', animationDelay: '110ms' }}
                autoFocus
              />

              <div className="roamie-rise" style={{ position: 'relative', marginTop: '28px', animationDelay: '170ms' }}>
                <select
                  value={homeCurrency}
                  onChange={e => setHomeCurrency(e.target.value)}
                  style={{
                    ...input(false), cursor: 'pointer', appearance: 'none',
                    WebkitAppearance: 'none', paddingRight: '28px', colorScheme: 'dark',
                  }}
                >
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code} style={{ background: C.card, color: C.text }}>
                      {c.code} {c.symbol}
                    </option>
                  ))}
                </select>
                <span aria-hidden style={{ position: 'absolute', right: '2px', top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: '12px', pointerEvents: 'none' }}>▾</span>
              </div>

              <p style={{ ...helper, animationDelay: '230ms' }} className="roamie-rise">We use this to show prices in your currency.</p>
              {error && <p style={{ ...helper, color: '#E5675F' }}>{error}</p>}
            </div>

            <div {...rise(290)}>
              <GoldButton onClick={finish} disabled={!homeCity.trim() || saving} style={saving ? { cursor: 'wait' } : undefined}>
                {saving ? 'Setting up…' : 'Continue'}
              </GoldButton>
              <button onClick={() => go(1)} style={textBtn} disabled={saving}>Back</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
