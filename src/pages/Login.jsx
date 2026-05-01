import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/')
    })
  }, [])

  async function signInWithGoogle() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  async function sendMagicLink() {
    if (!email.includes('@')) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` }
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
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
    }}>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulseGlow { 0%,100%{box-shadow:0 0 20px rgba(124,106,239,0.3)} 50%{box-shadow:0 0 40px rgba(124,106,239,0.5)} }
      `}</style>

      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? '2px' : '1px',
          height: i % 3 === 0 ? '2px' : '1px',
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
        top: '-30%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '500px',
        background: 'radial-gradient(ellipse, rgba(124,106,239,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        fontSize: '2.5rem',
        marginBottom: '1rem',
        animation: 'float 4s ease-in-out infinite',
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="20" fill="url(#logoGrad)" />
          <path d="M16 24C16 20 20 16 24 16C28 16 32 20 32 24" stroke="#1A1B26" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="20" cy="22" r="2" fill="#1A1B26"/>
          <circle cx="28" cy="22" r="2" fill="#1A1B26"/>
          <defs>
            <linearGradient id="logoGrad" x1="4" y1="4" x2="44" y2="44">
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
        Welcome to Roamie
      </div>
      <div style={{ 
        fontSize: '15px', 
        color: '#8B8FA3', 
        marginBottom: '2.5rem', 
        maxWidth: '300px', 
        lineHeight: '1.6',
        textAlign: 'center',
      }}>
        Sign in to save your trips and sync with your partner
      </div>

      {/* Google Sign In */}
      <button
        onClick={signInWithGoogle}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(255,255,255,0.95)',
          border: 'none',
          borderRadius: '100px',
          padding: '14px 28px',
          fontSize: '15px',
          fontWeight: '600',
          color: '#1a1a1a',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          marginBottom: '1.5rem',
          width: '100%',
          maxWidth: '320px',
          justifyContent: 'center',
        }}
      >
        <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google" />
        Continue with Google
      </button>

      {/* Divider */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        maxWidth: '320px',
        marginBottom: '1.5rem',
      }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(124,106,239,0.2)' }} />
        <div style={{ fontSize: '12px', color: '#8B8FA3' }}>or</div>
        <div style={{ flex: 1, height: '1px', background: 'rgba(124,106,239,0.2)' }} />
      </div>

      {/* Magic Link */}
      {sent ? (
        <div style={{
          background: 'rgba(124,106,239,0.1)',
          border: '1px solid rgba(124,106,239,0.3)',
          borderRadius: '16px',
          padding: '1.5rem',
          maxWidth: '320px',
          width: '100%',
          backdropFilter: 'blur(20px)',
          textAlign: 'center',
        }}>
          <div style={{ marginBottom: '12px' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="rgba(124,106,239,0.2)"/>
              <path d="M8 12L16 17L24 12" stroke="#7C6AEF" strokeWidth="2" strokeLinecap="round"/>
              <rect x="6" y="10" width="20" height="14" rx="2" stroke="#7C6AEF" strokeWidth="2"/>
            </svg>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '6px', color: '#E8E8ED' }}>
            Check your email
          </div>
          <div style={{ fontSize: '13px', color: '#8B8FA3', lineHeight: '1.6' }}>
            We sent a magic link to <strong style={{ color: '#F472B6' }}>{email}</strong>. Click it to sign in.
          </div>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMagicLink()}
            style={{
              width: '100%',
              padding: '14px 18px',
              background: 'rgba(30,32,48,0.8)',
              border: '1px solid rgba(124,106,239,0.2)',
              borderRadius: '100px',
              fontSize: '15px',
              color: '#E8E8ED',
              marginBottom: '12px',
              outline: 'none',
              backdropFilter: 'blur(10px)',
            }}
          />
          <button
            onClick={sendMagicLink}
            disabled={loading || !email.includes('@')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #F472B6, #7C6AEF)',
              border: 'none',
              borderRadius: '100px',
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff',
              cursor: loading ? 'wait' : 'pointer',
              opacity: !email.includes('@') ? 0.4 : 1,
              boxShadow: '0 0 30px rgba(124,106,239,0.4)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '12px 20px',
          background: 'rgba(255,107,107,0.1)',
          border: '1px solid rgba(255,107,107,0.3)',
          borderRadius: '100px',
          fontSize: '13px',
          color: '#FF6B6B',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '2rem',
          background: 'none',
          border: 'none',
          color: '#8B8FA3',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        Back to home
      </button>
    </div>
  )
}