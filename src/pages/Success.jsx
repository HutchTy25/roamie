import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Success() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')

  async function verifyPayment() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      let userId = session?.user?.id
      if (!userId) {
        const { data: { session: refreshed } } = await supabase.auth.refreshSession()
        userId = refreshed?.user?.id
      }
      const res = await fetch('https://roamie-61ib.onrender.com/api/verify-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ sessionId, userId })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('roamie_paid', 'true')
        const { data: profile } = await supabase
          .from('profiles')
          .select('home_city')
          .eq('id', userId)
          .single()
        const dest = (!profile?.home_city || profile.home_city === 'skip') ? '/onboarding' : '/dashboard'
        navigate(dest, { state: { proUpgrade: true } })
      } else {
        navigate('/')
      }
    } catch {
      navigate('/')
    }
  }

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    verifyPayment()
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1A1B26',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          border: '3px solid rgba(124,106,239,0.2)',
          borderTopColor: '#7C6AEF',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <div style={{ color: '#8B8FA3' }}>Verifying payment...</div>
      </div>
    </div>
  )
}