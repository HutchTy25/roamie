import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

export default function App() {
  const [session, setSession] = useState(undefined)
const [profile, setProfile] = useState(undefined)

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

async function fetchProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('home_city, display_name')
    .eq('id', userId)
    .single()
  setProfile(data || null)
}

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined || (session && profile === undefined)) return null
const needsOnboarding = session && profile !== null && !profile?.home_city

  return (
    <Routes>
      <Route path="/" element={<Home session={session} />} />
      <Route path="/quiz" element={<Quiz session={session} />} />
      <Route path="/results" element={<Results />} />
      <Route path="/success" element={<Success />} />
      <Route path="/gate" element={<Gate />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard session={session} />} />
      <Route path="/connect" element={<Connect session={session} />} />
      <Route path="/onboarding" element={<Onboarding session={session} />} />
      <Route path="/visit-results" element={<VisitResults />} />
    </Routes>
  )
}