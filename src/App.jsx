import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { supabase } from './supabase'
import Home from './pages/Home'

// Lazy-load non-landing routes so heavy, route-specific deps stay out of the
// initial bundle. Home is kept eager so the landing page paints immediately
// without a Suspense fallback flash.
const Success = lazy(() => import('./pages/Success'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Connect = lazy(() => import('./pages/Connect'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const TripDetail = lazy(() => import('./pages/TripDetail'))
const ReservationDetail = lazy(() => import('./pages/ReservationDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))

export default function App() {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(undefined)
  const [showUpdate, setShowUpdate] = useState(false)

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() { setShowUpdate(true) },
  })

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('home_city, display_name, is_pro, couple_id')
      .eq('id', userId)
      .single()
    if (data) {
      if (data.is_pro) {
        localStorage.setItem('roamie_paid', 'true')
      } else if (data.couple_id) {
        const { data: couple } = await supabase
          .from('couples')
          .select('is_pro')
          .eq('id', data.couple_id)
          .single()
        if (couple?.is_pro) localStorage.setItem('roamie_paid', 'true')
      }
    }
    setProfile(error ? null : (data || null))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else setProfile(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined || (session && profile === undefined)) return null
  const needsOnboarding = session && profile !== null && !profile?.home_city

  return (
    <>
      {showUpdate && (
        <div style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: '#1E2030',
          border: '1px solid rgba(124,106,239,0.4)',
          borderRadius: '16px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontSize: '13px', color: '#E8E8ED' }}>New version available</span>
          <button
            onClick={() => { setShowUpdate(false); updateServiceWorker(true) }}
            style={{
              background: 'linear-gradient(135deg, #22D3EE, #7C6AEF)',
              border: 'none',
              borderRadius: '100px',
              padding: '7px 16px',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Update
          </button>
          <button
            onClick={() => setShowUpdate(false)}
            style={{ background: 'none', border: 'none', color: '#8B8FA3', fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}
      <Suspense fallback={null}>
        <Routes>
      <Route path="/" element={<Home session={session} />} />
      <Route path="/success" element={<Success />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard session={session} />} />
      <Route path="/trip/:id" element={<TripDetail session={session} />} />
      <Route path="/trip/:tripId/reservation/:bookingId" element={<ReservationDetail session={session} />} />
      <Route path="/profile" element={<Profile session={session} />} />
      <Route path="/connect" element={<Connect session={session} />} />
      <Route path="/onboarding" element={<Onboarding session={session} onComplete={() => fetchProfile(session.user.id)} />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
        </Routes>
      </Suspense>
    </>
  )
}