import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
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
      options: {
        redirectTo: `${window.location.origin}/`
      }
    })
    if (error) {
      console.error('Login error:', error)
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
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', marginBottom: '0.5rem' }}>
        Welcome to Roamie
      </div>
      <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '2.5rem', maxWidth: '300px', lineHeight: '1.6' }}>
        Sign in to save your trips and sync with your partner
      </div>

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
        }}
      >
        <img src="https://www.google.com/favicon.ico" width="18" height="18" alt="Google" />
        {loading ? 'Redirecting...' : 'Continue with Google'}
      </button>

      <button
        onClick={() => navigate('/')}
        style={{
          marginTop: '1.5rem',
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