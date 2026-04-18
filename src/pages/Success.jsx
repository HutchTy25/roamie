import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function Success() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [verified, setVerified] = useState(false)
  const sessionId = searchParams.get('session_id')
  const accent = '#FF6B35'

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    verifyPayment()
  }, [])

  async function verifyPayment() {
    try {
      const res = await fetch('https://roamie-61ib.onrender.com/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('roamie_paid', 'true')
        setVerified(true)
      } else {
        navigate('/')
      }
    } catch (e) {
      navigate('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.08) 0%, transparent 70%)',
    }}>
      {verified ? (
        <>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✦</div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', marginBottom: '0.5rem' }}>
            You're in.
          </div>
          <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '320px', lineHeight: '1.6' }}>
            Your full breakdown is unlocked. Head back to your results to see everything.
          </div>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: accent,
              border: 'none',
              borderRadius: '100px',
              padding: '14px 36px',
              color: '#0a0a0a',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            See my results
          </button>
        </>
      ) : (
        <div style={{ color: 'var(--text-secondary)' }}>Verifying payment...</div>
      )}
    </div>
  )
}