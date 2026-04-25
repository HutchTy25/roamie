import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const accent = '#FF6B35'

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
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.08) 0%, transparent 70%)',
      textAlign: 'center',
    }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        Welcome to Roamie
      </div>
      <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '300px', lineHeight: '1.6' }}>
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
          background: 'white',
          border: 'none',
          borderRadius: '100px',
          padding: '14px 28px',
          fontSize: '15px',
          fontWeight: '600',
          color: '#1a1a1a',
          cursor: loading ? 'wait' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'opacity 0.2s',
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
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
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or</div>
        <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Magic Link */}
      {sent ? (
        <div style={{
          background: 'rgba(255,107,53,0.1)',
          border: '1px solid rgba(255,107,53,0.25)',
          borderRadius: 'var(--radius)',
          padding: '1.5rem',
          maxWidth: '320px',
          width: '100%',
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>✉️</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', marginBottom: '6px' }}>
            Check your email
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.
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
            style={{ marginBottom: '10px' }}
          />
          {error && (
            <div style={{ fontSize: '13px', color: '#ff6b6b', marginBottom: '10px' }}>
              {error}
            </div>
          )}
          <button
            onClick={sendMagicLink}
            disabled={loading || !email.includes('@')}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(255,107,53,0.15)',
              border: '1px solid rgba(255,107,53,0.3)',
              borderRadius: '100px',
              color: accent,
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'wait' : 'pointer',
              opacity: !email.includes('@') ? 0.4 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Sending...' : 'Send magic link ✦'}
          </button>
        </div>
      )}

      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '2rem',
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        Continue without signing in
      </button>
    </div>
  )
}