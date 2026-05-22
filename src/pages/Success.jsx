import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Success() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [verified, setVerified] = useState(false)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId) { navigate('/'); return }
    verifyPayment()
  }, [])

  async function restoreFromSupabase() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) { navigate('/quiz'); return }

      const { data: trip } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!trip) { navigate('/quiz', { state: { message: "Welcome to Pro! Let's plan your first trip 🎉" } }); return }

      const lastData = {
        p1: { city: trip.p1_city, currency: trip.p1_currency, maxSpend: trip.p1_budget },
        p2: { city: trip.p2_city, currency: trip.p2_currency, maxSpend: trip.p2_budget },
        vibes: trip.vibes,
        dates: { from: trip.dates_from, to: trip.dates_to },
        routing: trip.routing,
        accommodation: trip.accommodation,
        region: trip.region,
      }

      localStorage.setItem('roamie_last_data', JSON.stringify(lastData))
      localStorage.setItem('roamie_last_result', JSON.stringify({
        destinations: trip.destinations,
        stretch_goal: trip.stretch_goal,
      }))

      navigate('/results', { state: { data: lastData } })
    } catch (e) {
      console.error('Restore error:', e)
      navigate('/quiz')
    }
  }

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
        headers: { 'Content-Type': 'application/json' },
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
        if (!profile?.home_city || profile.home_city === 'skip') {
          setNeedsOnboarding(true)
        }
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
      background: '#1A1B26',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:0.3} 50%{opacity:0.8} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes checkPop { 0%{transform:scale(0)} 50%{transform:scale(1.2)} 100%{transform:scale(1)} }
        @keyframes ringExpand { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(2);opacity:0} }
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
        top: '-20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '400px',
        background: 'radial-gradient(ellipse, rgba(34,211,238,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {verified ? (
        <>
          {/* Success check */}
          <div style={{ 
            position: 'relative',
            marginBottom: '1.5rem',
          }}>
            {/* Expanding rings */}
            <div style={{
              position: 'absolute',
              inset: '-20px',
              borderRadius: '50%',
              border: '2px solid rgba(34,211,238,0.3)',
              animation: 'ringExpand 2s ease-out infinite',
            }} />
            <div style={{
              position: 'absolute',
              inset: '-20px',
              borderRadius: '50%',
              border: '2px solid rgba(34,211,238,0.3)',
              animation: 'ringExpand 2s ease-out infinite 0.5s',
            }} />
            
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #22D3EE, #7C6AEF)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'checkPop 0.5s ease-out forwards',
              boxShadow: '0 0 40px rgba(34,211,238,0.5)',
            }}>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path d="M12 20L18 26L28 14" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          <div style={{ 
            fontFamily: "'Geist', sans-serif", 
            fontSize: '2rem', 
            fontWeight: '600',
            marginBottom: '0.5rem',
            color: '#E8E8ED',
          }}>
            {"You're now on Roamie Pro"}
          </div>
          <div style={{
            fontSize: '15px',
            color: '#8B8FA3',
            marginBottom: '2rem',
            maxWidth: '320px',
            lineHeight: '1.6'
          }}>
            Unlimited searches, Partner Sync, and your full Orbit galaxy are now unlocked.
          </div>
          {restoring ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '3px solid rgba(124,106,239,0.2)',
                borderTopColor: '#7C6AEF',
                animation: 'spin 1s linear infinite',
              }} />
              <div style={{ color: '#8B8FA3', fontSize: '15px' }}>
                Your payment was successful! Restoring your trip...
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                if (needsOnboarding) {
                  navigate('/onboarding')
                  return
                }
                const lastData = localStorage.getItem('roamie_last_data')
                if (lastData) {
                  navigate('/results', { state: { data: JSON.parse(lastData) } })
                } else {
                  setRestoring(true)
                  restoreFromSupabase()
                }
              }}
              style={{
                background: 'linear-gradient(135deg, #22D3EE, #7C6AEF)',
                border: 'none',
                borderRadius: '100px',
                padding: '16px 40px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 0 30px rgba(34,211,238,0.4)',
                transition: 'all 0.2s',
              }}
            >
              See my results
            </button>
          )}
        </>
      ) : (
        <div style={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
        }}>
          {/* Loading spinner */}
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
      )}
    </div>
  )
}