import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const C = { bg: '#000000', card: '#121214', gold: '#C9A05C', text: '#F2F1ED', muted: '#5E6066' }
const serif = "'Playfair Display', Georgia, serif"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [otp, setOtp] = useState('')
  const [checking, setChecking] = useState(true)   // gate render until the session check resolves

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard')   // already signed in → straight to the app
      else setChecking(false)               // no session → show the login form
    })
  }, [])

  async function signInWithGoogle() {
    setLoading(true)
    const redirectTo = `${window.location.origin}/dashboard`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
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
      type: 'email',
      options: { shouldCreateUser: true, emailRedirectTo: null }
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

async function verifyOtp() {
    if (otp.length !== 6) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    })
    if (error) {
      setError(error.message)
    } else {
      navigate('/dashboard')
    }
    setLoading(false)
  }

  // Hold a plain black screen until the session check resolves, so the form
  // never flashes before a redirect.
  if (checking) {
    return <div style={{ minHeight: '100vh', background: '#000000' }} />
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1.5rem',
      background: C.bg,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* ambient gold glow */}
      <div aria-hidden style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: '600px', height: '420px', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(201,160,92,0.10) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />

      {/* Wordmark */}
      <div style={{ fontFamily: serif, fontSize: '28px', fontWeight: 600, letterSpacing: '-0.01em', color: C.text, marginBottom: '1.75rem' }}>
        Roamie
      </div>

      <div style={{ fontFamily: serif, fontSize: '1.9rem', fontWeight: '600', marginBottom: '0.5rem', color: C.text, textAlign: 'center' }}>
        Welcome to Roamie
      </div>
      <div style={{ fontSize: '15px', color: C.muted, marginBottom: '2.5rem', maxWidth: '300px', lineHeight: '1.6', textAlign: 'center' }}>
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
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
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
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <div style={{ fontSize: '12px', color: C.muted }}>or</div>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Magic Link */}
      {sent ? (
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{
            background: 'rgba(201,160,92,0.10)',
            border: '1px solid rgba(201,160,92,0.3)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '6px', color: C.text }}>
              Check your email
            </div>
            <div style={{ fontSize: '13px', color: C.muted, lineHeight: '1.6' }}>
              We sent a 6-digit code to <strong style={{ color: C.gold }}>{email}</strong>
            </div>
          </div>
          <input
            type="number"
            placeholder="000000"
            value={otp}
            onChange={e => setOtp(e.target.value.slice(0, 6))}
            onKeyDown={e => e.key === 'Enter' && verifyOtp()}
            autoFocus
            style={{
              width: '100%',
              padding: '14px 18px',
              background: C.card,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '100px',
              fontSize: '22px',
              color: C.text,
              marginBottom: '12px',
              outline: 'none',
              textAlign: 'center',
              letterSpacing: '0.3em',
            }}
          />
          <button
            onClick={verifyOtp}
            disabled={loading || otp.length !== 6}
            style={{
              width: '100%',
              padding: '14px',
              background: C.gold,
              border: 'none',
              borderRadius: '100px',
              fontSize: '15px',
              fontWeight: '600',
              color: '#000',
              cursor: loading ? 'wait' : 'pointer',
              opacity: otp.length !== 6 ? 0.4 : 1,
              boxShadow: '0 8px 28px -10px rgba(201,160,92,0.7)',
            }}
          >
            {loading ? 'Verifying...' : 'Verify code'}
          </button>
          <button
            onClick={() => { setSent(false); setOtp('') }}
            style={{ background: 'none', border: 'none', color: C.muted, fontSize: '13px', cursor: 'pointer', marginTop: '1rem', display: 'block', width: '100%' }}
          >
            Use a different email
          </button>
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
              background: C.card,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '100px',
              fontSize: '15px',
              color: C.text,
              marginBottom: '12px',
              outline: 'none',
            }}
          />
          <button
            onClick={sendMagicLink}
            disabled={loading || !email.includes('@')}
            style={{
              width: '100%',
              padding: '14px',
              background: C.gold,
              border: 'none',
              borderRadius: '100px',
              fontSize: '15px',
              fontWeight: '600',
              color: '#000',
              cursor: loading ? 'wait' : 'pointer',
              opacity: !email.includes('@') ? 0.4 : 1,
              boxShadow: '0 8px 28px -10px rgba(201,160,92,0.7)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Sending...' : 'Send code'}
          </button>
        </div>
      )}

      {error && (
        <div style={{
          marginTop: '1rem',
          padding: '12px 20px',
          background: 'rgba(229,103,95,0.1)',
          border: '1px solid rgba(229,103,95,0.3)',
          borderRadius: '100px',
          fontSize: '13px',
          color: '#E5675F',
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
          color: C.muted,
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        Back to home
      </button>
    </div>
  )
}
