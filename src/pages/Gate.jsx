import { useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'

export default function Gate() {
  const navigate = useNavigate()
  const location = useLocation()
  const data = location.state?.data
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

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
      background: '#1A1B26',
      position: 'relative',
      overflow: 'hidden',
      textAlign: 'center',
    }}>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes pulseGlow { 0%,100%{opacity:0.6} 50%{opacity:1} }
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
          animation: `twinkle ${3 + Math.random() * 2}s ease-in-out infinite ${Math.random() * 2}s`,
        }} />
      ))}

      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(244,114,182,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Star icon */}
      <div style={{ 
        marginBottom: '1.5rem',
        animation: 'pulseGlow 3s ease-in-out infinite',
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <path d="M24 4L28 18H42L30 28L34 42L24 32L14 42L18 28L6 18H20L24 4Z" 
                fill="url(#starGrad)" 
                filter="drop-shadow(0 0 12px rgba(244,114,182,0.6))"/>
          <defs>
            <linearGradient id="starGrad" x1="6" y1="4" x2="42" y2="42">
              <stop stopColor="#F472B6"/>
              <stop offset="1" stopColor="#7C6AEF"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div style={{ 
        fontFamily: "'Geist', sans-serif", 
        fontSize: '1.8rem', 
        fontWeight: '600',
        marginBottom: '0.5rem',
        color: '#E8E8ED',
      }}>
        {"You've found your rhythm."}
      </div>
      <div style={{ 
        fontSize: '15px', 
        color: '#8B8FA3', 
        marginBottom: '2rem', 
        maxWidth: '320px', 
        lineHeight: '1.6' 
      }}>
        {"You've used your 3 free trips. Drop your email to keep going — no payment needed during beta."}
      </div>

      {done ? (
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '15px', 
          color: '#F472B6', 
          fontWeight: '500',
          padding: '14px 24px',
          background: 'rgba(244,114,182,0.1)',
          borderRadius: '100px',
          border: '1px solid rgba(244,114,182,0.3)',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 2L9.5 6.5H14L10.5 9.5L12 14L8 11L4 14L5.5 9.5L2 6.5H6.5L8 2Z" fill="#F472B6"/>
          </svg>
          {"You're in — loading your trips..."}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', width: '100%', maxWidth: '340px' }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={{ 
              flex: 1, 
              fontSize: '14px', 
              padding: '14px 18px',
              background: 'rgba(30,32,48,0.8)',
              border: '1px solid rgba(124,106,239,0.2)',
              borderRadius: '100px',
              color: '#E8E8ED',
              outline: 'none',
            }}
          />
          <button
            onClick={submit}
            disabled={loading || !email.includes('@')}
            style={{
              background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
              border: 'none',
              borderRadius: '100px',
              padding: '14px 20px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'wait' : 'pointer',
              opacity: !email.includes('@') ? 0.4 : 1,
              whiteSpace: 'nowrap',
              boxShadow: '0 0 24px rgba(244,114,182,0.4)',
            }}
          >
            {loading ? '...' : 'Continue'}
          </button>
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        style={{ 
          marginTop: '1.5rem', 
          background: 'none', 
          border: 'none', 
          color: '#8B8FA3', 
          fontSize: '13px', 
          cursor: 'pointer' 
        }}
      >
        Back to home
      </button>
    </div>
  )
}