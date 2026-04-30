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
import VisitResults from './pages/VisitResults'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null

  return (
    <Routes>
      <Route path="/" element={<Home session={session} />} />
      <Route path="/quiz" element={<Quiz />} />
      <Route path="/results" element={<Results />} />
      <Route path="/success" element={<Success />} />
      <Route path="/gate" element={<Gate />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard session={session} />} />
      <Route path="/connect" element={<Connect session={session} />} />
      <Route path="/visit-results" element={<VisitResults />} />
    </Routes>
  )
}