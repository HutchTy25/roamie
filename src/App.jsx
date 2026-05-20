import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { supabase } from './supabase'
import Home from './pages/Home'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import Success from './pages/Success'
import Gate from './pages/Gate'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Connect from './pages/Connect'
import Onboarding from './pages/Onboarding'
import VisitResults from './pages/VisitResults'
import Orbit from './pages/Orbit'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

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
      .select('home_city, display_name')
      .eq('id', userId)
      .single()
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
      <Routes>
      <Route path="/" element={<Home session={session} />} />
      <Route path="/quiz" element={<Quiz session={session} />} />
      <Route path="/results" element={<Results />} />
      <Route path="/success" element={<Success />} />
      <Route path="/gate" element={<Gate />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard session={session} />} />
      <Route path="/connect" element={<Connect session={session} />} />
      <Route path="/onboarding" element={<Onboarding session={session} onComplete={() => fetchProfile(session.user.id)} />} />
      <Route path="/visit-results" element={<VisitResults />} />
      <Route path="/orbit" element={<Orbit session={session} />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
    </Routes>
    </>
  )
}