import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

export default function Gate() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = location.state?.data
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const accent = '#FF6B35'

  async function submit() {
    if (!email.includes('@')) return
    setLoading(true)
    try {
      await fetch('https://roamie-61ib.onrender.com/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      localStorage.setItem('roamie_paid', 'true')
      setDone(true)
      setTimeout(() => {
        const count = parseInt(localStorage.getItem('roamie_trip_count') || '0')
        localStorage.setItem('roamie_trip_count', count + 1)
        navigate('/results', { state: { data } })
      }, 1500)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.08) 0%, transparent 70%)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>✦</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        You've found your rhythm.
      </div>
      <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '320px', lineHeight: '1.6' }}>
        You've used your 3 free trips. Drop your email to keep going — no payment needed during beta.
      </div>

      {done ? (
        <div style={{ fontSize: '15px', color: accent, fontWeight: '500' }}>
          ✦ You're in — loading your trips...
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '340px' }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={{ flex: 1, fontSize: '14px', padding: '14px 16px' }}
          />
          <button
            onClick={submit}
            disabled={loading || !email.includes('@')}
            style={{
              background: accent,
              border: 'none',
              borderRadius: '100px',
              padding: '14px 20px',
              color: '#0a0a0a',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'wait' : 'pointer',
              opacity: !email.includes('@') ? 0.4 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? '...' : 'Continue →'}
          </button>
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        style={{ marginTop: '1.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer' }}
      >
        ← back to home
      </button>
    </div>
  )
}